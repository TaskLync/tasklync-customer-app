import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fontFamily, fontSize, spacing } from '../../design';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';
import { platformFeeLabel, platformFeeValue, taxLabel } from '../../utils/feeDisplay';

export interface InvoiceFeeBreakdownProps {
  subtotal: number;
  platformFee: number;
  platformFeePercent?: number | null | undefined;
  taxAmount?: number | undefined;
  taxName?: string | null | undefined;
  taxPercent?: number | null | undefined;
  discount?: number | undefined;
  total: number;
  currency?: string;
}

/**
 * InvoiceFeeBreakdown Component
 *
 * Implements Serial Position & Visual Dominance:
 * - Clear subtotal & platform escrow fee math
 * - Total rendered last in dominant Inter Bold and Primary Dark
 */
export const InvoiceFeeBreakdown: React.FC<InvoiceFeeBreakdownProps> = ({
  subtotal,
  platformFee,
  platformFeePercent,
  taxAmount,
  taxName,
  taxPercent,
  discount,
  total,
  currency = 'PKR',
}) => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      {/* Subtotal */}
      <View style={styles.row}>
        <Text style={styles.label}>Service Subtotal</Text>
        <Text style={styles.value}>
          {currency} {subtotal.toLocaleString()}
        </Text>
      </View>

      {/* Platform Fee: "FREE" only because the booking's snapshot recorded 0 */}
      <View style={styles.row}>
        <Text style={styles.label}>{platformFeeLabel(platformFeePercent)}</Text>
        <Text style={styles.value}>
          {platformFeeValue(platformFee, (n) => `${currency} ${n.toLocaleString()}`)}
        </Text>
      </View>

      {/* Tax: shown only when the booking was charged tax */}
      {taxAmount && taxAmount > 0 ? (
        <View style={styles.row}>
          <Text style={styles.label}>{taxLabel(taxName, taxPercent)}</Text>
          <Text style={styles.value}>
            {currency} {taxAmount.toLocaleString()}
          </Text>
        </View>
      ) : null}

      {/* Discount if applicable */}
      {discount && discount > 0 ? (
        <View style={styles.row}>
          <Text style={[styles.label, styles.discountText]}>Promotional Discount</Text>
          <Text style={[styles.value, styles.discountText]}>
            -{currency} {discount.toLocaleString()}
          </Text>
        </View>
      ) : null}

      <View style={styles.totalDivider} />

      {/* Total - Visually Dominant Final Element */}
      <View style={styles.totalRow}>
        <View>
          <Text style={styles.totalLabel}>Total Amount Paid</Text>
          <Text style={styles.totalSubtext}>Inclusive of all applicable fees</Text>
        </View>
        <Text style={styles.totalValue}>
          {currency} {total.toLocaleString()}
        </Text>
      </View>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  label: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.body2,
    color: colors.textSecondary,
  },
  value: {
    fontFamily: fontFamily.inter.medium,
    fontSize: fontSize.dataMD - 1,
    color: colors.textPrimary,
  },
  discountText: {
    color: colors.primaryDark,
  },
  totalDivider: {
    height: 1.5,
    backgroundColor: colors.border,
    marginTop: spacing.sm + 2,
    marginBottom: spacing.sm + 4,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  totalLabel: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body1,
    color: colors.textPrimary,
  },
  totalSubtext: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.nano + 0.5,
    color: colors.textMuted,
  },
  totalValue: {
    fontFamily: fontFamily.inter.bold,
    fontSize: fontSize.h3,
    color: colors.primaryDark,
  },
});
