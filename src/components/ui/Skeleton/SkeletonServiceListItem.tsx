import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton, SkeletonGroup, SkeletonText, SKELETON } from './Skeleton';
import { radius } from '../../../design/radius';

/**
 * Mirrors ServiceListItem (grid card): 170px media tile, two-line 14/20 name,
 * "From" + price stack and the 80×32 Add pill.
 */
export const SkeletonServiceListItem: React.FC = () => (
  <SkeletonGroup style={styles.container} accessibilityLabel="Loading service">
    <Skeleton width="100%" height={170} borderRadius={radius.lg} />
    <View style={styles.details}>
      <SkeletonText fontSize={14} lineHeight={20} width="90%" lines={2} lastLineWidth="55%" />
      <View style={styles.priceRow}>
        <View>
          <SkeletonText fontSize={11} lineHeight={15} width={30} />
          <SkeletonText fontSize={14} lineHeight={19} width={64} />
        </View>
        <Skeleton width={80} height={32} borderRadius={SKELETON.radius.pill} />
      </View>
    </View>
  </SkeletonGroup>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: 6,
    marginBottom: 16,
  },
  details: {
    padding: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
});
