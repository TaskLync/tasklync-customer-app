import { FC } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { typography } from '../../design/typography';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface CartTotalRowProps {
  total: number;
}

export const CartTotalRow: FC<CartTotalRowProps> = ({ total }) => {
  const styles = useThemedStyles(createStyles);
  const formattedTotal = `Rs. ${total.toLocaleString()}`;

  return (
    <View style={styles.totalRow}>
      {/* Plus Jakarta Sans for Total label */}
      <Text style={styles.totalLabel}>Total Payable</Text>

      {/* Inter Bold for green total amount (Von Restorff Effect) */}
      <Text style={styles.totalAmount}>{formattedTotal}</Text>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontFamily: typography.fontFamily.jakarta.bold, // Plus Jakarta Sans
    fontSize: typography.fontSize.body1,
    color: colors.textPrimary,
  },
  totalAmount: {
    fontFamily: typography.fontFamily.inter.bold, // Inter Bold for final total number
    fontSize: typography.fontSize.h2,
    color: colors.primaryDark,
  },
});
