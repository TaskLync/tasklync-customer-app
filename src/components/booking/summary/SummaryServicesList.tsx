import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SummarySectionCard } from './SummarySectionCard';
import { CartItem } from '../../../store/cart.store';
import { fontFamily } from '../../../design';
import { useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

export interface SummaryServicesListProps {
  items: CartItem[];
}

export const SummaryServicesList: React.FC<SummaryServicesListProps> = ({ items }) => {
  const styles = useThemedStyles(createStyles);
  return (
    <SummarySectionCard title="Services">
      <View style={styles.list}>
        {items.map((item) => (
          <View key={`sum-item-${item.serviceId}`} style={styles.itemRow}>
            <View style={styles.leftInfo}>
              <Text style={styles.serviceName}>{item.serviceName}</Text>
            </View>
            <Text style={styles.priceText}>Rs. {item.price.toLocaleString()}</Text>
          </View>
        ))}
      </View>
    </SummarySectionCard>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  list: {
    gap: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  leftInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 16,
  },
  serviceName: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  priceText: {
    fontFamily: fontFamily.inter.medium,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textPrimary,
  },
});
