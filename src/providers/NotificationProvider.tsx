import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../store/auth.store';
import { useNotificationStore } from '../store/notification.store';
import { pushService } from '../services/notifications/push.service';
import { notificationQueue } from '../services/notifications/notification-queue';
import { resolveNotificationRoute } from '../utils/deepLink';
import { usePushRegistration } from '../hooks/usePushRegistration';
import { useInAppBanner } from '../components/feedback/InAppBannerProvider';
import { notificationApi } from '../services/api/notification.api';
import { chatSoundService } from '../services/audio/chatSound.service';
import { queryClient } from '../config/queryClient';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { showBanner } = useInAppBanner();
  const { register, unregister } = usePushRegistration();

  const authState = useAuthStore((s) => s.authState);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const setPermissionStatus = useNotificationStore((s) => s.setPermissionStatus);
  const setCanAskAgain = useNotificationStore((s) => s.setCanAskAgain);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const incrementUnread = useNotificationStore((s) => s.incrementUnread);

  const foregroundSubRef = useRef<Notifications.EventSubscription | null>(null);
  const responseSubRef = useRef<Notifications.EventSubscription | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isInitializedRef = useRef<boolean>(false);

  // 1. One-time Bootstrap Lifecycle: Channels, Initial Permission Prompt (Android 13+ & iOS), and Cold Start Launch
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    let isMounted = true;

    const bootstrapNotifications = async () => {
      // 1.0 Killed-app cold launch tap: read it FIRST so a permission prompt cannot delay or lose it.
      // The queue holds it until the signed-in tabs shell mounts, then navigates.
      try {
        const response = await pushService.getLastNotificationResponse();
        if (response) {
          const rawData = response.notification?.request?.content?.data || {};
          notificationQueue.enqueue(resolveNotificationRoute(rawData as any), response.notification?.request?.identifier);
        }
      } catch {}

      // 1.1 Pre-register Android notification channels & iOS categories idempotently
      await pushService.registerNotificationChannels().catch(() => {});

      // 1.2 Evaluate permission state: On Android 13+ first launch or iOS, request runtime permission
      try {
        const detail = await pushService.getDetailedPermissionStatus();
        let status = detail.status;

        if (status === 'undetermined') {
          // Native system dialog for Android 13+ POST_NOTIFICATIONS & iOS APNs
          status = await pushService.requestPermission();
          const refreshedDetail = await pushService.getDetailedPermissionStatus();
          if (isMounted) {
            setCanAskAgain(refreshedDetail.canAskAgain);
          }
        } else if (isMounted) {
          setCanAskAgain(detail.canAskAgain);
        }

        if (isMounted) {
          setPermissionStatus(status);
          if (status === 'granted' && useAuthStore.getState().isAuthenticated) {
            register().catch(() => {});
          }
        }
      } catch (err) {
        if (__DEV__) {
          console.warn('[NotificationProvider] Permission bootstrap error:', err);
        }
      }
    };

    bootstrapNotifications();

    return () => {
      isMounted = false;
    };
  }, [setPermissionStatus, setCanAskAgain, register]);

  // 2. Auth State Sync & Push Token Rotation Listener
  useEffect(() => {
    const isAuthed = authState === 'authenticated' || authState === 'AUTHENTICATED';
    if (isAuthed && currentUserId) {
      register().catch(() => {});

      // Initial Unread Count Hydration (Page 1)
      notificationApi
        .getNotifications(null, 1)
        .then((res) => {
          if (res?.meta?.unread_count !== undefined) {
            setUnreadCount(res.meta.unread_count);
            queryClient.setQueryData(['notifications', 'unread-count'], res.meta.unread_count);
          }
        })
        .catch(() => {});
    } else if (authState === 'unauthenticated' || authState === 'UNAUTHENTICATED') {
      unregister().catch(() => {});
    }

    // Subscribe to push token rotations
    const tokenSub = pushService.addPushTokenListener(async (tokenData) => {
      if (tokenData?.data && useAuthStore.getState().isAuthenticated) {
        await notificationApi.registerPushToken(String(tokenData.data)).catch(() => {});
      }
    });

    return () => {
      tokenSub.remove();
    };
  }, [authState, currentUserId, register, unregister, setUnreadCount]);

  // 3. Foreground Notification & Background Response Listeners
  useEffect(() => {
    // 3.1 Foreground Listener (App Open) -> Show In-App Banner & Increment Unread Badge
    foregroundSubRef.current = pushService.addForegroundListener((notification) => {
      try {
        const content = notification?.request?.content;
        if (!content) return;
        const data = (content.data || {}) as Record<string, any>;
        const title = content.title || 'Tasklync Update';
        const body = content.body || '';
        const category = String(data.type || data.category || 'default');

        incrementUnread();

        // Reactively invalidate notifications queries
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });

        // Play receive sound if incoming event is a chat message
        if (category.includes('chat') || category.includes('message')) {
          const senderId = data.sender_id || data.senderId ? String(data.sender_id || data.senderId) : undefined;
          const messageId = String(data.message_id || data.messageId || data.id || notification.request.identifier || '');
          chatSoundService
            .playReceiveSound(
              messageId,
              senderId,
              currentUserId
            )
            .catch(() => {});
        }

        showBanner({
          id: notification.request.identifier || `notif_${Date.now()}`,
          title,
          body,
          category,
          deepLink: data.deep_link || data.deepLink ? String(data.deep_link || data.deepLink) : undefined,
          data,
        });
      } catch (e) {
        if (__DEV__) {
          console.warn('[NotificationProvider] Error in foreground listener:', e);
        }
      }
    });

    // 3.2 Background/Tray Tap Listener -> Direct Immediate Navigation
    responseSubRef.current = pushService.addResponseListener((response) => {
      try {
        const rawData = response?.notification?.request?.content?.data || {};
        const targetPath = resolveNotificationRoute(rawData as any);
        // Goes through the queue: navigates now if the signed-in shell is mounted, otherwise waits for it.
        if (targetPath) notificationQueue.enqueue(targetPath, response?.notification?.request?.identifier);
      } catch (e) {
        if (__DEV__) {
          console.warn('[NotificationProvider] Error handling notification response:', e);
        }
      }
    });

    return () => {
      if (foregroundSubRef.current) {
        foregroundSubRef.current.remove();
        foregroundSubRef.current = null;
      }
      if (responseSubRef.current) {
        responseSubRef.current.remove();
        responseSubRef.current = null;
      }
    };
  }, [router, showBanner, incrementUnread, currentUserId]);

  // 4. AppState Foreground Listener (Self-healing & Permission Revocation / Grant Detection)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App returned to active foreground: re-sync permission state
        pushService
          .getDetailedPermissionStatus()
          .then((detail) => {
            setPermissionStatus(detail.status);
            setCanAskAgain(detail.canAskAgain);

            if (detail.status === 'granted' && useAuthStore.getState().isAuthenticated) {
              register().catch(() => {});
            }
          })
          .catch(() => {});

        // Refresh unread counter & feed if authenticated
        if (useAuthStore.getState().isAuthenticated) {
          queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
          queryClient.invalidateQueries({ queryKey: ['notifications'] });

          notificationApi
            .getNotifications(null, 1)
            .then((res) => {
              if (res?.meta?.unread_count !== undefined) {
                setUnreadCount(res.meta.unread_count);
                queryClient.setQueryData(['notifications', 'unread-count'], res.meta.unread_count);
              }
            })
            .catch(() => {});
        }
      }
      appStateRef.current = nextAppState;
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [register, setPermissionStatus, setCanAskAgain, setUnreadCount]);

  return <>{children}</>;
}
