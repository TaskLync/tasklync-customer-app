import { View, Text, StyleSheet } from 'react-native';
import { Quote } from '../../types/customRequest.types';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';
import { platformFeeLabel, platformFeeValue, taxAmountOf, taxLabel } from '../../utils/feeDisplay';

interface QuoteBreakdownCardProps {
  quote: Quote;
}

const money = (currency: string, value: number) => `${currency} ${Math.round(value).toLocaleString()}`;

/**
 * Price section: the total to pay is the hero, the breakdown sits underneath.
 * Every number is the backend's own quote value (no client-side pricing). The fee percentage is
 * read off the backend's fee and subtotal so the label always matches what was actually charged.
 */
export function QuoteBreakdownCard({ quote }: QuoteBreakdownCardProps) {
  const styles = useThemedStyles(createStyles);
  const currency = quote.currency || 'PKR';
  const work = Number(quote.work_price || 0);
  const inspection = Number(quote.inspection_fee || 0);
  const subtotal = Number(quote.subtotal || 0);
  const fee = Number(quote.customer_platform_fee || 0);
  const total = Number(quote.total_price || 0);
  const tax = taxAmountOf(quote);
  // Prefer the percentage the server froze on the quote; older quotes fall back to fee / subtotal.
  const feePercent =
    quote.customer_fee_percent != null
      ? Number(quote.customer_fee_percent)
      : subtotal > 0 && fee > 0 ? Math.round((fee / subtotal) * 1000) / 10 : null;

  return (
    <View>
      <Text style={styles.totalLabel}>Total to pay</Text>
      <Text style={styles.totalValue} accessibilityLabel={`Total to pay ${money(currency, total)}`}>
        {money(currency, total)}
      </Text>

      <View style={styles.breakdown}>
        <Row label="Work charges" value={money(currency, work)} styles={styles} />
        {inspection > 0 ? (
          <>
            <Row label="Inspection fee" value={money(currency, inspection)} styles={styles} />
            <Row label="Subtotal" value={money(currency, subtotal)} styles={styles} />
          </>
        ) : null}
        <Row
          label={platformFeeLabel(feePercent)}
          value={platformFeeValue(fee, (n) => money(currency, n))}
          styles={styles}
        />
        {tax > 0 ? (
          <Row label={taxLabel(quote.tax_label, quote.tax_percent)} value={money(currency, tax)} styles={styles} />
        ) : null}
      </View>
    </View>
  );
}

function Row({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  totalLabel: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13.5,
    color: colors.textSecondary,
  },
  totalValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.6,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  breakdown: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  rowLabel: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
  rowValue: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});
