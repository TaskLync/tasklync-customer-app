import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Skeleton, SkeletonGroup, SkeletonText, SKELETON } from './Skeleton';

interface SkeletonPortfolioGridProps {
  /**
   * 'section': WorkerPortfolioGrid on the profile (header + 6 cells, full-bleed grid).
   * 'screen':  the full portfolio page's 3-column FlashList (4px padding, 2px cell padding).
   */
  variant?: 'section' | 'screen';
  /** Section variant only: the grid's side gutter. */
  horizontalPadding?: number;
}

export const SkeletonPortfolioGrid: React.FC<SkeletonPortfolioGridProps> = ({
  variant = 'section',
  horizontalPadding = 20,
}) => {
  const { width } = useWindowDimensions();

  if (variant === 'screen') {
    return (
      <SkeletonGroup style={styles.screenGrid} accessibilityLabel="Loading photos">
        {Array.from({ length: 12 }).map((_, i) => (
          <View key={i} style={styles.screenCell}>
            <Skeleton width="100%" height="100%" borderRadius={SKELETON.radius.block} />
          </View>
        ))}
      </SkeletonGroup>
    );
  }

  const gap = 4;
  const cellSize = Math.floor((width - horizontalPadding * 2 - gap * 2) / 3);

  return (
    <SkeletonGroup accessibilityLabel="Loading portfolio">
      <View style={[styles.headerRow, { paddingHorizontal: horizontalPadding }]}>
        <SkeletonText fontSize={17} lineHeight={22} width={84} />
        <SkeletonText fontSize={13} lineHeight={18} width={52} />
      </View>
      <View style={[styles.grid, { gap, paddingHorizontal: horizontalPadding }]}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} width={cellSize} height={cellSize} borderRadius={6} />
        ))}
      </View>
    </SkeletonGroup>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  screenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  screenCell: {
    width: '33.3333%',
    aspectRatio: 1,
    padding: 2,
  },
});
