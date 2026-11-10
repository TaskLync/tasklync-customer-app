import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EscrowNote } from '../cart/EscrowNote';
import { CartTotalRow } from '../cart/CartTotalRow';
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
              {good ? `- ${formatRs(Math.abs(row.amount))}` : formatRs(row.amount)}
            </Text>
          </View>
        );
      })}
    </>
  );
};

/** Original price → discount → platform fee → total. Used by checkout. */
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
        <Skeleton height={16} borderRadius={6} style={styles.skRow} />
        <Skeleton height={16} borderRadius={6} style={styles.skRow} />
        <Skeleton height={20} borderRadius={6} style={styles.skTotal} />
      </SkeletonGroup>
    );
  }

  return (
    <View style={styles.card}>
      <PriceSummaryRows rows={rows} />
      <CartTotalRow total={total} />
      {showEscrowNote ? <EscrowNote /> : null}
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  card: {
    backgroundColor: colors.bgSection,
    borderRadius: 14,
    padding: 18,
    marginTop: 8,
    marginBottom: 16,
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
