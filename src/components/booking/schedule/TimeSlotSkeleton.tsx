import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../../ui/Skeleton/Skeleton';

/** Mirrors TimeSlotChip: 31.5% column, 44px tall, r14, 10px row gap. Render inside a SkeletonGroup. */
export const TimeSlotSkeleton: React.FC = () => (
  <View style={styles.chipWrapper}>
    <Skeleton height={44} borderRadius={14} />
  </View>
);

const styles = StyleSheet.create({
  chipWrapper: {
    width: '31.5%',
    marginBottom: 10,
  },
});
