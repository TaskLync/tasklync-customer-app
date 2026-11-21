import { useEffect, useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { SkeletonCategoryGrid } from '../ui/Skeleton';
import { ServiceCategoryCard } from '../service/ServiceCategoryCard';
import { useCategories } from '../../hooks/useCategories';
import { Category } from '../../types/category.types';
import { CATEGORY_VISIBLE_COUNT, getCategoryCarouselLayout } from './categoryCarouselLayout';

export const CategoryGrid = () => {
  const queryClient = useQueryClient();
  const { categories, isLoading, error } = useCategories();
  const { width: windowWidth } = useWindowDimensions();

  // The carousel spans the screen, so the window width is the right first guess (no layout jump);
  // onLayout then gives the real container width (split screen, foldables, rotation).
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const containerWidth = measuredWidth ?? windowWidth;
  const layout = useMemo(() => getCategoryCarouselLayout(containerWidth), [containerWidth]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setMeasuredWidth((prev) => (prev !== null && Math.abs(prev - w) < 0.5 ? prev : w));
  }, []);

  const visibleCategories = useMemo(() => categories?.slice(0, 6) || [], [categories]);

  useEffect(() => {
    // Prefetch individual category queries on mount
    visibleCategories.forEach((category) => {
      queryClient.prefetchQuery({
        queryKey: ['category', category.id],
      });
    });
  }, [visibleCategories, queryClient]);

  const renderItem = useCallback(
    ({ item, index }: { item: Category; index: number }) => (
      <ServiceCategoryCard
        category={item}
        index={index}
        width={layout.itemWidth}
        tileSize={layout.tileSize}
        iconSize={layout.iconSize}
        tileRadius={layout.tileRadius}
      />
    ),
    [layout]
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<Category> | null | undefined, index: number) => ({
      length: layout.itemWidth,
      offset: layout.itemWidth * index,
      index,
    }),
    [layout.itemWidth]
  );

  const keyExtractor = useCallback((item: Category) => item.id, []);

  if (isLoading) {
    return (
      <View style={styles.container} onLayout={onLayout}>
        <SkeletonCategoryGrid layout={layout} />
      </View>
    );
  }

  if (error || visibleCategories.length === 0) {
    return null;
  }

  const scrollable = visibleCategories.length > CATEGORY_VISIBLE_COUNT;

  return (
    <View style={styles.container} onLayout={onLayout}>
      <FlatList
        data={visibleCategories}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        extraData={layout}
        horizontal
        scrollEnabled={scrollable}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bounces={scrollable}
        alwaysBounceVertical={false}
        directionalLockEnabled
        nestedScrollEnabled
        // Snap to whole slots: after any swipe, four complete categories sit on the grid again.
        snapToInterval={layout.itemWidth}
        snapToAlignment="start"
        decelerationRate="fast"
        initialNumToRender={CATEGORY_VISIBLE_COUNT + 2}
        contentContainerStyle={[
          { paddingHorizontal: layout.gutter },
          // Fewer than four categories: keep the group centred rather than hugging the left.
          !scrollable && styles.centered,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 4,
  },
  centered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
