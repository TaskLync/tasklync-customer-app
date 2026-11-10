import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Wrench } from 'lucide-react-native';
import { SummarySectionCard } from './SummarySectionCard';
import { CartItem } from '../../../store/cart.store';
import { fontFamily } from '../../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

export interface SummaryServicesListProps {
  items: CartItem[];
}

export const SummaryServicesList: React.FC<SummaryServicesListProps> = ({ items }) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <SummarySectionCard
      icon={<Wrench size={16} color={colors.primaryDark} strokeWidth={2.2} />}
      title="Services Requested"
    >
      <View style={styles.listContainer}>
        {items.map((item, index) => {
          const itemTotal = item.price * item.quantity;
          const isLast = index === items.length - 1;

          return (
            <View
              key={`sum-item-${item.serviceId}`}
              style={[styles.itemRow, !isLast && styles.itemBorder]}
            >
              <View style={styles.leftInfo}>
                <Text style={styles.serviceName}>{item.serviceName}</Text>
                <Text style={styles.quantityText}>
                  Qty: {item.quantity} × Rs. {item.price.toLocaleString()}
                </Text>
              </View>

              <Text style={styles.priceText}>
                Rs. {itemTotal.toLocaleString()}
              </Text>
            </View>
          );
        })}
      </View>
    </SummarySectionCard>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  listContainer: {
    width: '100%',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: palette.gray100,
  },
  leftInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  quantityText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 2,
  },
  priceText: {
    fontFamily: fontFamily.inter.bold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
  },
});
