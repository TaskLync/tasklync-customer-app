import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';

export const SkeletonReviewSummary = () => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.leftCol}>
          <Skeleton width={130} height={18} style={{ marginBottom: 6 }} />
          <View style={styles.ratingMetaRow}>
            <Skeleton width={26} height={18} style={{ marginRight: 6 }} />
            <Skeleton width={88} height={14} style={{ marginRight: 6 }} />
            <Skeleton width={68} height={14} />
          </View>
        </View>
        <Skeleton width={52} height={16} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftCol: {
    flex: 1,
  },
  ratingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
