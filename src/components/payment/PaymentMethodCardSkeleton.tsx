import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton, SkeletonCircle, SkeletonGroup, SkeletonText } from '../ui/Skeleton/Skeleton';
import { radius } from '../../design/radius';
import { spacing } from '../../design/spacing';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

/**
 * Mirrors PaymentMethodCard: 70px bordered card (static shell) with the 36×24 brand icon,
 * 15/20 + 13/18 text lines and the trailing default chip / action.
 */
interface PaymentMethodCardSkeletonProps {
  /** 'card' = PaymentMethodCard (70px, default chip); 'picker' = PaymentMethodPicker row (72px, radio). */
  variant?: 'card' | 'picker';
}

export const PaymentMethodCardSkeleton: React.FC<PaymentMethodCardSkeletonProps> = ({
  variant = 'card',
}) => {
  const styles = useThemedStyles(createStyles);
  return (
  <View style={[styles.card, variant === 'picker' ? styles.picker : styles.methodCard]}>
    <SkeletonGroup style={styles.row} accessibilityLabel="Loading payment method">
      {variant === 'picker' ? (
        <Skeleton width={36} height={24} borderRadius={5} style={styles.icon} />
      ) : (
        <Skeleton width={42} height={42} borderRadius={12} style={styles.icon} />
      )}
      <View style={styles.text}>
        <SkeletonText fontSize={15} lineHeight={20} width="52%" />
        <SkeletonText
          fontSize={variant === 'picker' ? 12 : 13}
          lineHeight={variant === 'picker' ? 16 : 18}
          width="34%"
          style={styles.subtitle}
        />
      </View>
      {variant === 'picker' ? (
        <SkeletonCircle size={22} />
      ) : (
        <Skeleton width={52} height={21} borderRadius={6} />
      )}
    </SkeletonGroup>
  </View>
);
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  card: {
    height: 70,
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm + 2,
  },
  // Payment Methods screen card: matches PaymentMethodCard (72px, lifted surface, neutral chip).
  methodCard: {
    height: 72,
    backgroundColor: colors.cardRaised,
  },
  picker: {
    height: 72,
    marginBottom: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: spacing.md,
  },
  text: {
    flex: 1,
    marginRight: spacing.sm,
  },
  subtitle: {
    marginTop: 2,
  },
});
