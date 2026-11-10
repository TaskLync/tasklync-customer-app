import { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, RefreshControl, ActivityIndicator, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { ArrowLeft, Check, BellOff, ChevronRight } from 'lucide-react-native';

import { useNotifications } from '../../src/hooks/useNotifications';
import { useNotificationPermission } from '../../src/hooks/useNotificationPermission';
import { usePushRegistration } from '../../src/hooks/usePushRegistration';
import {
  NotificationItem as NotificationItemType,
  NotificationListItem,
} from '../../src/types/notification.types';
import { NotificationItem } from '../../src/components/notification/NotificationItem';
import { NotificationSwipeRow } from '../../src/components/notification/NotificationSwipeRow';
import { NotificationGroupHeader } from '../../src/components/notification/NotificationGroupHeader';
import { EmptyNotifications } from '../../src/components/feedback/EmptyState/EmptyNotifications';
import { ErrorState } from '../../src/components/feedback/ErrorState';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { resolveNotificationRoute } from '../../src/utils/deepLink';
import { fontFamily, radius } from '../../src/design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { ThemedStatusBar } from '../../src/theme/ThemedStatusBar';

/**
 * NotificationsScreen
 *
 * Production-grade minimalist notification center:
 * - Clean centered header with ergonomic back button & subtle green "Mark all as read" action
 * - Compact segmented filter pills ("All", "Unread (X)") with clear visual states
 * - Elegant grouping ("Today", "Yesterday", "Earlier") without noisy dividers or badges
 * - High-performance FlashList with swipe actions (Mark read / Delete)
 * - Safe area handling for Android status & navigation bars
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

  // Navigation & Deep Linking Handler
  const handleItemPress = useCallback(
    (item: NotificationItemType) => {
      // 1. Optimistic read mark
      if (!item.is_read) {
        markRead(item.id);
      }

      // 2. Resolve destination path
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
          // Fallback: stay on feed
        }
      }
    },
    [markRead, router]
  );

  const handleFilterChange = useCallback(
    (filter: 'all' | 'unread') => {
      setActiveFilter(filter);
    },
    [setActiveFilter]
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  // FlashList Render Item
  const renderItem = useCallback(
    ({ item }: { item: NotificationListItem }) => {
      if (item.type === 'header') {
        return <NotificationGroupHeader title={item.title} count={item.count} />;
      }

      return (
        <NotificationSwipeRow
          item={item.notification}
          onMarkRead={markRead}
          onDelete={deleteNotification}
        >
          <NotificationItem
            item={item.notification}
            onPress={handleItemPress}
          />
        </NotificationSwipeRow>
      );
    },
    [deleteNotification, handleItemPress, markRead]
  );

  const getItemType = useCallback((item: NotificationListItem) => {
    return item.type;
  }, []);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <ThemedStatusBar />

      {/* Screen Header */}
      <View style={styles.header}>
        {/* Back Button */}
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.4} />
        </Pressable>

        {/* Centered Notifications Title */}
        <View style={styles.titleContainer} pointerEvents="none">
          <Text style={styles.headerTitle} numberOfLines={1}>
            Notifications
          </Text>
        </View>

        {/* Right Action: Mark all as read */}
        <View style={styles.rightActionContainer}>
          {unreadCount > 0 ? (
            <Pressable
              style={({ pressed }) => [
                styles.markAllButton,
                pressed && styles.markAllButtonPressed,
              ]}
              onPress={markAllRead}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Mark all notifications as read"
            >
              <Check size={14} color={colors.primaryDark} strokeWidth={2.4} />
              <Text style={styles.markAllText}>Mark all as read</Text>
            </Pressable>
          ) : (
            <View style={styles.rightActionPlaceholder} />
          )}
        </View>
      </View>

      {/* Filter Tabs (All / Unread) */}
      <View style={styles.filterBar}>
        <Pressable
          style={({ pressed }) => [
            styles.filterPill,
            activeFilter === 'all' ? styles.filterPillActive : styles.filterPillInactive,
            pressed && styles.filterPillPressed,
          ]}
          onPress={() => handleFilterChange('all')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeFilter === 'all' }}
        >
          <Text
            style={[
              styles.filterText,
              activeFilter === 'all' ? styles.filterTextActive : styles.filterTextInactive,
            ]}
          >
            All
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.filterPill,
            activeFilter === 'unread' ? styles.filterPillActive : styles.filterPillInactive,
            pressed && styles.filterPillPressed,
          ]}
          onPress={() => handleFilterChange('unread')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeFilter === 'unread' }}
        >
          <Text
            style={[
              styles.filterText,
              activeFilter === 'unread' ? styles.filterTextActive : styles.filterTextInactive,
            ]}
          >
            {unreadCount > 0 ? `Unread (${unreadCount})` : 'Unread'}
          </Text>
        </Pressable>
      </View>

      {/* Push Permission Recovery Banner */}
      {!isGranted && (
        <Pressable
          style={styles.permissionBanner}
          onPress={handleEnablePush}
          accessibilityRole="button"
          accessibilityLabel="Enable push notifications"
        >
          <View style={styles.permissionIconCircle}>
            <BellOff size={15} color={colors.danger} strokeWidth={2.2} />
          </View>
          <View style={styles.permissionTextCol}>
            <Text style={styles.permissionTitle}>Push notifications are disabled</Text>
            <Text style={styles.permissionSubtitle}>
              Enable to get real-time booking alerts and messages
            </Text>
          </View>
          <ChevronRight size={16} color={colors.textMuted} />
        </Pressable>
      )}

      {/* Main FlashList Feed */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryDark} />
        </View>
      ) : isError && groupedList.length === 0 ? (
        <ErrorState
          type={isOffline ? 'offline' : 'error'}
          title={isOffline ? 'No internet connection' : "Couldn't load notifications"}
          subtitle={
            isOffline
              ? 'Please check your connection and pull to refresh.'
              : 'An unexpected error occurred while fetching your notifications.'
          }
          onRetry={refetch}
          retryButtonText="Retry"
        />
      ) : (
        <FlashList
          data={groupedList}
          renderItem={renderItem}
          getItemType={getItemType}
          keyExtractor={(item) => item.id}
          stickyHeaderIndices={stickyHeaderIndices}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 4,
            paddingBottom: Math.max(insets.bottom, 20) + 16,
          }}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refetch}
              tintColor={colors.primaryDark}
              colors={[colors.primaryDark]}
            />
          }
          ListEmptyComponent={
            !isLoading ? (
              <EmptyNotifications isFiltered={activeFilter === 'unread'} />
            ) : null
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primaryDark} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: palette.white,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray100,
    position: 'relative',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.gray50,
    borderWidth: 1,
    borderColor: palette.gray200,
    zIndex: 2,
  },
  backButtonPressed: {
    backgroundColor: palette.gray100,
    transform: [{ scale: 0.96 }],
  },
  titleContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  headerTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  rightActionContainer: {
    zIndex: 2,
    minWidth: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rightActionPlaceholder: {
    width: 36,
    height: 36,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  markAllButtonPressed: {
    opacity: 0.6,
  },
  markAllText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 12,
    color: colors.primaryDark,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: palette.white,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray100,
    gap: 8,
  },
  filterPill: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: palette.green50,
    borderWidth: 1,
    borderColor: palette.green200,
  },
  filterPillInactive: {
    backgroundColor: palette.gray100,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterPillPressed: {
    opacity: 0.8,
  },
  filterText: {
    fontSize: 13,
    lineHeight: 16,
  },
  filterTextActive: {
    fontFamily: fontFamily.jakarta.semiBold,
    color: colors.primaryDark,
  },
  filterTextInactive: {
    fontFamily: fontFamily.jakarta.medium,
    color: colors.textSecondary,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: palette.red50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.red200,
    gap: 10,
  },
  permissionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.red100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTextCol: {
    flex: 1,
  },
  permissionTitle: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textDangerDark,
  },
  permissionSubtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 11,
    lineHeight: 15,
    color: palette.red700,
    marginTop: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
