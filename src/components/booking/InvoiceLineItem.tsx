import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { InvoiceLineItemData } from '../../types/booking.types';
import { fontFamily, fontSize, spacing } from '../../design';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface InvoiceLineItemProps {
  item: InvoiceLineItemData;
  currency?: string;
}

/**
 * InvoiceLineItem Component
 *
 * Implements Serial Position Effect:
 * - Service title in clean Plus Jakarta Sans Medium
 * - Pricing in Inter Bold, right-aligned
 * - Preserves original booking selection order
 */
export const InvoiceLineItem: React.FC<InvoiceLineItemProps> = ({
  item,
  currency = 'PKR',
}) => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <View style={styles.titleCol}>
        <Text style={styles.itemName}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.itemDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <Text style={styles.qtyText}>
          Qty: {item.quantity} × {currency} {item.unit_price.toLocaleString()}
        </Text>
      </View>

      <View style={styles.priceCol}>
        <Text style={styles.priceText}>
          {currency} {item.total_price.toLocaleString()}
        </Text>
      </View>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleCol: {
    flex: 1,
    paddingRight: spacing.md,
  },
  itemName: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: fontSize.body2 + 0.5,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  itemDesc: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginBottom: 4,
    lineHeight: 16,
  },
  qtyText: {
    fontFamily: fontFamily.inter.regular,
    fontSize: fontSize.dataXS + 0.5,
    color: colors.textSecondary,
  },
  priceCol: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  priceText: {
    fontFamily: fontFamily.inter.bold,
    fontSize: fontSize.dataMD,
    color: colors.textPrimary,
  },
});
