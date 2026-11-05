import { StyleSheet, View } from 'react-native';
import { SkeletonGroup, SkeletonText } from './Skeleton';

/** ReviewSummary header: "Reviews" title, score · stars · count line, "See all" on the right. */
export const SkeletonReviewSummary = () => (
  <SkeletonGroup style={styles.row} accessibilityLabel="Loading reviews">
    <View style={styles.left}>
      <SkeletonText fontSize={17} lineHeight={22} width={76} style={styles.title} />
      <View style={styles.meta}>
        <SkeletonText fontSize={16} lineHeight={20} width={26} />
        <SkeletonText fontSize={14} lineHeight={20} width={78} />
        <SkeletonText fontSize={13} lineHeight={20} width={64} />
      </View>
    </View>
    <SkeletonText fontSize={13} lineHeight={18} width={48} />
  </SkeletonGroup>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginBottom: 4,
  },
  left: {
    flex: 1,
  },
  title: {
    marginBottom: 2,
  },
  meta: {
    flexDirection: 'row',
    gap: 6,
  },
});
