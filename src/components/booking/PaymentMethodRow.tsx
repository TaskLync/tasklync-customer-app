import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CreditCard, Banknote, Wallet, CheckCircle2 } from 'lucide-react-native';
import { InvoicePaymentMethodData } from '../../types/booking.types';
import { colors, palette, fontFamily, fontSize, radius, spacing } from '../../design';

export interface PaymentMethodRowProps {
  paymentMethod: InvoicePaymentMethodData;
  paidAt?: string | undefined;
}

/**
 * PaymentMethodRow Component
 *
 * Implements Recognition over Recall:
 * - Displays masked card last-4 or payment instrument type
 * - Matches visual tokens established during checkout
 * - Shows clear payment settled timestamp
 */
export const PaymentMethodRow: React.FC<PaymentMethodRowProps> = ({
  paymentMethod,
  paidAt,
}) => {
  const formattedPaidTime = React.useMemo(() => {
    if (!paidAt) return 'Payment Settled';
    try {
      const d = new Date(paidAt);
      if (isNaN(d.getTime())) return paidAt;
      return `Paid on ${d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })} at ${d.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } catch {
      return paidAt;
    }
  }, [paidAt]);

  const renderIcon = () => {
    if (paymentMethod.type === 'card') {
      return <CreditCard size={20} color={colors.primaryDark} />;
    }
    if (paymentMethod.type === 'wallet') {
      return <Wallet size={20} color={palette.infoDark} />;
    }
    return <Banknote size={20} color={colors.primaryDark} />;
  };

  const getLabel = () => {
    if (paymentMethod.type === 'card') {
      const brand = (paymentMethod.brand || 'Card').toUpperCase();
      const last4 = paymentMethod.last4 ? `•••• ${paymentMethod.last4}` : '';
      return `${brand} ${last4}`.trim();
    }
    if (paymentMethod.type === 'wallet') {
      return 'Mobile Wallet (JazzCash / EasyPaisa)';
    }
    return 'Cash on Delivery (Direct Payment)';
  };

  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>{renderIcon()}</View>

      <View style={styles.infoCol}>
        <View style={styles.headlineRow}>
          <Text style={styles.methodLabel}>{getLabel()}</Text>
          <CheckCircle2 size={15} color={colors.primary} />
        </View>
        <Text style={styles.dateText}>{formattedPaidTime}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.gray50,
    borderRadius: radius.md,
    padding: spacing.md - 2,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.md - 2,
  },
  infoCol: {
    flex: 1,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  methodLabel: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: fontSize.body2,
    color: colors.textPrimary,
  },
  dateText: {
    fontFamily: fontFamily.inter.regular,
    fontSize: fontSize.dataXS,
    color: colors.textMuted,
  },
});
