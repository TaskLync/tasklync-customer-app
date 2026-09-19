import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../ui/Skeleton/Skeleton';

export const SkeletonConversationRow: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Avatar skeleton */}
      <Skeleton width={50} height={50} borderRadius={25} style={styles.avatar} />

      {/* Content lines skeleton */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Skeleton width={130} height={15} borderRadius={4} />
          <Skeleton width={48} height={11} borderRadius={4} />
        </View>

        <View style={styles.metaRow}>
          <Skeleton width={90} height={12} borderRadius={4} />
        </View>

        <View style={styles.bottomRow}>
          <Skeleton width="82%" height={13} borderRadius={4} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    marginRight: 14,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
