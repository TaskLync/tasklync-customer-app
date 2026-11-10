import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Banknote, ShieldCheck } from 'lucide-react-native';
import { Quote } from '../../types/customRequest.types';
import { typography } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface QuoteBreakdownCardProps {
  quote: Quote;
}

export function QuoteBreakdownCard({ quote }: QuoteBreakdownCardProps) {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const formattedWorkPrice = Number(quote.work_price || 0).toLocaleString();
  const formattedInspectionFee = Number(quote.inspection_fee || 0).toLocaleString();
  const formattedSubtotal = Number(quote.subtotal || 0).toLocaleString();
  const formattedPlatformFee = Number(quote.customer_platform_fee || 0).toLocaleString();
  const formattedTotal = Number(quote.total_price || 0).toLocaleString();

  return (
    <View style={styles.container}>
      <Text style={styles.cardTitle}>Price Breakdown</Text>

      {/* Labor / Work Price */}
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Work & Labor Charges</Text>
        <Text style={styles.rowValue}>PKR {formattedWorkPrice}</Text>
      </View>

      {/* Diagnostic / Inspection Fee */}
      {Number(quote.inspection_fee) > 0 && (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Inspection & Diagnostic Fee</Text>
          <Text style={styles.rowValue}>PKR {formattedInspectionFee}</Text>
        </View>
      )}

      {/* Subtotal */}
      <View style={styles.subtotalRow}>
        <Text style={styles.subtotalLabel}>Subtotal</Text>
        <Text style={styles.subtotalValue}>PKR {formattedSubtotal}</Text>
      </View>

      {/* Platform Fee */}
      <View style={styles.row}>
        <View style={styles.feeLabelWrap}>
          <Text style={styles.rowLabel}>TaskLync Platform Fee (5%)</Text>
          <ShieldCheck size={13} color={palette.green600} style={{ marginLeft: 4 }} />
        </View>
        <Text style={styles.rowValue}>PKR {formattedPlatformFee}</Text>
      </View>

      <View style={styles.divider} />

      {/* Total Payable */}
      <View style={styles.totalRow}>
        <View>
          <Text style={styles.totalLabel}>Total Customer Payable</Text>
          <Text style={styles.totalSubtext}>Inclusive of all fees & taxes</Text>
        </View>
        <Text style={styles.totalValue}>PKR {formattedTotal}</Text>
      </View>

      {/* COD Payment Badge */}
      <View style={styles.codBadge}>
        <Banknote size={16} color={colors.textGreen} />
        <Text style={styles.codBadgeText}>
          Cash on Delivery (COD) — Pay directly to technician upon job completion
        </Text>
      </View>
    </View>
  );
}

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    paddingVertical: 16,
    marginBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cardTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: palette.gray900,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  feeLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowLabel: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: palette.gray600,
  },
  rowValue: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: palette.gray900,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: 4,
  },
  subtotalLabel: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: palette.gray800,
  },
  subtotalValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: palette.gray900,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  totalLabel: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
    color: palette.gray900,
  },
  totalSubtext: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
    color: palette.gray400,
    marginTop: 1,
  },
  totalValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: palette.green600,
  },
  codBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    marginTop: 12,
  },
  codBadgeText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 11,
    color: colors.textGreen,
    marginLeft: 8,
    flex: 1,
    lineHeight: 15,
  },
});
