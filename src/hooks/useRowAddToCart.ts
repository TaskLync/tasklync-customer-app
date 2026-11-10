import { useCallback, useState } from 'react';
import { useCartStore } from '../store/cart.store';

export interface RowCartItem {
  serviceId: string;
  serviceName: string;
  price: number;
  workerId: string;
  workerName?: string | undefined;
  workerAvatar?: string | null | undefined;
  workerRating?: number | undefined;
  workerCategory?: string | undefined;
  isVerified?: boolean | undefined;
}

/**
 * Tapping a service row does what its Add control does: put the service in the cart.
 * Same store, same "Start a new cart?" safeguard when the cart holds another professional's
 * services. It never navigates: the booking flow continues from the cart / Book Now as before.
 */
export function useRowAddToCart(item: RowCartItem) {
  const [conflictVisible, setConflictVisible] = useState(false);

  const payload = useCallback(
    () => ({
      serviceId: item.serviceId,
      serviceName: item.serviceName,
      price: item.price,
      workerId: item.workerId,
      ...(item.workerName ? { workerName: item.workerName } : {}),
      workerAvatar: item.workerAvatar ?? null,
      ...(item.workerRating !== undefined ? { workerRating: item.workerRating } : {}),
      ...(item.workerCategory ? { workerCategory: item.workerCategory } : {}),
      ...(item.isVerified !== undefined ? { isVerified: item.isVerified } : {}),
    }),
    [item]
  );

  /** Adds the service once; a service already in the cart is left to its quantity stepper. */
  const addFromRow = useCallback(() => {
    const cart = useCartStore.getState();
    if (cart.items.some((i) => i.serviceId === item.serviceId)) return;
    const res = cart.addItem(payload());
    if (res.hasConflict) setConflictVisible(true);
  }, [item.serviceId, payload]);

  const replaceCart = useCallback(() => {
    setConflictVisible(false);
    useCartStore.getState().replaceCart(payload());
  }, [payload]);

  return {
    addFromRow,
    conflict: {
      visible: conflictVisible,
      onCancel: () => setConflictVisible(false),
      onReplace: replaceCart,
    },
  };
}
