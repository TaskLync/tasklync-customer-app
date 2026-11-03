import React from 'react';
import { View, StyleSheet } from 'react-native';
import { EmptyState } from '../feedback/EmptyState';

export interface PaymentEmptyStateProps {
  onAddPress: () => void;
}

export const PaymentEmptyState: React.FC<PaymentEmptyStateProps> = ({ onAddPress }) => {
  return (
    <View style={styles.container}>
      <EmptyState
        type="no-data"
        title="No payment methods yet"
        description="Add your JazzCash, EasyPaisa wallet or Debit/Credit card to book and pay for home services with 1-tap ease."
        actionLabel="Add Payment Method"
        onAction={onAddPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});
