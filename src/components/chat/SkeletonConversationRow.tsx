import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonCircle, SkeletonGroup, SkeletonText } from '../ui/Skeleton/Skeleton';

/**
 * Mirrors ConversationRow: 20px gutters, 14px vertical padding, 50px avatar, then
 * name (16/22) + timestamp, category line (13/17) and the last-message preview (14/19).
 */
export const SkeletonConversationRow: React.FC = () => (
  <SkeletonGroup style={styles.row} accessibilityLabel="Loading conversation">
    <SkeletonCircle size={50} style={styles.avatar} />
    <View style={styles.content}>
      <View style={styles.topRow}>
        <SkeletonText fontSize={16} lineHeight={22} width={128} />
        <SkeletonText fontSize={12} lineHeight={16} width={40} />
      </View>
      <SkeletonText fontSize={13} lineHeight={17} width={92} style={styles.meta} />
      <SkeletonText fontSize={14} lineHeight={19} width="84%" />
    </View>
  </SkeletonGroup>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  avatar: {
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  meta: {
    marginBottom: 4,
  },
});
