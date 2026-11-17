import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BookingsHeader } from '../../src/components/booking/BookingsHeader';
import { BookingList } from '../../src/components/booking/BookingList';
import { FilterChips } from '../../src/components/booking/FilterChips';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { useBookingsList, TabType } from '../../src/hooks/useBookingsList';
import { useCustomRequestsList } from '../../src/hooks/custom-requests/useCustomRequestsList';
import { CustomRequestCard } from '../../src/components/custom-requests/CustomRequestCard';
import { EmptyState } from '../../src/components/feedback/EmptyState';
import { ErrorState } from '../../src/components/feedback/ErrorState';
import { Skeleton, SkeletonGroup, SkeletonText } from '../../src/components/ui/Skeleton';
import { CustomServiceRequest } from '../../src/types/customRequest.types';
import {
  RequestFilter,
  countByRequestFilter,
  matchesRequestFilter,
} from '../../src/utils/customRequestFilters';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';

type MainSectionType = 'BOOKINGS' | 'CUSTOM_REQUESTS';

const BOOKING_TABS: { value: TabType; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAST', label: 'Past' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const REQUEST_EMPTY: Record<RequestFilter, { title: string; body: string }> = {
  ALL: { title: 'No custom quotes yet', body: 'Ask a professional for a custom quote and it will appear here.' },
  QUOTE_READY: { title: 'No quotes ready', body: 'When a professional sends you a quote, you’ll find it here.' },
  ACTIVE: { title: 'Nothing in review', body: 'Requests that are waiting on a professional appear here.' },
  RESOLVED: { title: 'No past requests', body: 'Booked, declined and expired requests appear here.' },
};

/** Mirrors CustomRequestCard: category + badge, title, provider, divider, date + action. */
function RequestCardSkeleton({ styles }: { styles: ReturnType<typeof createStyles> }) {
  return (
    <SkeletonGroup style={styles.skeletonCard} accessibilityLabel="Loading request">
      <View style={styles.skeletonRow}>
        <SkeletonText fontSize={12.5} lineHeight={17} width={90} />
        <Skeleton width={84} height={24} borderRadius={8} />
      </View>
      <SkeletonText fontSize={16} lineHeight={22} width="78%" style={styles.skeletonGap} />
      <SkeletonText fontSize={13.5} lineHeight={18} width="52%" style={styles.skeletonGapSm} />
      <View style={[styles.skeletonRow, styles.skeletonFooter]}>
        <SkeletonText fontSize={12.5} lineHeight={17} width={64} />
        <SkeletonText fontSize={13} lineHeight={17} width={80} />
      </View>
    </SkeletonGroup>
  );
}

export default function BookingsScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const [mainSection, setMainSection] = useState<MainSectionType>('BOOKINGS');
  const [activeTab, setActiveTab] = useState<TabType>('ACTIVE');
  const [requestFilter, setRequestFilter] = useState<RequestFilter>('ALL');

  const { bookings, isLoading, isRefreshing, isError, refetch } = useBookingsList(activeTab);
  const {
    requests,
    isLoading: isRequestsLoading,
    isError: isRequestsError,
    isRefetching: isRequestsRefetching,
    refetch: refetchRequests,
  } = useCustomRequestsList('ALL');

  // Refresh both lists on tab focus (unchanged).
  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchRequests();
    }, [refetch, refetchRequests])
  );

  const counts = useMemo(() => countByRequestFilter(requests), [requests]);
  const filteredRequests = useMemo(
    () => requests.filter((r) => matchesRequestFilter(r.status, requestFilter)),
    [requests, requestFilter]
  );

  const renderRequest = useCallback(({ item }: { item: CustomServiceRequest }) => <CustomRequestCard request={item} />, []);

  const renderRequestsEmpty = () => {
    if (isRequestsLoading) {
      return (
        <View>
          {[0, 1, 2].map((i) => (
            <RequestCardSkeleton key={i} styles={styles} />
          ))}
        </View>
      );
    }
    if (isRequestsError) {
      return (
        <ErrorState
          type="error"
          title="Couldn’t load your quotes"
          subtitle="Check your connection and try again."
          onRetry={() => void refetchRequests()}
          retryButtonText="Try again"
          style={styles.stateBox}
        />
      );
    }
    const copy = REQUEST_EMPTY[requestFilter];
    return (
      <View style={styles.stateBox}>
        <EmptyState
          type="no-data"
          title={copy.title}
          description={copy.body}
          actionVariant="neutral"
          {...(requestFilter === 'ALL'
            ? { actionLabel: 'Find professionals', onAction: () => router.push('/(tabs)/explore' as any) }
            : { actionLabel: 'View all', onAction: () => setRequestFilter('ALL') })}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <BookingsHeader />

      {/* Controls sit on the white header surface; content scrolls on the soft grey canvas below. */}
      <View style={styles.controls}>
        <View style={styles.segmentWrap}>
          <SegmentedControl
            value={mainSection}
            onChange={setMainSection}
            options={[
              { value: 'BOOKINGS', label: 'Confirmed Bookings' },
              { value: 'CUSTOM_REQUESTS', label: 'Custom Quotes', badge: counts.QUOTE_READY },
            ]}
          />
        </View>

        {mainSection === 'BOOKINGS' ? (
          <FilterChips value={activeTab} onChange={setActiveTab} options={BOOKING_TABS} />
        ) : (
          <FilterChips
            value={requestFilter}
            onChange={setRequestFilter}
            options={[
              { value: 'ALL', label: 'All', count: counts.ALL },
              { value: 'QUOTE_READY', label: 'Quotes Ready', count: counts.QUOTE_READY },
              { value: 'ACTIVE', label: 'In Review', count: counts.ACTIVE },
              { value: 'RESOLVED', label: 'Past', count: counts.RESOLVED },
            ]}
          />
        )}
      </View>

      {/* Entering fade only: an exiting fade kept the old list on screen during the swap and
          produced the white flash + layout jump. */}
      {mainSection === 'BOOKINGS' ? (
        <Animated.View key="bookings" entering={FadeIn.duration(160)} style={styles.flex}>
          <BookingList
            bookings={bookings}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            isError={isError}
            activeTab={activeTab}
            onRefresh={refetch}
          />
        </Animated.View>
      ) : (
        <Animated.View key="requests" entering={FadeIn.duration(160)} style={[styles.flex, styles.canvas]}>
          <FlatList
            data={isRequestsLoading || isRequestsError ? [] : filteredRequests}
            keyExtractor={(item) => item.id}
            renderItem={renderRequest}
            contentContainerStyle={styles.requestsContent}
            ListEmptyComponent={renderRequestsEmpty}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRequestsRefetching && !isRequestsLoading}
                onRefresh={refetchRequests}
                colors={[colors.buttonPrimary]}
                tintColor={colors.textMuted}
                progressBackgroundColor={colors.cardRaised}
              />
            }
          />
        </Animated.View>
      )}
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgCard,
    },
    flex: {
      flex: 1,
    },
    canvas: {
      backgroundColor: colors.canvasSubtle,
    },
    controls: {
      backgroundColor: colors.bgCard,
      paddingBottom: 14,
      gap: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    segmentWrap: {
      paddingHorizontal: 20,
    },
    requestsContent: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32,
    },
    stateBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      paddingHorizontal: 24,
    },
    skeletonCard: {
      backgroundColor: colors.cardRaised,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderLight,
      padding: 16,
      marginBottom: 12,
    },
    skeletonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    skeletonGap: {
      marginTop: 10,
    },
    skeletonGapSm: {
      marginTop: 4,
    },
    skeletonFooter: {
      marginTop: 26,
    },
  });
