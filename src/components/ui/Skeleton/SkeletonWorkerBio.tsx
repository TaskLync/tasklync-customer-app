import { StyleSheet } from 'react-native';
import { SkeletonGroup, SkeletonText } from './Skeleton';

/** "About" section: 17/22 title, then the bio clamped to 4 lines of 14/22. */
export const SkeletonWorkerBio = () => (
  <SkeletonGroup accessibilityLabel="Loading about">
    <SkeletonText fontSize={17} lineHeight={22} width={64} style={styles.title} />
    <SkeletonText fontSize={14} lineHeight={22} width="96%" lines={4} lastLineWidth="48%" />
  </SkeletonGroup>
);

const styles = StyleSheet.create({
  title: {
    marginBottom: 12,
  },
});
