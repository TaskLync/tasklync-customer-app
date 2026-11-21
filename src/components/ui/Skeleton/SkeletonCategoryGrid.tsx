import { StyleSheet, useWindowDimensions } from 'react-native';
import { SkeletonGroup } from './Skeleton';
import { SkeletonCategoryCard } from './SkeletonCategoryCard';
import {
  CATEGORY_VISIBLE_COUNT,
  getCategoryCarouselLayout,
  type CategoryCarouselLayout,
} from '../../home/categoryCarouselLayout';

/** Same slots and gutter as CategoryGrid, so the real categories replace it with no shift. */
export const SkeletonCategoryGrid = ({ layout }: { layout?: CategoryCarouselLayout }) => {
  const { width } = useWindowDimensions();
  const l = layout ?? getCategoryCarouselLayout(width);
  return (
    <SkeletonGroup style={[styles.row, { paddingHorizontal: l.gutter }]} accessibilityLabel="Loading categories">
      {Array.from({ length: CATEGORY_VISIBLE_COUNT }).map((_, i) => (
        <SkeletonCategoryCard key={i} width={l.itemWidth} tileSize={l.tileSize} tileRadius={l.tileRadius} />
      ))}
    </SkeletonGroup>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
});
