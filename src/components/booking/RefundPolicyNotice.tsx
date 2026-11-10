import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { RefundPolicyResult } from '../../types/booking.types';
import { fontFamily, fontSize, radius, spacing } from '../../design';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface RefundPolicyNoticeProps {
  policy: RefundPolicyResult;
  currency?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * RefundPolicyNotice Component (Ultra-Minimalist Uber/Foodpanda Style)
 *
 * Strips all extra paragraphs, nested containers, and duplicate badges.
 * Displays only the essential financial reality: refund percentage and exact amount.
 */
export const RefundPolicyNotice: React.FC<RefundPolicyNoticeProps> = ({
  policy,
  currency = 'PKR',
  style,
}) => {
  const styles = useThemedStyles(createStyles);
  const isFullRefund = policy.percentage === 100;
  const isPartialRefund = policy.percentage > 0 && policy.percentage < 100;

  const refundAmount =
    policy.estimatedRefundAmount !== undefined && policy.estimatedRefundAmount > 0
      ? policy.estimatedRefundAmount
      : null;

  const formattedAmount = refundAmount ? `${currency} ${refundAmount.toLocaleString()}` : null;

  const refundLabel = isFullRefund
    ? '100% Refund'
    : isPartialRefund
    ? `${policy.percentage}% Refund`
    : 'No Refund';

  return (
    <View
      style={[
        styles.row,
        isFullRefund && styles.rowFull,
        isPartialRefund && styles.rowPartial,
        policy.percentage === 0 && styles.rowNone,
        style,
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`Refund: ${refundLabel}${formattedAmount ? `, ${formattedAmount}` : ''}`}
    >
      <View style={styles.labelCol}>
        <View style={[styles.dot, isFullRefund && styles.dotFull, isPartialRefund && styles.dotPartial]} />
        <Text style={[styles.labelText, isFullRefund && styles.labelTextFull]}>
          {refundLabel}
        </Text>
      </View>

      {formattedAmount ? (
        <Text style={[styles.amountText, isFullRefund && styles.amountTextFull]}>
          {formattedAmount}
        </Text>
      ) : null}
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: radius.md,
    backgroundColor: palette.gray50,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  rowFull: {
    backgroundColor: palette.green50,
    borderColor: palette.green200,
  },
  rowPartial: {
    backgroundColor: palette.amberLight,
    borderColor: palette.amberBorder,
  },
  rowNone: {
    backgroundColor: palette.dangerLight,
    borderColor: colors.borderErrorLight,
  },
  labelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
  dotFull: {
    backgroundColor: palette.green500,
  },
  dotPartial: {
    backgroundColor: palette.warning,
  },
  labelText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: fontSize.body2,
    color: colors.textPrimary,
  },
  labelTextFull: {
    color: palette.green800,
  },
  amountText: {
    fontFamily: fontFamily.inter.bold,
    fontSize: fontSize.body1,
    color: colors.textPrimary,
  },
  amountTextFull: {
    color: palette.green700,
  },
});
