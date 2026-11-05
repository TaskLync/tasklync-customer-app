import { View, StyleSheet, Text, ViewStyle, useWindowDimensions, Pressable } from 'react-native';
import { WorkerPortfolioImage } from '../../types/review.types';
import { PortfolioCell } from './PortfolioCell';

import { colors } from '@design/colors';
import { fontFamily as fonts } from '@design/typography';

interface WorkerPortfolioGridProps {
  images: WorkerPortfolioImage[];
  workerId: string;
  maxVisible?: number;
  onViewAll?: () => void;
  onImagePress: (images: WorkerPortfolioImage[], startIndex: number) => void;
  showHeader?: boolean;
  /** Horizontal padding of header + grid; the grid is assumed to span the full window width. */
  horizontalPadding?: number;
  style?: ViewStyle;
  onLayout?: (e: any) => void;
}

export const WorkerPortfolioGrid = ({
  images,
  maxVisible = 6,
  onViewAll,
  onImagePress,
  showHeader = true,
  horizontalPadding = 16,
  style,
  onLayout,
}: WorkerPortfolioGridProps) => {
  const { width: screenWidth } = useWindowDimensions();

  if (!images || images.length === 0) return null;

  const padding = horizontalPadding * 2;
  const gap = 4;
  const numColumns = 3;
  const totalGapWidth = gap * (numColumns - 1);
  const cellSize = Math.floor((screenWidth - padding - totalGapWidth) / numColumns);

  const visibleImages = images.slice(0, maxVisible);
  const remainingCount = images.length - maxVisible;

  const renderCell = (image: WorkerPortfolioImage, index: number) => {
    const isLastCell = index === maxVisible - 1 && remainingCount > 0;

    return (
      <View key={image.id} style={isLastCell ? styles.lastCellContainer : undefined}>
        <PortfolioCell
          image={image}
          size={cellSize}
          index={index}
          onPress={() => (isLastCell && onViewAll ? onViewAll() : onImagePress(images, index))}
          priority={index < 3 ? 'high' : 'normal'}
        />
        {isLastCell && (
          <Pressable
            style={[styles.lastCellOverlay, { width: cellSize, height: cellSize }]}
            onPress={onViewAll}
          >
            <Text style={styles.remainingText}>+{remainingCount}</Text>
          </Pressable>
        )}
      </View>
    );
  };

  const gridContent = (
    <View style={[styles.grid, { gap, paddingHorizontal: horizontalPadding }]} onLayout={onLayout}>
      {visibleImages.map((img, idx) => renderCell(img, idx))}
    </View>
  );

  if (showHeader) {
    return (
      <View style={[styles.container, style]}>
        <View style={[styles.headerRow, { paddingHorizontal: horizontalPadding }]}>
          <Text style={styles.headerTitle}>Portfolio</Text>
          {onViewAll && remainingCount > 0 && (
            <Pressable onPress={onViewAll} hitSlop={12}>
              <Text style={styles.viewAllText}>See all {images.length}</Text>
            </Pressable>
          )}
        </View>
        {gridContent}
      </View>
    );
  }

  return <View style={[styles.container, style]}>{gridContent}</View>;
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontFamily: fonts.poppins.semiBold,
    fontSize: 17,
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  viewAllText: {
    fontFamily: fonts.jakarta.semiBold,
    fontSize: 13,
    color: colors.primaryDark,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  lastCellContainer: {
    position: 'relative',
  },
  lastCellOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6, // radius.sm
  },
  remainingText: {
    fontFamily: fonts.inter.bold,
    fontSize: 20,
    color: colors.white,
  },
});
