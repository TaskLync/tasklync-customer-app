import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, ChevronDown } from 'lucide-react-native';

import { WorkerListRow, WorkerListRowSkeleton } from '../worker/WorkerListRow';
import { SkeletonGroup } from '../ui/Skeleton/Skeleton';
import { useInfiniteWorkers } from '../../hooks/useInfiniteWorkers';
import { WorkerNearby } from '../../types/worker.types';
import { typography } from '../../design/typography';
import { layout } from '../../design/spacing';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

// ─── Constants ────────────────────────────────────────────────────────────────
const INITIAL_VISIBLE_COUNT = 6;
const PAGE_LIMIT = 20;

interface AllWorkersSectionProps {
  /** Optional category filter to scope the list */
  category?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export const AllWorkersSection: React.FC<AllWorkersSectionProps> = ({ category }) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  const workerParams = useMemo(() => {
    const p: Parameters<typeof useInfiniteWorkers>[0] = { limit: PAGE_LIMIT };
    if (category) p.category = category;
    return p;
  }, [category]);

  const { workers, total, isLoading, isLoadingMore, hasNextPage, loadMore, isError } =
    useInfiniteWorkers(workerParams);

  // Rendered inline inside the home ScrollView ("Show more" instead of a nested list).
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  const individualWorkers = useMemo(
    () => (workers || []).filter((w) => w && w.providerType !== 'COMPANY' && !w.isCompany),
    [workers]
  );

  const handleShowMore = useCallback(() => {
    const nextVisible = visibleCount + PAGE_LIMIT;
    setVisibleCount(nextVisible);
    if (nextVisible >= individualWorkers.length && hasNextPage && !isLoadingMore) {
      loadMore();
    }
  }, [visibleCount, individualWorkers.length, hasNextPage, isLoadingMore, loadMore]);

  const handleSeeAll = useCallback(() => {
    router.push('/(tabs)/explore' as any);
  }, [router]);

  const visibleWorkers: WorkerNearby[] = individualWorkers.slice(0, visibleCount);
  const hasMoreToShow = visibleCount < individualWorkers.length || (hasNextPage && !isLoadingMore);
  // `total` is the backend count; never show fewer than what is already on screen.
  const workerCount = Math.max(total || 0, individualWorkers.length);

  const header = (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.title}>All Workers</Text>
        {!isLoading && workerCount > 0 && (
          <Text style={styles.subtitle}>
            {workerCount.toLocaleString()} {workerCount === 1 ? 'worker' : 'workers'} available
          </Text>
        )}
      </View>
      <Pressable
        onPress={handleSeeAll}
        hitSlop={12}
        style={({ pressed }) => [styles.seeAll, pressed && styles.pressedText]}
        accessibilityRole="link"
        accessibilityLabel="See all workers"
      >
        <Text style={styles.seeAllText}>See all</Text>
        <ChevronRight size={15} color={colors.primaryDark} strokeWidth={2.4} />
      </Pressable>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.section}>
        {header}
        <SkeletonGroup style={styles.list} accessibilityLabel="Loading workers">
          {Array.from({ length: INITIAL_VISIBLE_COUNT }).map((_, i) => (
            <WorkerListRowSkeleton key={`skel-${i}`} isLast={i === INITIAL_VISIBLE_COUNT - 1} />
          ))}
        </SkeletonGroup>
      </View>
    );
  }

  // NearbyWorkersList owns the home screen's empty/error state; don't duplicate it.
  if (isError || individualWorkers.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      {header}

      <View style={styles.list}>
        {visibleWorkers.map((worker, i) => (
          <WorkerListRow
            key={worker.id}
            worker={worker}
            isLast={i === visibleWorkers.length - 1 && !isLoadingMore}
          />
        ))}
        {isLoadingMore && (
          <SkeletonGroup accessibilityLabel="Loading more workers">
            <WorkerListRowSkeleton />
            <WorkerListRowSkeleton isLast />
          </SkeletonGroup>
        )}
      </View>

      {hasMoreToShow && !isLoadingMore && (
        <Pressable
          onPress={handleShowMore}
          style={({ pressed }) => [styles.showMore, pressed && styles.showMorePressed]}
          accessibilityRole="button"
        >
          <Text style={styles.showMoreLabel}>Show more workers</Text>
          <ChevronDown size={16} color={colors.textPrimary} strokeWidth={2.2} />
        </Pressable>
      )}

      {!hasMoreToShow && !isLoadingMore && individualWorkers.length > INITIAL_VISIBLE_COUNT && (
        <Text style={styles.endText}>You've seen all workers</Text>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingH,
    marginBottom: 4,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: typography.fontFamily.poppins.bold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 1,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    marginLeft: 12,
  },
  seeAllText: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 13.5,
    color: colors.primaryDark,
  },
  pressedText: {
    opacity: 0.6,
  },
  list: {
    backgroundColor: colors.bgCard,
  },
  showMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: layout.screenPaddingH,
    marginTop: 8,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.bgSection,
  },
  showMorePressed: {
    backgroundColor: colors.bgHover,
  },
  showMoreLabel: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  endText: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
});
