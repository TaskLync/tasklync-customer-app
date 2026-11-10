/**
 * ONE booking duration for the whole funnel. The slots request (schedule screen), the checkout hold and
 * the booking create MUST use the same value, otherwise checkout validates a different interval than
 * the one the customer was shown as free.
 *
 * Bounds are the backend's: worker-service slots/holds and booking-service create all accept 0.5..12 h.
 */
export const MIN_BOOKING_HOURS = 0.5;
export const MAX_BOOKING_HOURS = 12;

export interface DurationItem {
  durationHours?: number | null | undefined;
  durationMins?: number | null | undefined;
  quantity?: number | null | undefined;
}

export function cartDurationHours(items: ReadonlyArray<DurationItem> | null | undefined): number {
  if (!items || items.length === 0) return MIN_BOOKING_HOURS;
  const total = items.reduce((acc, item) => {
    const hours =
      item.durationHours || (item.durationMins ? item.durationMins / 60 : MIN_BOOKING_HOURS);
    return acc + hours * (item.quantity || 1);
  }, 0);
  if (!Number.isFinite(total) || total <= 0) return MIN_BOOKING_HOURS;
  return Math.max(MIN_BOOKING_HOURS, Math.min(MAX_BOOKING_HOURS, total));
}
