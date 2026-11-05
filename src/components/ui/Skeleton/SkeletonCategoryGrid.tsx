import { StyleSheet } from 'react-native';
import { SkeletonGroup } from './Skeleton';
import { SkeletonCategoryCard } from './SkeletonCategoryCard';

/** Same insets/gap as CategoryGrid's FlatList (34 left, 22 between items). */
export const SkeletonCategoryGrid = () => (
  <SkeletonGroup style={styles.row} accessibilityLabel="Loading categories">
    {Array.from({ length: 6 }).map((_, i) => (
      <SkeletonCategoryCard key={i} />
    ))}
  </SkeletonGroup>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingLeft: 34,
    gap: 22,
    overflow: 'hidden',
  },
});
