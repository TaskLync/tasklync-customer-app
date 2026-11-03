import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PriceSummaryRow } from '../cart/PriceSummaryRow';
import { CartTotalRow } from '../cart/CartTotalRow';
import { EscrowNote } from '../cart/EscrowNote';
import { colors } from '../../design';

export interface BookingPriceSummaryProps {
  subtotal: number;
  platformFee: number;
  urgentFee?: number;
  discount?: number;
  total: number;
  currency?: string;
}

export const BookingPriceSummary: React.FC<BookingPriceSummaryProps> = ({
  subtotal,
  platformFee,
  urgentFee = 0,
  discount = 0,
  total,
}) => {
  return (
    <View style={styles.card}>
      <PriceSummaryRow label="Services Subtotal" amount={subtotal} />

      {urgentFee > 0 && (
        <PriceSummaryRow label="Urgent Dispatch Surge (+30%)" amount={urgentFee} />
      )}

      <PriceSummaryRow label="Platform Service Fee (15%)" amount={platformFee} />

      {discount > 0 && (
        <PriceSummaryRow label="Promotional Discount" amount={-discount} />
      )}

      <CartTotalRow total={total} />

      <EscrowNote />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSection,
    borderRadius: 14,
    padding: 18,
    marginTop: 8,
    marginBottom: 16,
  },
});
