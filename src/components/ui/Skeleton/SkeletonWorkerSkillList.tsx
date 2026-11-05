import { StyleSheet, View } from 'react-native';
import { Skeleton, SkeletonGroup, SkeletonText, SKELETON } from './Skeleton';

const CHIP_WIDTHS = [92, 116, 80, 104, 72];

/** "Skills & Expertise": title, then 30px chips wrapping with an 8px gap. */
export const SkeletonWorkerSkillList = () => (
  <SkeletonGroup accessibilityLabel="Loading skills">
    <SkeletonText fontSize={17} lineHeight={22} width={140} style={styles.title} />
    <View style={styles.grid}>
      {CHIP_WIDTHS.map((w) => (
        <Skeleton key={w} width={w} height={30} borderRadius={SKELETON.radius.pill} />
      ))}
    </View>
  </SkeletonGroup>
);

const styles = StyleSheet.create({
  title: {
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
