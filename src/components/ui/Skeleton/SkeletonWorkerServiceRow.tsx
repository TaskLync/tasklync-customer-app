import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton, SkeletonGroup, SkeletonText, SKELETON } from './Skeleton';

/**
 * Mirrors WorkerServiceRow: name 15/20, meta 12.5, price 15 below, Add pill (80×32) right.
 * Text is flush with the section title (the real row's tinted surface bleeds into the gutter).
 */
export const SkeletonWorkerServiceRow: React.FC = () => (
  <SkeletonGroup style={styles.row} accessibilityLabel="Loading service">
    <View style={styles.left}>
      <SkeletonText fontSize={15} lineHeight={20} width="72%" />
      <SkeletonText fontSize={12.5} lineHeight={17} width="36%" style={styles.meta} />
      <SkeletonText fontSize={15} lineHeight={20} width={64} style={styles.price} />
    </View>
    <Skeleton width={80} height={32} borderRadius={SKELETON.radius.pill} />
  </SkeletonGroup>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  left: {
    flex: 1,
    paddingRight: 12,
  },
  meta: {
    marginTop: 2,
  },
  price: {
    marginTop: 6,
  },
});
