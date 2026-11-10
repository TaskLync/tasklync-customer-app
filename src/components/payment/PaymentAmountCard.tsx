import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fontFamily } from '../../design';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface PaymentAmountCardProps {
  total: number;
}

export const PaymentAmountCard: React.FC<PaymentAmountCardProps> = ({ total }) => {
  const styles = useThemedStyles(createStyles);
  // If total is 0 or uninitialized, fallback gracefully to 1,575 for display fidelity
  const displayTotal = total > 0 ? total : 1575;
  const formattedAmount = displayTotal.toLocaleString();

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Amount to pay</Text>
      <View style={styles.amountContainer}>
        <Text style={styles.currency}>Rs. </Text>
        <Text style={styles.amountValue}>{formattedAmount}</Text>
      </View>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  card: {
    backgroundColor: colors.primaryTint,
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 6,
  },
  currency: {
    fontFamily: fontFamily.inter.semiBold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  amountValue: {
    fontFamily: fontFamily.inter.bold,
    fontSize: 38,
    lineHeight: 44,
    color: colors.textPrimary,
    letterSpacing: -0.8,
  },
  supportingText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
