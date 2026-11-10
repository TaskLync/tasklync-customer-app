import { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';

import { useBookingHistory } from '../../src/hooks/useBookingHistory';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { StaleDataBadge } from '../../src/components/feedback/StaleDataBadge';
import {
  BookingHistoryCard,
  BookingHistoryItem,
} from '../../src/components/booking/BookingHistoryCard';
import { BookingHistoryCardSkeleton } from '../../src/components/booking/BookingHistoryCardSkeleton';
import { SkeletonGroup } from '../../src/components/ui/Skeleton';
import { YearCategoryFilterBar } from '../../src/components/ui/YearCategoryFilterBar';
import { EmptyState } from '../../src/components/feedback/EmptyState';
import { fontFamily, fontSize, radius, spacing, shadows } from '../../src/design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { ThemedStatusBar } from '../../src/theme/ThemedStatusBar';

export default function BookingHistoryScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isOffline } = useNetworkStatus();

  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');

  const {
    data,
    dataUpdatedAt,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useBookingHistory(selectedYear, selectedCategory);

  const allBookings = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.bookings);
  }, [data]);

  const handleBack = () => {
    router.back();
  };

  const handleBookNewService = () => {
    router.push('/(tabs)/explore' as any);
  };

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(({ item }: { item: BookingHistoryItem }) => {
    return <BookingHistoryCard booking={item} />;
  }, []);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primaryDark} />
      </View>
    );
  }, [isFetchingNextPage]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedStatusBar />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} maxFontSizeMultiplier={1.3}>
          Booking History
        </Text>

        <View style={styles.headerRightSpacer}>
          {isOffline && dataUpdatedAt ? (
            <StaleDataBadge cachedAt={dataUpdatedAt} />
          ) : null}
        </View>
      </View>

      {/* Sticky Year & Category Filter Bar */}
      <YearCategoryFilterBar
        selectedYear={selectedYear}
        selectedCategory={selectedCategory}
        onYearChange={setSelectedYear}
        onCategoryChange={setSelectedCategory}
      />

      {/* Main List Area */}
      <View style={styles.content}>
        {isLoading ? (
          <SkeletonGroup style={styles.skeletonList} accessibilityLabel="Loading booking history">
            {Array.from({ length: 6 }).map((_, index) => (
              <BookingHistoryCardSkeleton key={`hist-skel-${index}`} />
            ))}
          </SkeletonGroup>
        ) : allBookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              type="no-data"
              title="No Bookings Found"
              description={
                selectedYear !== 'all' || selectedCategory !== 'all'
                  ? 'No past bookings matched your filter selection. Try resetting filters.'
                  : 'You have not booked any home services yet. Ready for your first task?'
              }
              actionLabel="Book a Service"
              onAction={handleBookNewService}
            />
          </View>
        ) : (
          <FlatList
            data={allBookings}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 32 },
            ]}
            showsVerticalScrollIndicator={false}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.4}
            ListFooterComponent={renderFooter}
          />
        )}
      </View>
    </View>
  );
}

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgApp,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.iceGray,
  },
  headerTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.h3,
    color: colors.textPrimary,
  },
  headerRightSpacer: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
  },
  skeletonList: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  footerLoader: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 60,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.iceGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.h3,
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  bookCtaBtn: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
    ...shadows.sm,
  },
  bookCtaText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body2 + 1,
    color: colors.textOnGreen,
  },
});
