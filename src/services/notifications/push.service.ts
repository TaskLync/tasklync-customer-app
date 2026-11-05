import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { createMMKV } from 'react-native-mmkv';
import {
  NotificationPermissionStatus,
  DetailedNotificationPermission,
} from '../../types/notification.types';
import { setupNotificationChannelsAndCategories } from './notification-categories';
import { chimeHandlesChatPush } from './chatPush';

const storage = createMMKV();
const HAS_REQUESTED_NOTIFICATIONS_KEY = 'has_requested_notification_permission';

/**
 * Configure foreground notification presentation handler safely.
 * Provides backwards and forwards compatibility across Expo SDKs.
 */
try {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => ({
      shouldShowBanner: true,
      shouldShowList: true,
      // A foreground chat push with a message id gets the in-app chime instead (see chatPush.ts): one sound, not two
      shouldPlaySound: !chimeHandlesChatPush(
        notification?.request?.content?.data as Record<string, unknown> | undefined
      ),
      shouldSetBadge: true,
      shouldShowAlert: true,
    }),
    handleSuccess: () => {},
    handleError: (notificationId, error) => {
      if (__DEV__) {
        console.warn(`[pushService] Notification handling error (${notificationId}):`, error);
      }
    },
  });
} catch (e) {
  if (__DEV__) {
    console.warn('[pushService] setNotificationHandler initialization warning:', e);
  }
}

// Concurrency mutex lock for in-flight permission requests
let inFlightPermissionRequest: Promise<NotificationPermissionStatus> | null = null;

export const pushService = {
  /**
   * Retrieves comprehensive permission details normalized across Android 13+ (POST_NOTIFICATIONS) and iOS APNs.
   * Resolves the Android 13+ quirk where getPermissionsAsync() returns status='denied' with canAskAgain=true
   * before the system prompt has ever been presented.
   */
  getDetailedPermissionStatus: async (): Promise<DetailedNotificationPermission> => {
    try {
      if (Platform.OS === 'web') {
        return {
          status: 'granted',
          granted: true,
          canAskAgain: false,
          expires: 'never',
        };
      }

      const settings = await Notifications.getPermissionsAsync();
      const isGranted = Boolean(settings.granted || settings.status === 'granted');
      const canAskAgain = Boolean(settings.canAskAgain);
      const hasAskedBefore = Boolean(storage.getBoolean(HAS_REQUESTED_NOTIFICATIONS_KEY));

      let status: NotificationPermissionStatus = 'denied';

      if (isGranted) {
        status = 'granted';
      } else if (settings.status === 'undetermined' || (!hasAskedBefore && canAskAgain)) {
        // On Android 13+, getPermissionsAsync() maps ungranted runtime permissions to DENIED
        // because areNotificationsEnabled() is false. If the app has never requested permission
        // and canAskAgain is true, we normalize status to 'undetermined' so the first-launch prompt triggers.
        status = 'undetermined';
      } else {
        status = 'denied';
      }

      return {
        status,
        granted: isGranted,
        canAskAgain,
        expires: settings.expires || 'never',
      };
    } catch (err) {
      if (__DEV__) {
        console.warn('[pushService] getDetailedPermissionStatus error:', err);
      }
      return {
        status: 'undetermined',
        granted: false,
        canAskAgain: true,
        expires: 'never',
      };
    }
  },

  /**
   * Reads the current OS notification permission status without prompting.
   */
  getPermissionStatus: async (): Promise<NotificationPermissionStatus> => {
    const details = await pushService.getDetailedPermissionStatus();
    return details.status;
  },

  /**
   * Prompts the user with the native OS notification permission dialog (Android 13+ POST_NOTIFICATIONS & iOS APNs).
   * Thread-safe, idempotent, and protected against concurrent race conditions.
   */
  requestPermission: async (): Promise<NotificationPermissionStatus> => {
    if (Platform.OS === 'web') return 'granted';

    // If a permission request is already in-flight, await and return the existing promise
    if (inFlightPermissionRequest) {
      return inFlightPermissionRequest;
    }

    inFlightPermissionRequest = (async () => {
      try {
        // 1. Ensure notification channels are registered on Android before requesting permission
        if (Platform.OS === 'android') {
          await setupNotificationChannelsAndCategories().catch(() => {});
        }

        // 2. Mark that initial permission prompt has been invoked
        storage.set(HAS_REQUESTED_NOTIFICATIONS_KEY, true);

        // 3. Request native runtime permission (POST_NOTIFICATIONS on Android 13+ / APNs on iOS)
        const settings = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });

        const isGranted = Boolean(settings.granted || settings.status === 'granted');
        return isGranted ? 'granted' : 'denied';
      } catch (err) {
        if (__DEV__) {
          console.warn('[pushService] requestPermission error:', err);
        }
        return 'denied';
      } finally {
        inFlightPermissionRequest = null;
      }
    })();

    return inFlightPermissionRequest;
  },

  /**
   * Universal token retrieval: Safely retrieves native FCM/APNs device token or Expo push token.
   * Checks Device.isDevice and wraps native calls with try/catch to prevent simulator/hardware fatal exceptions.
   */
  getPushToken: async (): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') return null;

      // 1. Guard against Simulator/Emulator native FCM bridge fatal crashes
      if (!Device.isDevice) {
        if (__DEV__) {
          console.log('[pushService] Running in simulator/emulator - physical device recommended for native push tokens');
        }
      }

      // 2. Try Native Device Push Token (FCM on Android / APNs on iOS)
      try {
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        if (deviceToken?.data) {
          return String(deviceToken.data);
        }
      } catch (nativeErr) {
        if (__DEV__) {
          console.log('[pushService] Native getDevicePushTokenAsync fallback:', nativeErr);
        }
      }

      // 3. Fallback to Expo Push Token
      try {
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ||
          Constants?.easConfig?.projectId ||
          process.env.EAS_PROJECT_ID;

        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );

        return tokenData?.data ? String(tokenData.data) : null;
      } catch (expoTokenErr) {
        if (__DEV__) {
          console.warn('[pushService] getExpoPushTokenAsync fallback:', expoTokenErr);
        }
        return null;
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('[pushService] Failed to retrieve push token:', error);
      }
      return null;
    }
  },

  /**
   * Registers Android notification channels and iOS categories safely.
   */
  registerNotificationChannels: async (): Promise<void> => {
    try {
      await setupNotificationChannelsAndCategories();
    } catch (error) {
      if (__DEV__) {
        console.warn('[pushService] Failed to setup notification channels:', error);
      }
    }
  },

  /**
   * Subscribes to foreground notification reception.
   */
  addForegroundListener: (
    callback: (notification: Notifications.Notification) => void
  ): Notifications.EventSubscription => {
    return Notifications.addNotificationReceivedListener((notif) => {
      try {
        callback(notif);
      } catch (err) {
        if (__DEV__) {
          console.warn('[pushService] Foreground listener callback error:', err);
        }
      }
    });
  },

  /**
   * Subscribes to notification response (user tapped notification in tray).
   */
  addResponseListener: (
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.EventSubscription => {
    return Notifications.addNotificationResponseReceivedListener((res) => {
      try {
        callback(res);
      } catch (err) {
        if (__DEV__) {
          console.warn('[pushService] Response listener callback error:', err);
        }
      }
    });
  },

  /**
   * Checks for a cold-start notification response when the app was launched from a killed state.
   */
  getLastNotificationResponse: async (): Promise<Notifications.NotificationResponse | null> => {
    try {
      return await Notifications.getLastNotificationResponseAsync();
    } catch {
      return null;
    }
  },

  /**
   * Sets or clears the app icon badge count safely.
   */
  setBadgeCount: async (count: number): Promise<void> => {
    try {
      await Notifications.setBadgeCountAsync(Math.max(0, count));
    } catch {}
  },

  /**
   * Subscribes to device push token changes (rotations).
   */
  addPushTokenListener: (
    callback: (token: Notifications.DevicePushToken | Notifications.ExpoPushToken | any) => void
  ): Notifications.EventSubscription => {
    return Notifications.addPushTokenListener((token) => {
      try {
        callback(token);
      } catch (err) {
        if (__DEV__) {
          console.warn('[pushService] Push token listener callback error:', err);
        }
      }
    });
  },
};
