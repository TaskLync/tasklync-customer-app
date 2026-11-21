import { StyleSheet, View } from 'react-native';
import { Skeleton, SkeletonText } from './Skeleton';

interface SkeletonCategoryCardProps {
  width?: number;
  tileSize?: number;
  tileRadius?: number;
}

/** Mirrors ServiceCategoryCard: a slot with a centred tile and a 14.5px label 10px below. */
export const SkeletonCategoryCard = ({ width = 76, tileSize = 68, tileRadius = 20 }: SkeletonCategoryCardProps) => (
  <View style={[styles.container, { width }]}>
    <Skeleton width={tileSize} height={tileSize} borderRadius={tileRadius} />
    <SkeletonText fontSize={14.5} lineHeight={20} width={52} style={styles.label} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    marginTop: 10,
    alignItems: 'center',
  },
});
