import { useMemo } from 'react';
import { useCartStore } from '../store/cart.store';

/**
 * Cart sums only. The platform fee and tax are NOT calculated in the app: the server prices the
 * booking at checkout (admin-controlled fee / tax), and the cart shows the active setting as a label.
 * Each service is in the cart once, so the subtotal is the sum of the selected services' prices.
 */
export interface CartTotals {
  subtotal: number;
  /** Number of selected services. */
  itemCount: number;
}

export const useCartTotals = (): CartTotals => {
  const items = useCartStore((state) => state.items);

  return useMemo(() => {
    const subtotal = items.reduce((acc, item) => acc + item.price, 0);
    return { subtotal, itemCount: items.length };
  }, [items]);
};
