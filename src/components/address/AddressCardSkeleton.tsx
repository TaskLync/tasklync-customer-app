import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonCircle, SkeletonGroup, SkeletonText } from '../ui/Skeleton/Skeleton';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface AddressCardSkeletonProps {
  /** 'select' adds the radio placeholder used by AddressCard in selection mode. */
  variant?: 'manage' | 'select';
}

/**
 * Mirrors AddressCard: flat 68px row (14px vertical padding, hairline divider), 38px icon,
 * 15/20 label and 14/18 address line. Wrap several in one <SkeletonGroup> for a list.
 */
export const AddressCardSkeleton: React.FC<AddressCardSkeletonProps> = ({ variant = 'manage' }) => {
  const styles = useThemedStyles(createStyles);
  return (
  <SkeletonGroup style={styles.card} accessibilityLabel="Loading address">
    <View style={styles.row}>
      <SkeletonCircle size={38} style={styles.icon} />
      <View style={styles.text}>
        <SkeletonText fontSize={15} lineHeight={20} width={96} />
        <SkeletonText fontSize={14} lineHeight={18} width="82%" style={styles.subtitle} />
      </View>
      {variant === 'select' && <SkeletonCircle size={22} />}
    </View>
  </SkeletonGroup>
);
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  card: {
    minHeight: 68,
    paddingVertical: 14,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  text: {
    flex: 1,
    marginRight: 10,
  },
  subtitle: {
    marginTop: 2,
  },
});
