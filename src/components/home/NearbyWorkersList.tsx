import { useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable, FlatList, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

import { WorkerCardHorizontal } from '../worker/WorkerCardHorizontal';
import { SkeletonWorkerCardHorizontal } from '../ui/Skeleton/SkeletonWorkerCardHorizontal';
import { EmptyState } from '../feedback/EmptyState';
import { useNearbyWorkers } from '../../hooks/useNearbyWorkers';
import { WorkerNearby } from '../../types/worker.types';
import { colors } from '../../design/colors';

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

  // Real data only: zero demo/fallback mock workers
  const displayWorkers = useMemo(() => {
    if (workers && workers.length > 0) {
      return workers.slice(0, 10);
    }
    return [];
  }, [workers]);

  const opacityList = useSharedValue(0);
  const opacitySkeleton = useSharedValue(1);

  useEffect(() => {
    if (!isLoading) {
      opacitySkeleton.value = withTiming(0, { duration: 180 });
      opacityList.value = withDelay(80, withTiming(1, { duration: 220 }));
    } else {
      opacitySkeleton.value = withTiming(1, { duration: 150 });
      opacityList.value = withTiming(0, { duration: 150 });
    }
  }, [isLoading]);

  const animatedListStyle = useAnimatedStyle(() => ({
    opacity: opacityList.value,
  }));

  const animatedSkeletonStyle = useAnimatedStyle(() => ({
    opacity: opacitySkeleton.value,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: isLoading ? 1 : -1,
  }));

  const handleBookNow = useCallback((worker: WorkerNearby) => {
    router.push(`/worker/${worker.id}` as any);
  }, [router]);

  const handleSeeAll = useCallback(() => {
    router.push('/(tabs)/explore' as any);
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

  const renderSkeleton = () => (
    <Animated.View style={[styles.skeletonContainer, animatedSkeletonStyle]}>
      <View style={{ marginRight: CARD_GAP }}><SkeletonWorkerCardHorizontal /></View>
      <View><SkeletonWorkerCardHorizontal /></View>
    </Animated.View>
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
      <View style={styles.contentContainer}>
        {error && displayWorkers.length === 0 ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Couldn't load nearby workers.</Text>
            <Pressable onPress={() => refetch()} hitSlop={10}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : hasEmptyState ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              title="No workers nearby"
              subtitle="Try expanding your search radius or check back later"
              actionLabel="Search all workers"
              onAction={() => router.push('/search' as any)}
            />
          </View>
        ) : (
          <>
            {renderSkeleton()}

            <Animated.View style={[styles.listWrapper, animatedListStyle]}>
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
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    width: '100%',
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16, // Generous vertical spacing between header and worker cards
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
  contentContainer: {
    height: 244,
    position: 'relative',
    overflow: 'visible',
    zIndex: 10,
  },
  listWrapper: {
    height: 244,
    overflow: 'visible',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10, // Full headroom for soft card drop shadows and rounded corners
  },
  skeletonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    overflow: 'hidden',
  },
  emptyContainer: {
    minHeight: 180,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    height: 100,
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
