import { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, RefreshControl, ActivityIndicator, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import {
  ArrowLeftIcon,
  BellOffIcon,
  CheckDoubleIcon,
  ChevronRightIcon,
} from '../../src/components/ui/Icon/icons';

import { useNotifications } from '../../src/hooks/useNotifications';
import { useNotificationPermission } from '../../src/hooks/useNotificationPermission';
import { usePushRegistration } from '../../src/hooks/usePushRegistration';
import {
  NotificationItem as NotificationItemType,
  NotificationListItem,
} from '../../src/types/notification.types';
import { NotificationItem, NOTIFICATION_ROW } from '../../src/components/notification/NotificationItem';
import { NotificationSwipeRow } from '../../src/components/notification/NotificationSwipeRow';
import { NotificationGroupHeader } from '../../src/components/notification/NotificationGroupHeader';
import { EmptyNotifications } from '../../src/components/feedback/EmptyState/EmptyNotifications';
import { ErrorState } from '../../src/components/feedback/ErrorState';
import { Skeleton, SkeletonGroup } from '../../src/components/ui/Skeleton/Skeleton';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { resolveNotificationRoute } from '../../src/utils/deepLink';
import { fontFamily } from '../../src/design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { ThemedStatusBar } from '../../src/theme/ThemedStatusBar';

/**
 * Notifications
 * White / charcoal page, flat list rows with semantic neutral icons, date sections, a compact
 * segmented All / Unread control and a quiet "Mark all read" action that waits for the server.
 * Data, pagination, grouping, swipe actions and deep links come from useNotifications / resolveNotificationRoute.
 */
export default function NotificationsScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isOffline } = useNetworkStatus();
  const { isGranted, isUndetermined, canAskAgain, request } = useNotificationPermission();
  const { register } = usePushRegistration();

  const {
    groupedList,
    stickyHeaderIndices,
    unreadCount,
    activeFilter,
    setActiveFilter,
    isLoading,
    isFetchingNextPage,
    isError,
    isRefreshing,
    hasNextPage,
    fetchNextPage,
    refetch,
    markRead,
    markAllRead,
    isMarkingAllRead,
    deleteNotification,
  } = useNotifications();

  const handleEnablePush = useCallback(async () => {
    if (isUndetermined || canAskAgain) {
      const res = await request();
      if (res === 'granted') {
        await register();
      }
    } else {
      Linking.openSettings().catch(() => {});
    }
  }, [isUndetermined, canAskAgain, request, register]);

  const handleItemPress = useCallback(
    (item: NotificationItemType) => {
      if (!item.is_read) {
        markRead(item.id);
      }
      const targetRoute = resolveNotificationRoute({
        deep_link: item.deep_link ?? undefined,
        type: item.category,
        template_key: item.template_key,
        ...(item.data || {}),
      });
      if (targetRoute && targetRoute !== '/notifications') {
        try {
          router.push(targetRoute as any);
        } catch {
          // Destination unavailable: stay on the feed.
        }
      }
    },
    [markRead, router]
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: NotificationListItem }) => {
      if (item.type === 'header') {
        return <NotificationGroupHeader title={item.title} count={item.count} />;
      }
      return (
        <NotificationSwipeRow item={item.notification} onMarkRead={markRead} onDelete={deleteNotification}>
          <NotificationItem item={item.notification} onPress={handleItemPress} />
        </NotificationSwipeRow>
      );
    },
    [deleteNotification, handleItemPress, markRead]
  );

  const getItemType = useCallback((item: NotificationListItem) => item.type, []);

  const showMarkAll = unreadCount > 0 || isMarkingAllRead;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedStatusBar />

      {/* Header: back, centred title, quiet "Mark all read" (only when there is something unread) */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeftIcon size={22} color={colors.textPrimary} strokeWidth={2} />
        </Pressable>

        <View style={styles.titleContainer} pointerEvents="none">
          <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">
            Notifications
          </Text>
        </View>

        <View style={styles.rightSlot}>
          {showMarkAll ? (
            <Pressable
              style={({ pressed }) => [styles.markAll, pressed && styles.markAllPressed]}
              onPress={markAllRead}
              disabled={isMarkingAllRead}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Mark all notifications as read"
              accessibilityState={{ busy: isMarkingAllRead, disabled: isMarkingAllRead }}
            >
              {isMarkingAllRead ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <CheckDoubleIcon size={16} color={colors.primaryDark} strokeWidth={2} />
              )}
              <Text style={[styles.markAllText, isMarkingAllRead && styles.markAllTextBusy]} maxFontSizeMultiplier={1.2}>
                Mark all read
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Segmented All / Unread control (unread count is live) */}
      <View style={styles.segmentWrap}>
        <View style={styles.segment} accessibilityRole="tablist">
          {(['all', 'unread'] as const).map((key) => {
            const active = activeFilter === key;
            return (
              <Pressable
                key={key}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
                onPress={() => setActiveFilter(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={key === 'all' ? 'All notifications' : `Unread notifications, ${unreadCount}`}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]} maxFontSizeMultiplier={1.2}>
                  {key === 'all' ? 'All' : 'Unread'}
                </Text>
                {key === 'unread' && unreadCount > 0 ? (
                  <View style={[styles.countPill, active && styles.countPillActive]}>
                    <Text style={[styles.countText, active && styles.countTextActive]} maxFontSizeMultiplier={1.2}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Push permission recovery (neutral, not alarming) */}
      {!isGranted && (
        <Pressable
          style={({ pressed }) => [styles.permissionRow, pressed && styles.permissionRowPressed]}
          onPress={handleEnablePush}
          accessibilityRole="button"
          accessibilityLabel="Turn on push notifications"
        >
          <BellOffIcon size={18} color={colors.textSecondary} strokeWidth={1.9} />
          <View style={styles.permissionTextCol}>
            <Text style={styles.permissionTitle} maxFontSizeMultiplier={1.3}>
              Push notifications are off
            </Text>
            <Text style={styles.permissionSubtitle} maxFontSizeMultiplier={1.3}>
              Turn them on to get booking updates and messages.
            </Text>
          </View>
          <ChevronRightIcon size={16} color={colors.textMuted} />
        </Pressable>
      )}

      {isLoading ? (
        <NotificationsSkeleton />
      ) : isError && groupedList.length === 0 ? (
        <ErrorState
          type={isOffline ? 'offline' : 'error'}
          title={isOffline ? "You're offline" : "Couldn't load notifications"}
          subtitle={isOffline ? 'Check your connection and try again.' : 'Something went wrong. Please try again.'}
          onRetry={refetch}
          retryButtonText="Try again"
        />
      ) : (
        <FlashList
          data={groupedList}
          renderItem={renderItem}
          getItemType={getItemType}
          keyExtractor={(item) => item.id}
          stickyHeaderIndices={stickyHeaderIndices}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 16 }}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refetch}
              tintColor={colors.textSecondary}
              colors={[colors.primaryDark]}
            />
          }
          ListEmptyComponent={<EmptyNotifications isFiltered={activeFilter === 'unread'} />}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.textSecondary} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

/** Row-shaped placeholders (same geometry as NotificationItem) so nothing shifts when data arrives. */
function NotificationsSkeleton() {
  const styles = useThemedStyles(createStyles);
  return (
    <SkeletonGroup style={styles.skeletonList} accessibilityLabel="Loading notifications">
      <Skeleton width={64} height={13} borderRadius={4} style={styles.skeletonHeader} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.skeletonRow}>
          <Skeleton width={NOTIFICATION_ROW.icon} height={NOTIFICATION_ROW.icon} borderRadius={NOTIFICATION_ROW.icon / 2} />
          <View style={styles.skeletonText}>
            <Skeleton width="62%" height={14} borderRadius={4} />
            <Skeleton width="92%" height={12} borderRadius={4} style={styles.skeletonLine} />
            <Skeleton width="48%" height={12} borderRadius={4} style={styles.skeletonLine} />
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgCard,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  iconButtonPressed: {
    backgroundColor: colors.bgHover,
  },
  titleContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 17,
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  rightSlot: {
    minWidth: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 2,
  },
  markAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  markAllPressed: {
    backgroundColor: colors.bgHover,
  },
  markAllText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: colors.primaryDark,
  },
  markAllTextBusy: {
    color: colors.textSecondary,
  },
  segmentWrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 6,
  },
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    backgroundColor: colors.bgHover,
  },
  segmentItem: {
    flex: 1,
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 9,
  },
  segmentItemActive: {
    backgroundColor: colors.cardRaised,
  },
  segmentText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 13.5,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    fontFamily: fontFamily.jakarta.semiBold,
    color: colors.textPrimary,
  },
  countPill: {
    minWidth: 20,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  countPillActive: {
    backgroundColor: colors.primaryDark,
  },
  countText: {
    fontFamily: fontFamily.inter.semiBold,
    fontSize: 11,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  countTextActive: {
    color: colors.pureWhite,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 2,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.bgHover,
  },
  permissionRowPressed: {
    opacity: 0.8,
  },
  permissionTextCol: {
    flex: 1,
    minWidth: 0,
  },
  permissionTitle: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13.5,
    color: colors.textPrimary,
  },
  permissionSubtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textSecondary,
    marginTop: 1,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonList: {
    paddingTop: 18,
  },
  skeletonHeader: {
    marginLeft: 20,
    marginBottom: 10,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: NOTIFICATION_ROW.paddingH,
    paddingVertical: 14,
  },
  skeletonText: {
    flex: 1,
    marginLeft: NOTIFICATION_ROW.gap,
  },
  skeletonLine: {
    marginTop: 8,
  },
});
