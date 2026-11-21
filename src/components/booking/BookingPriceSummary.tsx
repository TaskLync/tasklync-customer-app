import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EscrowNote } from '../cart/EscrowNote';
import { Skeleton, SkeletonGroup } from '../ui/Skeleton/Skeleton';
import { fontFamily } from '../../design';
import { formatRs, type PriceSummaryRow } from '../../utils/offers';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';
import { useAppTheme } from '../../theme/useAppTheme';

export interface BookingPriceSummaryProps {
  /** Built by buildPriceSummaryRows() from server values. */
  rows: PriceSummaryRow[];
  /** Server total payable (already discounted). */
  total: number;
  /** The price is being (re)calculated by the server: show a placeholder instead of a stale number. */
  loading?: boolean;
  /** Escrow reassurance is for checkout only. */
  showEscrowNote?: boolean;
}

/** The rows alone (no card, no total): for screens that already own the card and the total row. */
export const PriceSummaryRows: React.FC<{ rows: PriceSummaryRow[]; compact?: boolean }> = ({ rows, compact = false }) => {
  const styles = useThemedStyles(createStyles);
  const { palette } = useAppTheme();
  return (
    <>
      {rows.map((row) => {
        const good = row.kind === 'discount';
        return (
          <View key={row.key} style={[styles.row, compact && styles.rowCompact]}>
            <View style={styles.labelCol}>
              <Text style={[styles.label, good && { color: palette.green700 }]} numberOfLines={1}>
                {row.label}
              </Text>
              {row.hint ? <Text style={styles.hint}>{row.hint}</Text> : null}
            </View>
            <Text style={[styles.value, good && { color: palette.green700 }]}>
              {row.display ?? (good ? `- ${formatRs(Math.abs(row.amount))}` : formatRs(row.amount))}
            </Text>
          </View>
        );
      })}
    </>
  );
};

/** Original price → discount → platform fee → total. Used by checkout. Flat: the screen owns the section and its label. */
export const BookingPriceSummary: React.FC<BookingPriceSummaryProps> = ({
  rows,
  total,
  loading = false,
  showEscrowNote = true,
}) => {
  const styles = useThemedStyles(createStyles);

  if (loading) {
    return (
      <SkeletonGroup style={styles.card} accessibilityLabel="Calculating price">
        <Skeleton height={14} borderRadius={6} style={styles.skRow} />
        <Skeleton height={14} borderRadius={6} style={styles.skRow} />
        <Skeleton height={22} borderRadius={6} style={styles.skTotal} />
      </SkeletonGroup>
    );
  }

  return (
    <View style={styles.card}>
      <PriceSummaryRows rows={rows} compact />
      <View style={styles.totalRow} accessible accessibilityLabel={`Total payable ${formatRs(total)}`}>
        <Text style={styles.totalLabel}>Total payable</Text>
        <Text style={styles.totalAmount}>{formatRs(total)}</Text>
      </View>
      {showEscrowNote ? <EscrowNote /> : null}
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  card: {
    width: '100%',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 12,
  },
  totalLabel: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  totalAmount: {
    fontFamily: fontFamily.inter.semiBold,
    fontSize: 20,
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: 12,
  },
  rowCompact: {
    paddingVertical: 4,
  },
  labelCol: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  hint: {
    marginTop: 1,
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  value: {
    fontFamily: fontFamily.inter.medium,
    fontSize: 14,
    color: colors.textPrimary,
  },
  skRow: {
    marginVertical: 7,
  },
  skTotal: {
    marginTop: 14,
  },
});
