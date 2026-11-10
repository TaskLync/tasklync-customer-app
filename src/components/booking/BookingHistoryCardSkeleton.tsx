import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonCircle, SkeletonGroup, SkeletonText } from '../ui/Skeleton/Skeleton';
import { spacing } from '../../design/spacing';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

/**
 * Mirrors BookingHistoryCard: flat 76px row — 42px service icon, worker name (15/20),
 * service line (12/16), status (11), and amount (15/20) over date (12/16) on the right.
 */
export const BookingHistoryCardSkeleton: React.FC = () => {
  const styles = useThemedStyles(createStyles);
  return (
  <SkeletonGroup style={styles.card} accessibilityLabel="Loading booking">
    <SkeletonCircle size={42} style={styles.icon} />
    <View style={styles.middle}>
      <SkeletonText fontSize={15} lineHeight={20} width="58%" />
      <SkeletonText fontSize={12} lineHeight={16} width="42%" style={styles.subtitle} />
      <SkeletonText fontSize={11} lineHeight={15} width={64} style={styles.status} />
    </View>
    <View style={styles.right}>
      <SkeletonText fontSize={15} lineHeight={20} width={62} />
      <SkeletonText fontSize={12} lineHeight={16} width={44} style={styles.date} />
    </View>
  </SkeletonGroup>
);
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  card: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  icon: {
    marginRight: spacing.md,
  },
  middle: {
    flex: 1,
    marginRight: spacing.sm,
  },
  subtitle: {
    marginTop: 1,
  },
  status: {
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  date: {
    marginTop: 3,
    alignItems: 'flex-end',
  },
});
