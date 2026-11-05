import { useMemo, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable, FlatList, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

import { WorkerCardHorizontal } from '../worker/WorkerCardHorizontal';
import { SkeletonWorkerCardHorizontal } from '../ui/Skeleton/SkeletonWorkerCardHorizontal';
import { EmptyState } from '../feedback/EmptyState';
import { useNearbyWorkers } from '../../hooks/useNearbyWorkers';
import { WorkerNearby } from '../../types/worker.types';
import { colors } from '../../design/colors';
import { pushOnce } from '../../utils/navigationGuard';

const CARD_GAP = 14;

export const NearbyWorkersList = () => {
  const router = useRouter();
  const { workers, isLoading, error, refetch } = useNearbyWorkers();
  const { width: windowWidth } = useWindowDimensions();

  // Reduced card width (~72% of screen width) for a sleek, compact card profile
  const cardWidth = useMemo(() => {
    return windowWidth
      ? Math.min(Math.round(windowWidth * 0.72), 300)
      : 280;
  }, [windowWidth]);

  const snapInterval = useMemo(() => cardWidth + CARD_GAP, [cardWidth]);

  // Real data only: zero demo/fallback mock workers & strictly individual workers only
  const displayWorkers = useMemo(() => {
    if (workers && workers.length > 0) {
      return workers
        .filter((w) => w.providerType !== 'COMPANY' && !w.isCompany)
        .slice(0, 10);
    }
    return [];
  }, [workers]);

  const handleBookNow = useCallback((worker: WorkerNearby) => {
    pushOnce(() => router.push(`/worker/${worker.id}` as any));
  }, [router]);

  const handleSeeAll = useCallback(() => {
    pushOnce(() => router.push('/(tabs)/explore' as any));
  }, [router]);

  const renderWorker = useCallback(
    ({ item }: { item: WorkerNearby }) => (
      <WorkerCardHorizontal
        worker={item}
        cardWidth={cardWidth}
        onBookNow={handleBookNow}
      />
    ),
    [cardWidth, handleBookNow]
  );

  const renderItemSeparator = useCallback(() => (
    <View style={{ width: CARD_GAP }} />
  ), []);

  // Mounted only while loading, so its animation stops the moment real cards arrive.
  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <SkeletonWorkerCardHorizontal cardWidth={cardWidth} />
      <SkeletonWorkerCardHorizontal cardWidth={cardWidth} />
    </View>
  );

  const hasEmptyState = !isLoading && (!workers || workers.length === 0) && displayWorkers.length === 0;

  return (
    <View style={styles.sectionContainer}>
      {/* ── Section Header ── */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Nearby Workers</Text>
        <Pressable
          onPress={handleSeeAll}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="See all nearby workers"
        >
          <Text style={styles.actionLabel}>See all →</Text>
        </Pressable>
      </View>

      {/* ── Content Area ── */}
      {error && displayWorkers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            type="server-error"
            title="Couldn't load workers"
            description="We're having trouble fetching workers. Please check your connection and try again."
            actionLabel="Try again"
            onAction={() => refetch()}
            compact
          />
        </View>
      ) : hasEmptyState ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            type="no-workers"
            title="No workers nearby"
            description="Try expanding your search radius or check back later."
            actionLabel="Search all workers"
            onAction={() => router.push('/(tabs)/explore' as any)}
            compact
          />
        </View>
      ) : (
        <View style={styles.listContainer}>
          {isLoading ? renderSkeleton() : (
          <Animated.View style={styles.listWrapper} entering={FadeIn.duration(200)}>
            <FlatList
              data={displayWorkers}
              renderItem={renderWorker}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              directionalLockEnabled={true}
              alwaysBounceVertical={false}
              snapToInterval={snapInterval}
              snapToAlignment="start"
              decelerationRate="fast"
              bounces={false}
              nestedScrollEnabled={true}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={renderItemSeparator}
              initialNumToRender={2}
              maxToRenderPerBatch={3}
              windowSize={5}
              removeClippedSubviews={false}
            />
          </Animated.View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13.5,
    color: colors.primary, // Brand green accent color
  },
  listContainer: {
    height: 244,
    position: 'relative',
  },
  listWrapper: {
    height: 244,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10, // Full headroom for soft card drop shadows and rounded corners
  },
  skeletonContainer: {
    flexDirection: 'row',
    gap: CARD_GAP,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    overflow: 'hidden',
  },
  emptyContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  errorText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: colors.textMuted,
  },
  retryText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: colors.primary,
    marginLeft: 6,
  },
});
