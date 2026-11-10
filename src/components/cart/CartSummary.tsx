import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { PriceSummaryRow } from './PriceSummaryRow';
import { CartTotalRow } from './CartTotalRow';
import { EscrowNote } from './EscrowNote';
import { CartTotals } from '../../hooks/useCartTotals';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface CartSummaryProps {
  totals: CartTotals;
}

export const CartSummary: FC<CartSummaryProps> = ({ totals }) => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.card}>
      <PriceSummaryRow label="Subtotal" amount={totals.subtotal} />
      <PriceSummaryRow label="Platform Fee (5%)" amount={totals.platformFee} />
      <CartTotalRow total={totals.total} />
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
