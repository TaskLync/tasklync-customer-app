import { useEffect } from 'react';
import { StyleSheet, View, ScrollView, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCartStore } from '../../src/store/cart.store';
import { useCartTotals } from '../../src/hooks/useCartTotals';

import { CartHeader } from '../../src/components/cart/CartHeader';
import { CartWorkerCard } from '../../src/components/cart/CartWorkerCard';
import { CartItemList } from '../../src/components/cart/CartItemList';
import { AddMoreServicesLink } from '../../src/components/cart/AddMoreServicesLink';
import { CartNoteInput } from '../../src/components/cart/CartNoteInput';
import { CartSummary } from '../../src/components/cart/CartSummary';
import { ProceedFooter } from '../../src/components/cart/ProceedFooter';
import { EmptyCart } from '../../src/components/feedback/EmptyState/EmptyCart';
import { colors } from '../../src/design/colors';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const items = useCartStore((state) => state.items);
  const worker = useCartStore((state) => state.worker);
  const note = useCartStore((state) => state.note);

  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const setNote = useCartStore((state) => state.setNote);
  const hydrate = useCartStore((state) => state.hydrate);

  // Hydrate cart from MMKV session storage on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Derived price calculation hook
  const totals = useCartTotals();
  const hasItems = items.length > 0;

  const handleIncrement = (serviceId: string) => {
    const item = items.find((i) => i.serviceId === serviceId);
    if (item) {
      updateQuantity(serviceId, item.quantity + 1);
    }
  };

  const handleDecrement = (serviceId: string) => {
    const item = items.find((i) => i.serviceId === serviceId);
    if (item) {
      updateQuantity(serviceId, item.quantity - 1);
    }
  };

  return (
    <View style={[styles.screenContainer, isDark && styles.screenContainerDark, { paddingTop: insets.top }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* 1. Header with back button & item count badge */}
      <CartHeader itemCount={totals.itemCount} />

      {hasItems ? (
        <View style={styles.contentWrapper}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* 2. Selected Worker Card */}
            <CartWorkerCard worker={worker} />

            {/* 3. Item List with Swipe-to-delete */}
            <CartItemList
              items={items}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              onRemoveItem={removeItem}
            />

            {/* 4. Add More Services Link */}
            <AddMoreServicesLink workerId={worker?.id} />

            {/* 5. Optional Collapsed Note Input */}
            <CartNoteInput value={note} onChangeText={setNote} />

            {/* 6. Summary Card with Escrow Note */}
            <CartSummary totals={totals} />
          </ScrollView>

          {/* 7. Sticky Bottom Booking Footer CTA */}
          <ProceedFooter total={totals.total} itemCount={totals.itemCount} />
        </View>
      ) : (
        /* Empty Cart State */
        <EmptyCart />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  screenContainerDark: {
    backgroundColor: colors.textPrimary,
  },
  contentWrapper: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
});
