import { useState, useCallback, useRef } from 'react';
import { useCartStore } from '../store/cart.store';
import { useBookingDraftStore } from '../store/bookingDraft.store';
import { useAuthStore } from '../store/auth.store';
import { bookingApi } from '../services/api/booking.api';
import { BookingDetails, CreateBookingPayload } from '../types/booking.types';
import { slotToUTCISO, normalizeDateToYYYYMMDD } from '../utils/timezone';
import { cartDurationHours } from '../utils/bookingDuration';
import { isValidUUID } from '../utils/uuid';
import { resolveBookingLocation } from '../utils/activeAddress';
import { invalidateAvailability, classifyBookingFailure, type BookingFailure } from '../utils/availabilityEvents';
import { classifyCreateDiscountFailure, discountErrorMessage, trimCode } from '../utils/offers';
import {
  validateServiceArea,
  SERVICE_UNAVAILABLE_MESSAGE,
} from '../config/serviceArea.config';

/** A booking that failed because of its discount (spec 10.3). */
export interface DiscountFailure {
  /** 'continue_without': offer to resubmit without a code. 'clear': drop the code, back to the original price. */
  kind: 'continue_without' | 'clear';
  code: string;
  message: string;
}

export interface SubmitResult {
  booking: BookingDetails | null;
  error: string | null;
  /** True only when the backend verified the slot is taken (booking or another customer's live hold). */
  conflict?: boolean;
  discountFailure?: DiscountFailure;
  /** Why the backend refused (or why the request did not complete), plus the attempt reference support can look up. */
  failure?: BookingFailure & { attemptRef: string };
}

/** Client id for one confirm attempt; reused by retries of the same booking so support sees one attempt. */
function newAttemptId(): string {
  return `ba-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface SubmitOptions {
  /** Raw code the customer applied. Omit to book without a code (an automatic offer may still apply server-side). */
  couponCode?: string | undefined;
}

export function useCreateBooking() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const cartItems = useCartStore((s) => s.items);
  const cartWorker = useCartStore((s) => s.worker);
  const token = useAuthStore((s) => s.accessToken);

  const {
    selectedDate,
    selectedTimeSlot,
    isUrgent,
    workerId: draftWorkerId,
    addressId,
    address,
    note,
  } = useBookingDraftStore();

  // Each successful create consumes a use of a code: a second tap must never start a second request.
  const inFlight = useRef(false);
  const attempt = useRef<{ key: string; id: string } | null>(null);

  const submit = useCallback(async (options?: SubmitOptions): Promise<SubmitResult> => {
    if (inFlight.current) {
      return { booking: null, error: 'Your booking is already being confirmed.' };
    }
    // Taken BEFORE the first await (address resolution / creation): a second tap during those must
    // never start a second create. Released in `finally`, whatever path returns.
    inFlight.current = true;
    setIsLoading(true);
    try {
      if (!token) {
        const err = 'Please sign in to confirm and place your booking.';
        setError(err);
        return { booking: null, error: err };
      }

      const serviceIds = cartItems.map((i) => i.serviceId);
      // The live cart worker is the source of truth; the persisted draft id can be a previously viewed worker.
      const rawWorkerId = cartWorker?.id || draftWorkerId;

      // Validate that worker is not a mock worker ID
      if (typeof rawWorkerId === 'string' && (rawWorkerId.startsWith('w') || rawWorkerId.startsWith('mock'))) {
        const err = 'Selected professional is not valid. Please choose an active verified professional.';
        setError(err);
        return { booking: null, error: err };
      }

      // Validate workerId to standard RFC4122 UUID v4
      if (!isValidUUID(rawWorkerId)) {
        const err = 'Selected professional is not valid. Please choose an active verified professional.';
        setError(err);
        return { booking: null, error: err };
      }
      const workerId: string = rawWorkerId;

      if (cartItems.length === 0 && !cartWorker) {
        const err = 'Your cart is empty. Please select services first.';
        setError(err);
        return { booking: null, error: err };
      }

      if (!address && !addressId) {
        const err = 'Please select or add a delivery address before confirming.';
        setError(err);
        return { booking: null, error: err };
      }

      // Default schedule to tomorrow 10:00 AM PKT if not explicitly selected
      // The draft can hold an ISO / Date-string form; the slot was chosen for the PKT calendar day.
      let dateStr = normalizeDateToYYYYMMDD(selectedDate);
      let timeStr = selectedTimeSlot;
      if (!dateStr || !timeStr) {
        const tomorrow = new Date(Date.now() + 86400000);
        dateStr = tomorrow.toISOString().split('T')[0];
        timeStr = '10:00 AM';
      }

      // The destination is ONE saved address: its id and ITS coordinates. No GPS mixing, no
      // auto-created addresses, no shared placeholder ids (audit LOC-007/014/016). The backend
      // re-reads the saved point, text and directions from that id.
      const location = resolveBookingLocation(addressId, address);
      if (!location.ok) {
        const err =
          location.reason === 'UNSAVED_ADDRESS'
            ? 'Please confirm your address on the map so the professional can find you.'
            : location.reason === 'NO_COORDINATES'
            ? 'Please re-select your address — its map location is missing.'
            : 'Please select or add a delivery address before confirming.';
        setError(err);
        return { booking: null, error: err };
      }
      const { lat, lng, addressId: resolvedAddressId } = location;
      const addrText = address
        ? `${address.street}${address.city && !address.street.includes(address.city) ? ', ' + address.city : ''}`
        : '';

      // Validate that the delivery destination is inside the active service area (Faisalabad)
      const serviceValidation = validateServiceArea({ lat, lng });
      if (!serviceValidation.isServiceable) {
        const err = SERVICE_UNAVAILABLE_MESSAGE;
        setError(err);
        return { booking: null, error: err };
      }

      // Convert date + time slot in Pakistan Time (Asia/Karachi, UTC+5) to standard ISO-8601 UTC timestamp
      const scheduledAt = slotToUTCISO(dateStr, timeStr || '10:00 AM');

      // Every cart line must be a real service: the server prices each (service, quantity) pair itself.
      if (cartItems.length === 0 || serviceIds.some((id) => !isValidUUID(id))) {
        const err = 'Some services in your cart are out of date. Please remove them and add them again.';
        setError(err);
        return { booking: null, error: err };
      }
      const items = cartItems.map((i) => ({ service_id: i.serviceId, quantity: Math.max(1, Math.round(Number(i.quantity)) || 1) }));
      const primaryServiceId = serviceIds[0] as string;

      const payload: CreateBookingPayload = {
        worker_id: workerId,
        category_id: cartWorker?.category || 'electrician',
        service_id: primaryServiceId,
        items,
        service_type: 'ONE_TIME',
        scheduled_at: scheduledAt,
        // Same duration the schedule screen requested slots (and the hold) with.
        duration_hours: cartDurationHours(cartItems),
        address_id: resolvedAddressId,
        address_text: addrText,
        latitude: lat,
        longitude: lng,
        is_urgent: isUrgent,
        description: note || undefined,
        ...(options?.couponCode && trimCode(options.couponCode)
          ? { coupon_code: trimCode(options.couponCode) }
          : {}),
      };

      // One attempt id per set of booking details: "Try again" after a network failure reuses it, so the
      // backend (and support) see one attempt; any change to worker / time / items / address starts a new one.
      const attemptKey = JSON.stringify([
        payload.worker_id, payload.scheduled_at, payload.duration_hours, payload.items,
        payload.address_id, payload.latitude, payload.longitude, payload.coupon_code ?? null,
      ]);
      if (!attempt.current || attempt.current.key !== attemptKey) {
        attempt.current = { key: attemptKey, id: newAttemptId() };
      }
      const attemptRef = attempt.current.id;

      setError(null);

      try {
        const booking = await bookingApi.createBooking({ ...payload, attempt_id: attemptRef });
        attempt.current = null;
        // The slot is now taken for THIS worker only: refresh that worker's calendar.
        invalidateAvailability(workerId);
        return { booking, error: null };
      } catch (err: any) {
        // Discount failures first: COUPON_NO_LONGER_AVAILABLE is a 409, which would otherwise read as a slot conflict.
        const discount = classifyCreateDiscountFailure(err?.code);
        if (discount) {
          const message = discountErrorMessage(err?.code, err?.message);
          setError(message);
          return {
            booking: null,
            error: message,
            discountFailure: { kind: discount, code: String(err.code), message },
          };
        }

        // Decided only from what the backend reported. Booking details are left untouched in every case:
        // the screen decides what to do with the selected slot.
        const failure = classifyBookingFailure(err);
        const conflict = failure.kind === 'slot_taken';
        if (failure.kind === 'slot_taken' || failure.kind === 'time_unavailable' || failure.kind === 'worker_unavailable') {
          // The calendar must stop offering this time: pull this worker's real slots.
          invalidateAvailability(workerId);
        }
        const msg = failure.message || 'Failed to create booking. Please try again.';
        setError(msg);
        return { booking: null, error: msg, conflict, failure: { ...failure, attemptRef } };
      }
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  }, [
    cartItems,
    cartWorker,
    draftWorkerId,
    selectedDate,
    selectedTimeSlot,
    isUrgent,
    addressId,
    address,
    note,
    token,
  ]);

  return {
    submit,
    isLoading,
    error,
  };
}
