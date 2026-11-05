import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton, SkeletonGroup, SkeletonText, SKELETON } from '../ui/Skeleton/Skeleton';
import { colors } from '../../design/colors';

/**
 * Mirrors CartItem: flat row (16px vertical padding, hairline divider) with the service name
 * (14/20), price below, and the QuantityStepper pill (≈92×36) on the right.
 */
export const CartSkeletonItem: FC = () => (
  <SkeletonGroup style={styles.row} accessibilityLabel="Loading cart item">
    <View style={styles.info}>
      <SkeletonText fontSize={14} lineHeight={20} width="62%" style={styles.name} />
      <SkeletonText fontSize={14} lineHeight={19} width={70} />
    </View>
    <Skeleton width={92} height={36} borderRadius={SKELETON.radius.pill} />
  </SkeletonGroup>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  info: {
    flex: 1,
    paddingRight: 12,
  },
  name: {
    marginBottom: 4,
  },
});
