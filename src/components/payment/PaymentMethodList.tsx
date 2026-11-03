import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { PaymentMethod } from '../../types/payment.types';
import { usePaymentMethods } from '../../hooks/usePaymentMethods';
import { PaymentMethodPicker } from './PaymentMethodPicker';
import { PaymentMethodCardSkeleton } from './PaymentMethodCardSkeleton';

export interface PaymentMethodListProps {
  selectedMethodId: string | null;
  onSelectMethod: (method: PaymentMethod) => void;
  extraMethods?: PaymentMethod[];
}

export const PaymentMethodList: React.FC<PaymentMethodListProps> = ({
  selectedMethodId,
  onSelectMethod,
  extraMethods = [],
}) => {
  const { methods: apiMethods, isLoading } = usePaymentMethods();
  const methods = [...extraMethods, ...apiMethods];

  // Auto-select enabled default payment method if none selected
  useEffect(() => {
    if (!selectedMethodId && methods.length > 0) {
      const defaultMethod =
        methods.find((m) => m.isEnabled !== false && m.is_enabled !== false && (m.is_default || m.isDefault)) ||
        methods.find((m) => m.isEnabled !== false && m.is_enabled !== false) ||
        methods[0];
      if (defaultMethod) {
        onSelectMethod(defaultMethod);
      }
    }
  }, [methods, selectedMethodId, onSelectMethod]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <PaymentMethodCardSkeleton />
        <PaymentMethodCardSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PaymentMethodPicker
        methods={methods}
        selectedId={selectedMethodId || methods[0]?.id || ''}
        onSelect={onSelectMethod}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
