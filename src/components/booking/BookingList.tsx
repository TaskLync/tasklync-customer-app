import React, { useCallback, useRef } from 'react';
import { StyleSheet, View, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { BookingDetails } from '../../types/booking.types';
import { BookingCard } from './BookingCard';
import { BookingCardSkeleton } from './BookingCardSkeleton';
import { SkeletonGroup } from '../ui/Skeleton/Skeleton';
import { EmptyBookingsActive } from '../feedback/EmptyState/EmptyBookingsActive';
import { EmptyBookingsPast } from '../feedback/EmptyState/EmptyBookingsPast';
import { EmptyBookingsCancelled } from '../feedback/EmptyState/EmptyBookingsCancelled';
import { ErrorState } from '../feedback/ErrorState';
import { TabType } from '../../hooks/useBookingsList';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface BookingListProps {
  bookings: BookingDetails[];
  isLoading: boolean;
  /** Pull-to-refresh / background refetch: keep the list visible, show only the spinner. */
  isRefreshing?: boolean;
  isError?: boolean;
  activeTab: TabType;
  onRefresh: () => void;
}

export function BookingList({
  bookings,
  isLoading,
  isRefreshing = false,
  isError = false,
  activeTab,
  onRefresh,
}: BookingListProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const isFirstMount = useRef(true);

  // After first render of items, it's no longer first mount for stagger
  if (!isLoading && bookings.length > 0 && isFirstMount.current) {
    setTimeout(() => {
      isFirstMount.current = false;
    }, 500);
  }

  const renderItem = useCallback(({ item, index }: ListRenderItemInfo<BookingDetails>) => {
    // Entrance stagger applied once, opacity fade only, 30ms apart, capped at 6
    const delay = isFirstMount.current && index < 6 ? index * 30 : 0;
    
    return (
      <Animated.View 
        entering={FadeIn.delay(delay).duration(200)} 
        exiting={FadeOut.duration(150)}
      >
        <BookingCard booking={item} />
      </Animated.View>
    );
  }, []);

  const renderEmptyComponent = () => {
    if (isLoading) {
      return (
        <SkeletonGroup accessibilityLabel="Loading bookings">
          <BookingCardSkeleton />
          <BookingCardSkeleton />
          <BookingCardSkeleton />
        </SkeletonGroup>
      );
    }

    if (isError) {
      return (
        <ErrorState
          type="error"
          title="Couldn't load bookings"
          subtitle="Please check your internet connection or try again."
          onRetry={onRefresh}
          retryButtonText="Retry"
          style={styles.errorStateContainer}
        />
      );
    }

    if (activeTab === 'ACTIVE') return <EmptyBookingsActive />;
    if (activeTab === 'PAST') return <EmptyBookingsPast />;
    return <EmptyBookingsCancelled />;
  };

  return (
    <View style={styles.container}>
      <FlashList
        data={isLoading ? [] : bookings}
        renderItem={renderItem}
        keyExtractor={(item: BookingDetails) => item.id}
        estimatedItemSize={210}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 96 },
        ]}
        ListEmptyComponent={renderEmptyComponent}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primaryDark}
            colors={[colors.primaryDark]}
          />
        }
      />
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  errorStateContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
});
