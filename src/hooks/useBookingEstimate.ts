import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCartStore } from '../store/cart.store';
import { useBookingDraftStore } from '../store/bookingDraft.store';
import { useLocationStore } from '../store/location.store';
import { bookingApi } from '../services/api/booking.api';
import { PriceEstimateData } from '../types/booking.types';
import { slotToUTCISO } from '../utils/timezone';

const PLATFORM_FEE_RATE = 0.05; // 5% customer platform fee

export function useBookingEstimate() {
  const cartItems = useCartStore((s) => s.items);
  const cartWorker = useCartStore((s) => s.worker);

  const selectedDate = useBookingDraftStore((s) => s.selectedDate);
  const selectedTimeSlot = useBookingDraftStore((s) => s.selectedTimeSlot);
  const isUrgent = useBookingDraftStore((s) => s.isUrgent);
  const address = useBookingDraftStore((s) => s.address);
  const draftWorkerId = useBookingDraftStore((s) => s.workerId);
  const workerId = cartWorker?.id || draftWorkerId || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  const currentLocation = useLocationStore((s) => s.currentLocation);

  // Single Source of Truth for Subtotal: Dynamic sum of cart items (Σ service.price * service.quantity)
  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  }, [cartItems]);

  const [estimateData, setEstimateData] = useState<PriceEstimateData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchEstimate = useCallback(async () => {
    let scheduledAt = new Date().toISOString();
    if (selectedDate) {
      scheduledAt = slotToUTCISO(selectedDate, selectedTimeSlot || '10:00 AM');
    }

    const firstService = cartItems[0];
    const categoryId = cartWorker?.category || 'electrician';
    const serviceId = firstService?.serviceId;

    const lat = address?.latitude || currentLocation?.lat || 33.7182;
    const lng = address?.longitude || currentLocation?.lng || 73.0605;

    setIsLoading(true);
    try {
      const result = await bookingApi.getPriceEstimate({
        worker_id: workerId,
        category_id: categoryId,
        service_id: serviceId,
        scheduled_at: scheduledAt,
        duration_hours:
          cartItems.reduce((acc, item) => {
            const itemHours = item.durationHours || (item.durationMins ? item.durationMins / 60 : 0.5);
            return acc + itemHours * (item.quantity || 1);
          }, 0) || 0.5,
        latitude: lat,
        longitude: lng,
        is_urgent: isUrgent,
        custom_base_price: cartSubtotal > 0 ? cartSubtotal : undefined,
      });

      setEstimateData(result);
    } catch (_e) {
      setEstimateData(null);
    } finally {
      setIsLoading(false);
    }
  }, [cartItems, cartWorker, workerId, selectedDate, selectedTimeSlot, isUrgent, address, currentLocation]);

  useEffect(() => {
    fetchEstimate();
  }, [fetchEstimate]);

  // Derived price values using API estimation data when available (Single Source of Truth)
  const basePrice = estimateData?.base_price ?? (cartSubtotal > 0 ? cartSubtotal : 500);
  const subtotal = basePrice;
  const platformFee = estimateData?.platform_fee ?? Math.round(subtotal * PLATFORM_FEE_RATE);
  const urgentFee = (isUrgent && !estimateData) ? Math.round(subtotal * 0.3) : 0;
  const discount = 0;
  const total = estimateData?.estimated_total ?? (subtotal + platformFee + urgentFee - discount);
  const workerAmount = estimateData?.worker_amount ?? Math.round(subtotal * 0.95);

  return {
    basePrice,
    subtotal,
    platformFee,
    urgentFee,
    discount,
    total,
    workerAmount,
    currency: 'PKR',
    estimateData,
    isLoading,
    refetch: fetchEstimate,
  };
}
