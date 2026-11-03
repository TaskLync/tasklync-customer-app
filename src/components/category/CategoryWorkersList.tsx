import React from 'react';
import {
  StyleSheet,
  View,
  Text,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { WorkerNearby } from '../../types/worker.types';
import { SortOption } from '../../types/search.types';
import { useInfiniteWorkers } from '../../hooks/useInfiniteWorkers';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useLocation } from '../../hooks/useLocation';
import { FAISALABAD_CENTER } from '../../config/serviceArea.config';
import { WorkerSearchCard } from '../worker/WorkerSearchCard';
import { SkeletonWorkerSearchCard } from '../ui/Skeleton/SkeletonWorkerSearchCard';
import { EmptyState } from '../feedback/EmptyState/EmptyState';
import { ErrorState } from '../feedback/ErrorState/ErrorState';
import { StickyListHeader } from '../ui/List/StickyListHeader';
import { SortDropdown } from '../ui/SortDropdown/SortDropdown';
import { colors } from '../../design/colors';
import { typography } from '../../design/typography';

interface CategoryWorkersListProps {
  categoryId: string;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  maxRate?: number;
  minRating?: number;
  available?: 'any' | 'now' | 'today';
  radius?: number;
}

const AnyFlashList = FlashList as any;

export const CategoryWorkersList: React.FC<CategoryWorkersListProps> = ({
  categoryId,
  sortBy,
  onSortChange,
  maxRate = 0,
  minRating = 0,
  radius = 10000,
}) => {
  const { isOffline } = useNetworkStatus();
  const { location } = useLocation();

  const lat = location?.lat ?? FAISALABAD_CENTER.lat;
  const lng = location?.lng ?? FAISALABAD_CENTER.lng;

  const {
    workers,
    total,
    isLoading,
    isLoadingMore,
    isError,
    isEmpty,
    hasNextPage,
    loadMore,
    refetch,
  } = useInfiniteWorkers({
    lat,
    lng,
    category: categoryId,
    radius,
    minRating,
    maxRate,
    sortBy,
    limit: 10,
  });

  const renderItem = ({ item }: { item: WorkerNearby }) => {
    return <WorkerSearchCard worker={item} />;
  };

  const renderFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <SkeletonWorkerSearchCard />
          <SkeletonWorkerSearchCard />
        </View>
      );
    }

    if (!hasNextPage && workers.length > 0) {
      return (
        <Text style={styles.footerText}>
          All {total} workers shown
        </Text>
      );
    }

    return <View style={styles.footerPadding} />;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StickyListHeader
          title="Workers"
          count={null}
          rightContent={
            <SortDropdown
              currentSort={sortBy}
              onSortChange={onSortChange}
            />
          }
        />
        <View style={styles.skeletons}>
          <SkeletonWorkerSearchCard />
          <SkeletonWorkerSearchCard />
          <SkeletonWorkerSearchCard />
          <SkeletonWorkerSearchCard />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <Animated.View style={styles.emptyContainer} entering={FadeIn.duration(200)}>
        <StickyListHeader
          title="Workers"
          count={0}
          rightContent={
            <SortDropdown
              currentSort={sortBy}
              onSortChange={onSortChange}
            />
          }
        />
        <ErrorState
          type={isOffline ? 'offline' : 'error'}
          title={isOffline ? 'No internet connection' : "Couldn't load workers"}
          subtitle={
            isOffline
              ? 'Please check your connection or Wi-Fi settings and try again.'
              : 'An unexpected error occurred while loading workers for this category.'
          }
          onRetry={refetch}
          retryButtonText="Retry"
        />
      </Animated.View>
    );
  }

  if (isEmpty) {
    return (
      <Animated.View style={styles.emptyContainer} entering={FadeIn.duration(200)}>
        <StickyListHeader
          title="Workers"
          count={0}
          rightContent={
            <SortDropdown
              currentSort={sortBy}
              onSortChange={onSortChange}
            />
          }
        />
        <EmptyState
          type="no-workers"
          title="No workers for this category near you"
          subtitle="Try expanding your search filters or changing your location."
          onAction={refetch}
          actionLabel="Retry"
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={styles.container} entering={FadeIn.duration(200)}>
      <AnyFlashList
        data={workers}
        renderItem={renderItem}
        keyExtractor={(item: WorkerNearby) => item.id}
        estimatedItemSize={110}
        onEndReachedThreshold={0.6}
        onEndReached={loadMore}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerWrapper}>
            <StickyListHeader
              title="Workers"
              count={total}
              rightContent={
                <SortDropdown
                  currentSort={sortBy}
                  onSortChange={onSortChange}
                />
              }
            />
          </View>
        }
        ListFooterComponent={renderFooter}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  headerWrapper: {
    marginHorizontal: -16,
  },
  skeletons: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
  },
  footerLoader: {
    marginVertical: 12,
  },
  footerText: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: 20,
  },
  footerPadding: {
    height: 16,
  },
});

