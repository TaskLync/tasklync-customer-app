import { FC } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { typography } from '../../design/typography';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface PriceSummaryRowProps {
  label: string;
  amount: number;
}

export const PriceSummaryRow: FC<PriceSummaryRowProps> = ({
  label,
  amount,
}) => {
  const styles = useThemedStyles(createStyles);
  const formattedAmount = `Rs. ${amount.toLocaleString()}`;

  return (
    <View style={styles.row}>
      {/* Plus Jakarta Sans for row label */}
      <Text style={styles.labelText}>{label}</Text>

      {/* Inter font for row price value */}
      <Text style={styles.valueText}>{formattedAmount}</Text>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  labelText: {
    fontFamily: typography.fontFamily.jakarta.regular, // Plus Jakarta Sans muted
    fontSize: typography.fontSize.body2,
    color: colors.textSecondary,
  },
  valueText: {
    fontFamily: typography.fontFamily.inter.medium, // Inter font for measurement/prices
    fontSize: typography.fontSize.body2,
    color: colors.textPrimary,
  },
});
