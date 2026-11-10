import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { BookingsHeader } from '../../src/components/booking/BookingsHeader';
import { BookingsTabBar } from '../../src/components/booking/BookingsTabBar';
import { BookingList } from '../../src/components/booking/BookingList';
import { useBookingsList, TabType } from '../../src/hooks/useBookingsList';
import { useCustomRequestsList } from '../../src/hooks/custom-requests/useCustomRequestsList';
import { CustomRequestCard } from '../../src/components/custom-requests/CustomRequestCard';
import { CustomRequestStatus } from '../../src/types/customRequest.types';
import { EmptyState } from '../../src/components/feedback/EmptyState';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';

type MainSectionType = 'BOOKINGS' | 'CUSTOM_REQUESTS';

export default function BookingsScreen() {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const [mainSection, setMainSection] = useState<MainSectionType>('BOOKINGS');
  const [activeTab, setActiveTab] = useState<TabType>('ACTIVE');
  const [requestFilter, setRequestFilter] = useState<'ALL' | 'QUOTE_READY' | 'ACTIVE' | 'RESOLVED'>('ALL');

  // Confirmed bookings list query
  const { bookings, isLoading, isRefreshing, isError, refetch } = useBookingsList(activeTab);

  // Custom requests list query
  const {
    requests,
    isLoading: isRequestsLoading,
    isRefetching: isRequestsRefetching,
    refetch: refetchRequests,
  } = useCustomRequestsList('ALL');

  // Refresh both lists on tab focus
  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchRequests();
    }, [refetch, refetchRequests])
  );

  // Filter custom requests
  const filteredRequests = useMemo(() => {
    if (requestFilter === 'ALL') return requests;
    if (requestFilter === 'QUOTE_READY') {
      return requests.filter((r) => r.status === CustomRequestStatus.QUOTE_SENT);
    }
    if (requestFilter === 'ACTIVE') {
      return requests.filter(
        (r) =>
          r.status === CustomRequestStatus.SUBMITTED ||
          r.status === CustomRequestStatus.UNDER_REVIEW ||
          r.status === CustomRequestStatus.CLARIFICATION_REQUESTED ||
          r.status === CustomRequestStatus.QUOTE_SENT ||
          r.status === CustomRequestStatus.ACCEPTED
      );
    }
    if (requestFilter === 'RESOLVED') {
      return requests.filter(
        (r) =>
          r.status === CustomRequestStatus.CONVERTED ||
          r.status === CustomRequestStatus.DECLINED ||
          r.status === CustomRequestStatus.CANCELLED ||
          r.status === CustomRequestStatus.EXPIRED
      );
    }
    return requests;
  }, [requests, requestFilter]);

  const activeQuoteCount = useMemo(() => {
    return requests.filter((r) => r.status === CustomRequestStatus.QUOTE_SENT).length;
  }, [requests]);

  return (
    <View style={styles.container}>
      <BookingsHeader />

      {/* Top Segmented Sub-Navigation */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, mainSection === 'BOOKINGS' && styles.segmentBtnActive]}
          onPress={() => setMainSection('BOOKINGS')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, mainSection === 'BOOKINGS' && styles.segmentTextActive]}>
            Confirmed Bookings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, mainSection === 'CUSTOM_REQUESTS' && styles.segmentBtnActive]}
          onPress={() => setMainSection('CUSTOM_REQUESTS')}
          activeOpacity={0.8}
        >
          <View style={styles.segmentTextRow}>
            <Text
              style={[
                styles.segmentText,
                mainSection === 'CUSTOM_REQUESTS' && styles.segmentTextActive,
              ]}
            >
              Custom Quotes
            </Text>
            {activeQuoteCount > 0 && (
              <View style={styles.quoteCountBadge}>
                <Text style={styles.quoteCountText}>{activeQuoteCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {mainSection === 'BOOKINGS' ? (
        <View style={styles.listContainer}>
          <BookingsTabBar activeTab={activeTab} onTabChange={setActiveTab} />
          
          <Animated.View 
            key={activeTab}
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(150)}
            style={styles.listContainer}
          >
            <BookingList 
              bookings={bookings} 
              isLoading={isLoading}
              isRefreshing={isRefreshing}
              isError={isError}
              activeTab={activeTab}
              onRefresh={refetch}
            />
          </Animated.View>
        </View>
      ) : (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          style={styles.listContainer}
        >
          {/* Custom Requests Filter Chips */}
          <View style={styles.filterChipsRow}>
            <TouchableOpacity
              style={[styles.filterChip, requestFilter === 'ALL' && styles.filterChipActive]}
              onPress={() => setRequestFilter('ALL')}
            >
              <Text style={[styles.filterChipText, requestFilter === 'ALL' && styles.filterChipTextActive]}>
                All ({requests.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, requestFilter === 'QUOTE_READY' && styles.filterChipActive]}
              onPress={() => setRequestFilter('QUOTE_READY')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  requestFilter === 'QUOTE_READY' && styles.filterChipTextActive,
                ]}
              >
                Quotes Ready ({activeQuoteCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, requestFilter === 'ACTIVE' && styles.filterChipActive]}
              onPress={() => setRequestFilter('ACTIVE')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  requestFilter === 'ACTIVE' && styles.filterChipTextActive,
                ]}
              >
                In Review
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, requestFilter === 'RESOLVED' && styles.filterChipActive]}
              onPress={() => setRequestFilter('RESOLVED')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  requestFilter === 'RESOLVED' && styles.filterChipTextActive,
                ]}
              >
                Past
              </Text>
            </TouchableOpacity>
          </View>

          {isRequestsLoading && requests.length === 0 ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color={palette.green600} />
              <Text style={styles.centerLoadingText}>Loading custom requests...</Text>
            </View>
          ) : filteredRequests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <EmptyState
                type="no-data"
                title="No Custom Requests"
                description={
                  requestFilter === 'ALL'
                    ? "You haven't submitted any custom diagnostic or quote requests yet."
                    : 'No custom requests match this filter.'
                }
                actionLabel="Find Professionals"
                onAction={() => router.push('/(tabs)/explore' as any)}
              />
            </View>
          ) : (
            <FlatList
              data={filteredRequests}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <CustomRequestCard request={item} />}
              contentContainerStyle={styles.requestsListContent}
              refreshControl={
                <RefreshControl
                  refreshing={isRequestsRefetching}
                  onRefresh={refetchRequests}
                  colors={[palette.green600]}
                  tintColor={palette.green600}
                />
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </Animated.View>
      )}
    </View>
  );
}

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.bgSection,
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 4,
    borderRadius: 12,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: colors.bgCard,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  segmentTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  segmentText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13.5,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    fontFamily: 'PlusJakartaSans-Bold',
    color: colors.textPrimary,
  },
  quoteCountBadge: {
    backgroundColor: colors.primaryDark,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  quoteCountText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: colors.pureWhite,
  },
  listContainer: {
    flex: 1,
  },
  filterChipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.bgCard,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.bgSection,
  },
  filterChipActive: {
    backgroundColor: colors.primaryBorderSubtle,
  },
  filterChipText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: colors.textMuted,
  },
  filterChipTextActive: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: colors.textGreen,
  },
  requestsListContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  centerLoadingText: {
    marginTop: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: palette.gray500,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 17,
    color: palette.gray900,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: palette.gray500,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  findWorkersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.green600,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
  },
  findWorkersBtnText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    color: colors.pureWhite,
    marginRight: 4,
  },
});
