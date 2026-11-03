import { colors } from '../../design';
import { View, Text, StyleSheet } from 'react-native';

interface BookingPriceTagProps {
  amount: number;
  currency: string;
}

const formatCurrency = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'PKR',
    }).format(amount);
  } catch {
    return `${currency || 'PKR'} ${amount.toLocaleString()}`;
  }
};

export function BookingPriceTag({ amount, currency }: BookingPriceTagProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.price} numberOfLines={1}>
        {formatCurrency(amount, currency)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 8,
  },
  price: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    letterSpacing: -0.3,
    color: colors.textPrimary,
    textAlign: 'right',
  },
});
