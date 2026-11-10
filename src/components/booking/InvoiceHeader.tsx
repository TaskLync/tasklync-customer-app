import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { fontFamily, fontSize, radius, spacing } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface InvoiceHeaderProps {
  invoiceNumber: string;
  issuedAt: string;
  status?: 'PAID' | 'PENDING' | 'REFUNDED';
}

/**
 * InvoiceHeader Component
 *
 * Implements Aesthetic-Usability Effect:
 * - Brand wordmark "TASKLYNC" in bold Poppins
 * - Official Reference Invoice Number in Inter SemiBold
 * - Formatted issue timestamp in Inter Regular
 * - Verified Escrow Status pill
 */
export const InvoiceHeader: React.FC<InvoiceHeaderProps> = ({
  invoiceNumber,
  issuedAt,
  status = 'PAID',
}) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const formattedDate = React.useMemo(() => {
    try {
      const d = new Date(issuedAt);
      if (isNaN(d.getTime())) return issuedAt;
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return issuedAt;
    }
  }, [issuedAt]);

  const isPaid = status === 'PAID';
  const isRefunded = status === 'REFUNDED';

  return (
    <View style={styles.container}>
      {/* Top Brand Bar */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.brandTitle}>TASKLYNC</Text>
          <Text style={styles.brandSubtitle}>Official Service Receipt</Text>
        </View>

        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            isPaid && styles.statusBadgePaid,
            isRefunded && styles.statusBadgeRefunded,
          ]}
        >
          <ShieldCheck
            size={14}
            color={isPaid ? colors.primaryDark : isRefunded ? palette.warningDark : colors.textSecondary}
          />
          <Text
            style={[
              styles.statusText,
              isPaid && styles.statusTextPaid,
              isRefunded && styles.statusTextRefunded,
            ]}
          >
            {status}
          </Text>
        </View>
      </View>

      {/* Invoice Meta Row */}
      <View style={styles.metaRow}>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>INVOICE NO.</Text>
          <Text style={styles.metaValue}>{invoiceNumber}</Text>
        </View>

        <View style={[styles.metaCol, styles.metaColRight]}>
          <Text style={styles.metaLabel}>DATE ISSUED</Text>
          <Text style={styles.metaValue}>{formattedDate}</Text>
        </View>
      </View>

      <View style={styles.divider} />
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  brandTitle: {
    fontFamily: fontFamily.poppins.bold,
    fontSize: fontSize.h3,
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginTop: -2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs / 2 + 2,
    borderRadius: radius.pill,
    backgroundColor: palette.gray100,
    gap: 4,
  },
  statusBadgePaid: {
    backgroundColor: palette.green50,
    borderWidth: 1,
    borderColor: palette.green200,
  },
  statusBadgeRefunded: {
    backgroundColor: palette.warningLight,
    borderWidth: 1,
    borderColor: palette.warning,
  },
  statusText: {
    fontFamily: fontFamily.inter.bold,
    fontSize: fontSize.dataXS,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  statusTextPaid: {
    color: colors.primaryDark,
  },
  statusTextRefunded: {
    color: palette.warningDark,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  metaCol: {
    flex: 1,
  },
  metaColRight: {
    alignItems: 'flex-end',
  },
  metaLabel: {
    fontFamily: fontFamily.inter.semiBold,
    fontSize: fontSize.nano + 0.5,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontFamily: fontFamily.inter.semiBold,
    fontSize: fontSize.dataSM + 0.5,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: spacing.md,
  },
});
