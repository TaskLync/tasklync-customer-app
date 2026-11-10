import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { fontFamily } from '../../design';
import { buildBreakdownRows, formatRs, type BreakdownInput } from '../../utils/offers';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface PriceBreakdownProps extends BreakdownInput {
  style?: StyleProp<ViewStyle>;
  /** Visual density: 'summary' matches the checkout card, 'bill' matches the booking-details bill. */
  variant?: 'summary' | 'bill';
}

/**
 * Line items of a discounted price (the total is rendered by the caller).
 *   Platform coupon:   Subtotal, Platform fee, Discount
 *   Worker promotion:  Platform fee, You saved   (the lines would not reconcile, so no subtotal)
 * Every amount is a server value; nothing is computed here.
 */
export const PriceBreakdown: React.FC<PriceBreakdownProps> = ({
  style,
  variant = 'summary',
  ...input
}) => {
  const styles = useThemedStyles(createStyles);
  const { subtotalBeforeDiscount, platformFee, discountAmount, funding } = input;
  const rows = useMemo(
    () => buildBreakdownRows({ subtotalBeforeDiscount, platformFee, discountAmount, funding }),
    [subtotalBeforeDiscount, platformFee, discountAmount, funding]
  );
  if (rows.length === 0) return null;

  const compact = variant === 'bill';

  return (
    <View style={style}>
      {rows.map((row) => {
        const isGood = row.kind === 'discount' || row.kind === 'saving';
        const text =
          row.kind === 'discount' ? `- ${formatRs(Math.abs(row.amount))}` : formatRs(row.amount);
        return (
          <View key={row.key} style={[styles.row, compact && styles.rowCompact]}>
            <Text style={[styles.label, compact && styles.labelCompact, isGood && styles.goodLabel]}>
              {row.label}
            </Text>
            <Text style={[styles.value, compact && styles.valueCompact, isGood && styles.goodValue]}>
              {text}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowCompact: {
    paddingVertical: 0,
    marginTop: 8,
  },
  labelCompact: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12.5,
  },
  valueCompact: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 12.5,
  },
  label: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  value: {
    fontFamily: fontFamily.inter.medium,
    fontSize: 14,
    color: colors.textPrimary,
  },
  goodLabel: {
    fontFamily: fontFamily.jakarta.semiBold,
    color: palette.green700,
  },
  goodValue: {
    fontFamily: fontFamily.inter.semiBold,
    color: palette.green700,
  },
});
