import { FC } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { CartItem as CartItemType } from '../../store/cart.store';
import { typography } from '../../design/typography';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface CartItemProps {
  item: CartItemType;
  onRemove: (serviceId: string) => void;
}

/** One selected service: name, price, Remove. Services are booked once, so there is no quantity. */
export const CartItem: FC<CartItemProps> = ({ item, onRemove }) => {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.cardRow}>
      <View style={styles.infoCol}>
        <Text style={styles.serviceName} numberOfLines={2}>
          {item.serviceName}
        </Text>
        <Text style={styles.priceText}>Rs. {item.price.toLocaleString()}</Text>
      </View>

      <Pressable
        onPress={() => onRemove(item.serviceId)}
        hitSlop={10}
        style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.serviceName}`}
      >
        <Text style={styles.removeText}>Remove</Text>
      </Pressable>
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
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: typography.fontSize.body2,
    color: colors.textPrimary,
    marginBottom: 4,
    lineHeight: 20,
  },
  priceText: {
    fontFamily: typography.fontFamily.inter.bold,
    fontSize: typography.fontSize.body2,
    color: colors.primaryDark,
  },
  removeBtn: {
    minHeight: 32,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.55,
  },
  removeText: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
