import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';
import { radius } from '@design/radius';
import { shadows } from '@design/shadows';
import { colors } from '@design/colors';

/**
 * Mirrors <ReviewCard /> (16px padding, lg radius, border, sm shadow) so loading
 * state matches the real list. Spacing between cards is owned by the parent (`gap`).
 */
export const SkeletonReviewCard = () => {
  return (
    <View style={styles.container}>
      <View style={styles.metaRow}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={styles.metaText}>
          <Skeleton width={120} height={13} style={{ marginBottom: 4 }} />
          <Skeleton width={50} height={11} />
        </View>
      </View>

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} width={16} height={16} borderRadius={8} style={{ marginRight: 2 }} />
        ))}
      </View>

      <View style={styles.commentBlock}>
        <Skeleton width="100%" height={13} style={{ marginBottom: 6 }} />
        <Skeleton width="92%" height={13} style={{ marginBottom: 6 }} />
        <Skeleton width="62%" height={13} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: 10,
    justifyContent: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  commentBlock: {
    marginTop: 12,
  },
});
