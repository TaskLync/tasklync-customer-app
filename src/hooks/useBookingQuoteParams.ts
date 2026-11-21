import { useMemo } from 'react';
import { useCartStore } from '../store/cart.store';
import { useBookingDraftStore } from '../store/bookingDraft.store';
import { useLocationStore } from '../store/location.store';
import { slotToUTCISO } from '../utils/timezone';
import { isValidUUID } from '../utils/uuid';
import type { BookingQuoteParams } from '../types/offers.types';
import { toServiceLines } from '../utils/cartItems';
import { cartDurationHours } from '../utils/bookingDuration';

/**
 * The booking parameters a discount is priced against. A code is previewed with these exact values
 * and the booking is created with the same ones, so the previewed total matches the created booking
 * (spec 6.1). Mirrors the field resolution in useCreateBooking: keep the two in step.
 *
 * Returns null while a required value (valid worker, coordinates) is not available.
 */
export function useBookingQuoteParams(): BookingQuoteParams | null {
  const cartItems = useCartStore((s) => s.items);
  const cartWorker = useCartStore((s) => s.worker);
  const draftWorkerId = useBookingDraftStore((s) => s.workerId);
  const selectedDate = useBookingDraftStore((s) => s.selectedDate);
  const selectedTimeSlot = useBookingDraftStore((s) => s.selectedTimeSlot);
  const address = useBookingDraftStore((s) => s.address);
  const liveLocation = useLocationStore((s) => s.liveLocation);

  const rawWorkerId = cartWorker?.id || draftWorkerId;
  const categoryId = cartWorker?.category || 'electrician';
  // The server prices each line; the app only says which services (each once).
  const lineKey = toServiceLines(cartItems).map((l) => l.service_id).join(',');
  const lat = address?.latitude ?? liveLocation?.lat;
  const lng = address?.longitude ?? liveLocation?.lng;

  // Same duration as the schedule screen, the checkout hold and booking create (one rule, one value).
  const hours = useMemo(() => cartDurationHours(cartItems), [cartItems]);

  return useMemo(() => {
    if (!isValidUUID(rawWorkerId)) return null;
    const items = lineKey ? lineKey.split(',').map((service_id) => ({ service_id, quantity: 1 as const })) : [];
    // A cart line that is not a real service cannot be priced: no quote rather than a made-up one.
    if (items.length === 0 || items.some((i) => !isValidUUID(i.service_id))) return null;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;

    let dateStr = selectedDate;
    let timeStr = selectedTimeSlot;
    if (!dateStr || !timeStr) {
      dateStr = new Date(Date.now() + 86400000).toISOString().split('T')[0] ?? null;
      timeStr = '10:00 AM';
    }
    if (!dateStr) return null;

    return {
      worker_id: rawWorkerId,
      category_id: categoryId,
      items,
      scheduled_at: slotToUTCISO(dateStr, timeStr),
      duration_hours: hours,
      latitude: lat,
      longitude: lng,
    };
  }, [rawWorkerId, categoryId, lineKey, selectedDate, selectedTimeSlot, hours, lat, lng]);
}
