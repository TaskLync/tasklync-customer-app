import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

import { Section } from '../layout/Section';
import { WorkerSearchCard } from '../worker/WorkerSearchCard';
import { SkeletonWorkerSearchCard } from '../ui/Skeleton';
import { useInfiniteWorkers } from '../../hooks/useInfiniteWorkers';
import { WorkerNearby } from '../../types/worker.types';
import { colors } from '../../design/colors';
import { typography } from '../../design/typography';
import { radius } from '../../design/radius';

// ─── Constants ────────────────────────────────────────────────────────────────
const INITIAL_VISIBLE_COUNT = 6;
const PAGE_LIMIT = 20;

// ─── Types ─────────────────────────────────────────────────────────────────────
interface AllWorkersSectionProps {
  /** Optional category filter to scope the list */
  category?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export const AllWorkersSection: React.FC<AllWorkersSectionProps> = ({
  category,
}) => {
  const router = useRouter();

  const workerParams = useMemo(() => {
    const p: Parameters<typeof useInfiniteWorkers>[0] = {
      limit: PAGE_LIMIT,
    };
    if (category) p.category = category;
    return p;
  }, [category]);

  const {
    workers,
    total,
    isLoading,
    isLoadingMore,
    hasNextPage,
    loadMore,
    isError,
  } = useInfiniteWorkers(workerParams);

  // Track how many workers are currently rendered (for "Show More" within
  // the outer ScrollView — avoids nested scroll issues).
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  const handleShowMore = useCallback(() => {
    const nextVisible = visibleCount + PAGE_LIMIT;
    setVisibleCount(nextVisible);

    // If we've shown all locally fetched workers, fetch the next page
    if (nextVisible >= workers.length && hasNextPage && !isLoadingMore) {
      loadMore();
    }
  }, [visibleCount, workers.length, hasNextPage, isLoadingMore, loadMore]);

  const handleSeeAll = useCallback(() => {
    router.push('/(tabs)/explore' as any);
  }, [router]);

  // The visible slice of workers to render (defensively ensuring only individual workers)
  // Must be called unconditionally before any early returns to satisfy Rules of Hooks
  const individualWorkers = useMemo(
    () => (workers || []).filter((w) => w && w.providerType !== 'COMPANY' && !w.isCompany),
    [workers]
  );
  const visibleWorkers: WorkerNearby[] = individualWorkers.slice(0, visibleCount);
  const hasMoreToShow =
    visibleCount < individualWorkers.length || (hasNextPage && !isLoadingMore);

  // ── Render: skeletons while loading ──────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.sectionSpacer}>
        <Section
          title="All Workers"
          actionLabel="See all →"
          onAction={handleSeeAll}
        >
          <View style={styles.listContainer}>
            {Array.from({ length: INITIAL_VISIBLE_COUNT }).map((_, i) => (
              <SkeletonWorkerSearchCard key={`skel-${i}`} />
            ))}
          </View>
        </Section>
      </View>
    );
  }

  // ── Render: API error or empty state ───────────────────────────────────────
  // Suppress duplicate empty/error state on the Home Screen.
  // NearbyWorkersList already displays the primary authoritative empty state with CTA.
  if (isError || individualWorkers.length === 0) {
    return null;
  }

  // ── Render: worker list ───────────────────────────────────────────────────
  return (
    <View style={styles.sectionSpacer}>
      <Section
        title="All Workers"
        actionLabel="See all →"
        onAction={handleSeeAll}
      >
        {/* Results count */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>{total} workers available</Text>
        </View>

        {/* Worker cards rendered inline (no nested scroll) */}
        <View style={styles.listContainer}>
          {visibleWorkers.map((worker) => (
            <WorkerSearchCard key={worker.id} worker={worker} />
          ))}
        </View>

        {/* Loading more skeletons */}
        {isLoadingMore && (
          <View style={styles.loadMoreSkeletons}>
            <SkeletonWorkerSearchCard />
            <SkeletonWorkerSearchCard />
          </View>
        )}

        {/* Show More / Load More button */}
        {hasMoreToShow && !isLoadingMore && (
          <Pressable
            onPress={handleShowMore}
            style={({ pressed }) => [
              styles.showMoreButton,
              pressed && styles.showMorePressed,
            ]}
          >
            <Text style={styles.showMoreLabel}>Show more workers</Text>
          </Pressable>
        )}

        {/* End of list indicator */}
        {!hasMoreToShow && !isLoadingMore && workers.length > INITIAL_VISIBLE_COUNT && (
          <View style={styles.endOfList}>
            <View style={styles.endLine} />
            <Text style={styles.endText}>You've seen all workers</Text>
            <View style={styles.endLine} />
          </View>
        )}
      </Section>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  sectionSpacer: {
    marginBottom: 20,
  },
  listContainer: {
    paddingHorizontal: 16,
    gap: 0, // WorkerSearchCard already has marginBottom: 10
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultsCount: {
    fontFamily: typography.fontFamily.inter.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  errorText: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  retryText: {
    fontFamily: typography.fontFamily.jakarta.medium,
    fontSize: 13,
    color: colors.primary,
    marginLeft: 6,
  },
  loadMoreSkeletons: {
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 4,
  },
  showMoreButton: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  showMorePressed: {
    opacity: 0.7,
    backgroundColor: colors.bgInput,
  },
  showMoreLabel: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: colors.primary,
  },
  endOfList: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    gap: 10,
  },
  endLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  endText: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
});
