import { FC } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { CartItem as CartItemType } from '../../store/cart.store';
import { QuantityStepper } from './QuantityStepper';
import { typography } from '../../design/typography';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface CartItemProps {
  item: CartItemType;
  onIncrement: (serviceId: string) => void;
  onDecrement: (serviceId: string) => void;
}

export const CartItem: FC<CartItemProps> = ({
  item,
  onIncrement,
  onDecrement,
}) => {
  const styles = useThemedStyles(createStyles);
  const formattedPrice = `Rs. ${(item.price * item.quantity).toLocaleString()}`;

  return (
    <View style={styles.cardRow}>
      <View style={styles.infoCol}>
        {/* Plus Jakarta Sans for service name */}
        <Text style={styles.serviceName} numberOfLines={2}>
          {item.serviceName}
        </Text>

        {/* Inter font for item price */}
        <Text style={styles.priceText}>{formattedPrice}</Text>
      </View>

      {/* Stepper Slot */}
      <QuantityStepper
        value={item.quantity}
        onIncrement={() => onIncrement(item.serviceId)}
        onDecrement={() => onDecrement(item.serviceId)}
      />
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    backgroundColor: colors.bgCard,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  infoCol: {
    flex: 1,
    paddingRight: 12,
  },
  serviceName: {
    fontFamily: typography.fontFamily.jakarta.semiBold, // Plus Jakarta Sans for service names
    fontSize: typography.fontSize.body2,
    color: colors.textPrimary,
    marginBottom: 4,
    lineHeight: 20,
  },
  priceText: {
    fontFamily: typography.fontFamily.inter.bold, // Inter font for price numbers
    fontSize: typography.fontSize.body2,
    color: colors.primaryDark,
  },
});
