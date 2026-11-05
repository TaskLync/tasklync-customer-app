import { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  RefreshControl,
  Pressable,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { ArrowLeft, Star } from 'lucide-react-native';

import { useWorkerReviewSummary } from '../../../src/hooks/useReview';
import { useWorkerReviews } from '../../../src/hooks/useWorkerReviews';
import { ReviewRatingOverview } from '../../../src/components/review/ReviewRatingOverview';
import { ReviewCard, REVIEW_CARD_GAP } from '../../../src/components/review/ReviewCard';
import { SkeletonGroup, SkeletonReviewCard } from '../../../src/components/ui/Skeleton';
import { EmptyState } from '../../../src/components/feedback/EmptyState';
import { colors, palette } from '../../../src/design/colors';
import { fontFamily as fonts } from '../../../src/design/typography';
import { radius } from '../../../src/design/radius';

const RATING_FILTER_OPTIONS: Array<{ key: number | undefined; label: string }> = [
  { key: undefined, label: 'All' },
  { key: 5, label: '5 Stars' },
  { key: 4, label: '4 Stars' },
  { key: 3, label: '3 Stars' },
  { key: 2, label: '2 Stars' },
  { key: 1, label: '1 Star' },
];

const ReviewSeparator = () => <View />;

/**
 * WorkerReviewsScreen
 *
 * Implements Section 4.5 & 4.6 of REVIEW_SERVICE_CUSTOMER_API_SPECIFICATION.md:
 * - Fetches Worker Rating Summary (average, star distribution 1-5, and top compliments)
 * - Server-side star rating filtering (All, 5, 4, 3, 2, 1)
 * - Infinite cursor pagination (cursor, limit=20)
 * - Review cards with photo galleries, tag pills, worker replies, and report modal
 */
export default function WorkerReviewsScreen() {
  const { id: workerId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | undefined>(undefined);

  // 1. Fetch aggregate summary from review-service
  const {
    data: summaryData,
    refetch: refetchSummary,
  } = useWorkerReviewSummary(workerId || '');

  // 2. Fetch paginated reviews list
  const {
    reviews,
    total: _total,
    isLoading: isReviewsLoading,
    isLoadingMore,
    hasNextPage,
    loadMore,
    refetch: refetchReviews,
  } = useWorkerReviews(workerId || '', 'recent', selectedRatingFilter);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchSummary(), refetchReviews()]);
    setRefreshing(false);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(workerId ? (`/worker/${workerId}` as any) : ('/(tabs)/' as any));
    }
  };

  const handleSelectFilter = useCallback((ratingVal: number | undefined) => {
    setSelectedRatingFilter(ratingVal);
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <ReviewCard
      review={item}
      showReply={true}
      showWorkInfo={true}
      allowReport={true}
      maxCommentLines={4}
    />
  );

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* Rating Summary Card (Distribution + Top Compliments) */}
      {summaryData ? (
        <ReviewRatingOverview summary={summaryData} style={styles.summaryMargin} />
      ) : null}

      {/* Star Filter Pills Row */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsRow}
        >
          {RATING_FILTER_OPTIONS.map((opt) => {
            const isSelected = selectedRatingFilter === opt.key;
            return (
              <Pressable
                key={opt.label}
                onPress={() => handleSelectFilter(opt.key)}
                style={({ pressed }) => [
                  styles.filterPill,
                  isSelected ? styles.filterPillActive : styles.filterPillInactive,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${opt.label}`}
                accessibilityState={{ selected: isSelected }}
              >
                {opt.key !== undefined && (
                  <Star
                    size={13}
                    color={isSelected ? colors.primaryDark : colors.starFilled}
                    fill={isSelected ? colors.primaryDark : colors.starFilled}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected ? styles.filterPillTextActive : styles.filterPillTextInactive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

    </View>
  );

  const renderEmpty = () => {
    if (isReviewsLoading) {
      return (
        <SkeletonGroup style={styles.skeletonList} accessibilityLabel="Loading reviews">
          <SkeletonReviewCard />
          <SkeletonReviewCard />
          <SkeletonReviewCard />
        </SkeletonGroup>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          type="no-data"
          title={selectedRatingFilter ? 'No reviews with this rating' : 'No reviews yet'}
          description={
            selectedRatingFilter
              ? 'Try selecting "All" to view all reviews for this service provider.'
              : 'Reviews from customers will appear here after completed bookings.'
          }
          actionLabel={selectedRatingFilter ? 'View All Reviews' : undefined}
          onAction={selectedRatingFilter ? () => setSelectedRatingFilter(undefined) : undefined}
        />
      </View>
    );
  };

  const renderFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={[styles.skeletonList, styles.footerSkeleton]}>
          <SkeletonReviewCard />
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgCard} />

      {/* Screen Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          hitSlop={8}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} accessibilityRole="header">
          Reviews
        </Text>
        <View style={styles.iconButton} />
      </View>

      <FlashList
        data={reviews}
        renderItem={renderItem}
        keyExtractor={(item: any) => item.id}
        onEndReached={hasNextPage ? loadMore : null}
        onEndReachedThreshold={0.5}
        ItemSeparatorComponent={ReviewSeparator}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  pressed: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bgCard,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.poppins.semiBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  listHeader: {
    marginBottom: 16,
  },
  summaryMargin: {
    marginBottom: 16,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  filterPillInactive: {
    backgroundColor: 'transparent',
  },
  filterPillActive: {
    backgroundColor: colors.primaryTint,
  },
  filterPillText: {
    fontSize: 13,
  },
  filterPillTextInactive: {
    fontFamily: fonts.jakarta.medium,
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    fontFamily: fonts.jakarta.semiBold,
    color: colors.primaryDark,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  resultCount: {
    fontFamily: fonts.poppins.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  skeletonList: {
    gap: REVIEW_CARD_GAP,
  },
  footerSkeleton: {
    marginTop: REVIEW_CARD_GAP,
  },
  emptyContainer: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyTitle: {
    fontFamily: fonts.poppins.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    marginTop: 6,
    fontFamily: fonts.jakarta.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: palette.gray500,
  },
  footerContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  endText: {
    fontFamily: fonts.jakarta.regular,
    fontSize: 13,
    color: palette.gray500,
  },
});
