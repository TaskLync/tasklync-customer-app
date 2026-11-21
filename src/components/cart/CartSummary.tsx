import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { PriceSummaryRow } from './PriceSummaryRow';
import { CartTotalRow } from './CartTotalRow';
import { EscrowNote } from './EscrowNote';
import { CartTotals } from '../../hooks/useCartTotals';
import { usePricingConfig } from '../../hooks/usePricingConfig';
import { platformFeeLabel, taxLabel } from '../../utils/feeDisplay';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface CartSummaryProps {
  totals: CartTotals;
}

/**
 * Cart summary. The app never calculates a fee or tax: it shows the ACTIVE admin setting as a label
 * ("FREE", or "5% · added at checkout"), and the exact amounts come from the server at checkout.
 */
export const CartSummary: FC<CartSummaryProps> = ({ totals }) => {
  const styles = useThemedStyles(createStyles);
  const { data: cfg } = usePricingConfig();

  const feeOn = cfg?.customerFeeEnabled === true;
  const taxOn = cfg?.taxEnabled === true;
  const extraAtCheckout = feeOn || taxOn;

  return (
    <View style={styles.card}>
      <PriceSummaryRow label="Subtotal" amount={totals.subtotal} />
      {cfg ? (
        <PriceSummaryRow
          label={platformFeeLabel(feeOn ? cfg.customerFeePercent : null)}
          amount={0}
          display={feeOn ? 'Added at checkout' : 'FREE'}
        />
      ) : null}
      {cfg && taxOn ? (
        <PriceSummaryRow label={taxLabel(cfg.taxLabel, cfg.taxPercent)} amount={0} display="Added at checkout" />
      ) : null}
      <CartTotalRow total={totals.subtotal} label={extraAtCheckout ? 'Service total' : 'Total Payable'} />
      <EscrowNote />
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  card: {
    backgroundColor: colors.bgSection,
    borderRadius: 14,
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 18,
  },
});
