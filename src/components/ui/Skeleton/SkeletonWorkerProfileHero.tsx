import { StyleSheet, View } from 'react-native';
import { SkeletonCircle, SkeletonGroup, SkeletonText } from './Skeleton';

/**
 * Identity block of WorkerProfileHeader (avatar 76, name 21/27, subtitle 13.5, rating line).
 * The nav bar is NOT a placeholder — screens render their real back button while loading.
 */
export const SkeletonWorkerProfileHero = () => (
  <SkeletonGroup style={styles.row} accessibilityLabel="Loading profile">
    <SkeletonCircle size={76} />
    <View style={styles.info}>
      <SkeletonText fontSize={21} lineHeight={27} width="62%" />
      <SkeletonText fontSize={13.5} lineHeight={19} width="44%" style={styles.subtitle} />
      <SkeletonText fontSize={13} lineHeight={18} width="34%" style={styles.rating} />
    </View>
  </SkeletonGroup>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  info: {
    flex: 1,
    marginLeft: 16,
  },
  subtitle: {
    marginTop: 2,
  },
  rating: {
    marginTop: 6,
  },
});
