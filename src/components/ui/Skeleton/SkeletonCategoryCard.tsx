import { StyleSheet, View } from 'react-native';
import { Skeleton, SkeletonText } from './Skeleton';

/** Mirrors ServiceCategoryCard: 76px column, 68px tile (r20), 14.5px label 10px below. */
export const SkeletonCategoryCard = () => (
  <View style={styles.container}>
    <Skeleton width={68} height={68} borderRadius={20} />
    <SkeletonText fontSize={14.5} lineHeight={20} width={52} style={styles.label} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 76,
  },
  label: {
    marginTop: 10,
    alignItems: 'center',
  },
});
