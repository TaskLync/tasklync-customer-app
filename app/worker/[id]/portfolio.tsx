import { useState } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { ArrowLeft } from 'lucide-react-native';

import { useWorkerPortfolio } from '../../../src/hooks/useWorkerPortfolio';
import { useWorkerProfile } from '../../../src/hooks/useWorkerProfile';
import { PortfolioCell } from '../../../src/components/worker/PortfolioCell';
import { ImageViewer } from '../../../src/components/common/ImageViewer';
import { SkeletonPortfolioGrid } from '../../../src/components/ui/Skeleton';

import { fontFamily as fonts } from '@design/typography';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../src/theme/useAppTheme';

export default function WorkerPortfolioScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const { images, isLoading } = useWorkerPortfolio(id || '');
  const { worker } = useWorkerProfile(id || '');

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);

  const numColumns = 3;
  const padding = 8; // 4px on each side of contentContainer
  const gap = 4;
  const totalGapWidth = gap * (numColumns - 1);
  const cellSize = Math.floor((width - padding - totalGapWidth) / numColumns);

  const handleImagePress = (index: number) => {
    setViewerStartIndex(index);
    setViewerVisible(true);
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.cellWrapper}>
      <PortfolioCell
        image={item}
        size={cellSize}
        index={index}
        onPress={handleImagePress}
      />
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) {
      return <SkeletonPortfolioGrid variant="screen" />;
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No portfolio photos yet</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Custom Header */}
      <View style={styles.header}>
        <Pressable 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace(id ? `/worker/${id}` as any : '/(tabs)/' as any);
            }
          }} 
          hitSlop={12} 
          style={styles.iconButton}
        >
          <ArrowLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {worker?.name ? `${worker.name}'s Work` : 'Portfolio'}
        </Text>
        <View style={styles.rightHeader}>
          <Text style={styles.countText}>{images.length} photos</Text>
        </View>
      </View>

      {/* FlashList Full Screen Grid */}
      <View style={styles.listContainer}>
        {(FlashList as any)({
          data: images,
          renderItem: renderItem,
          keyExtractor: (item: any) => item.id,
          numColumns: 3,
          estimatedItemSize: cellSize,
          contentContainerStyle: styles.listContent,
          ListEmptyComponent: renderEmpty,
        })}
      </View>

      <ImageViewer
        images={images}
        initialIndex={viewerStartIndex}
        isVisible={viewerVisible}
        onClose={() => setViewerVisible(false)}
      />
    </SafeAreaView>
  );
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.bgApp,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: Platform.OS === 'ios' ? 44 : 56,
    backgroundColor: colors.bgCard,
    zIndex: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.poppins.bold,
    fontSize: 22,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  rightHeader: {
    width: 60,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  countText: {
    fontFamily: fonts.inter.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 4,
  },
  cellWrapper: {
    padding: 2, // Half of the 4px gap
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.jakarta.regular,
    fontSize: 16,
    color: colors.textMuted,
  },
});
