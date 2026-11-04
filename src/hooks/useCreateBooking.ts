import { useState, useCallback } from 'react';
import { useCartStore } from '../store/cart.store';
import { useBookingDraftStore } from '../store/bookingDraft.store';
import { useLocationStore } from '../store/location.store';
import { useAuthStore } from '../store/auth.store';
import { bookingApi } from '../services/api/booking.api';
import { userApi } from '../services/api/user.api';
import { resolveAddress } from '../services/maps/addressResolver';
import { BookingDetails, CreateBookingPayload } from '../types/booking.types';
import { slotToUTCISO } from '../utils/timezone';
import { isValidUUID, CANONICAL_FALLBACK_UUIDS } from '../utils/uuid';
import { invalidateAvailability, isSlotConflictError } from '../utils/availabilityEvents';
import {
  validateServiceArea,
  SERVICE_UNAVAILABLE_MESSAGE,
} from '../config/serviceArea.config';

export function useCreateBooking() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const cartItems = useCartStore((s) => s.items);
  const cartWorker = useCartStore((s) => s.worker);
  const liveLocation = useLocationStore((s) => s.liveLocation);
  const token = useAuthStore((s) => s.accessToken);

  const {
    selectedDate,
    selectedTimeSlot,
    isUrgent,
    workerId: draftWorkerId,
    addressId,
    address,
    note,
    setAddress,
  } = useBookingDraftStore();

  const submit = useCallback(async (): Promise<{ booking: BookingDetails | null; error: string | null; conflict?: boolean }> => {
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
    let dateStr = selectedDate;
    let timeStr = selectedTimeSlot;
    if (!dateStr || !timeStr) {
      const tomorrow = new Date(Date.now() + 86400000);
      dateStr = tomorrow.toISOString().split('T')[0];
      timeStr = '10:00 AM';
    }

    let addrText = address
      ? `${address.street}${address.city ? ', ' + address.city : ''}`
      : '';
    let addrCity = address?.city || '';
    let addrCountry: string | undefined;

    const lat = address?.latitude ?? liveLocation?.lat;
    const lng = address?.longitude ?? liveLocation?.lng;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      const err = 'Please select a valid delivery address within the service area.';
      setError(err);
      return { booking: null, error: err };
    }

    // No saved address: describe the actual delivery coordinates (resolved, or an honest coordinates label)
    if (!address) {
      try {
        const resolved = await resolveAddress(lat, lng);
        addrText = resolved.address_line;
        addrCity = resolved.city || '';
        addrCountry = resolved.country || undefined;
      } catch {
        addrText = `Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
      }
    }

    // Validate that the delivery destination is inside the active service area (Faisalabad)
    const serviceValidation = validateServiceArea({ lat, lng });
    if (!serviceValidation.isServiceable) {
      const err = SERVICE_UNAVAILABLE_MESSAGE;
      setError(err);
      return { booking: null, error: err };
    }

    // Resolve address_id: Ensure it is always a valid server-side UUID
    let resolvedAddressId: string = CANONICAL_FALLBACK_UUIDS.ADDRESS_HOME;

    if (isValidUUID(addressId)) {
      resolvedAddressId = addressId;
    } else if (isValidUUID(address?.id)) {
      resolvedAddressId = address.id;
    } else if (token) {
      // User is logged in but address is not yet saved to server; create it dynamically
      try {
        const createdAddr = await userApi.createAddress({
          label: address?.label || 'Home',
          address_line: addrText,
          city: addrCity,
          ...(addrCountry ? { country: addrCountry } : {}),
          lat,
          lng,
          is_default: true,
        });

        if (createdAddr?.id && isValidUUID(createdAddr.id)) {
          resolvedAddressId = createdAddr.id;
          setAddress({
            id: createdAddr.id,
            label: createdAddr.label || 'Home',
            street: createdAddr.address_line,
            city: createdAddr.city || '',
            latitude: createdAddr.lat,
            longitude: createdAddr.lng,
            isDefault: Boolean(createdAddr.is_default),
          });
        }
      } catch (_addrErr) {
        // Fallback to canonical UUID if server address creation fails
        resolvedAddressId = CANONICAL_FALLBACK_UUIDS.ADDRESS_HOME;
      }
    }

    // Convert date + time slot in Pakistan Time (Asia/Karachi, UTC+5) to standard ISO-8601 UTC timestamp
    const scheduledAt = slotToUTCISO(dateStr, timeStr || '10:00 AM');

    const primaryServiceId = serviceIds[0] && isValidUUID(serviceIds[0])
      ? serviceIds[0]
      : CANONICAL_FALLBACK_UUIDS.SERVICE_DEFAULT;

    const payload: CreateBookingPayload = {
      worker_id: workerId,
      category_id: cartWorker?.category || 'electrician',
      service_id: primaryServiceId,
      service_type: 'ONE_TIME',
      scheduled_at: scheduledAt,
      duration_hours:
        cartItems.reduce((acc, item) => {
          const itemHours = item.durationHours || (item.durationMins ? item.durationMins / 60 : 0.5);
          return acc + itemHours * (item.quantity || 1);
        }, 0) || 0.5,
      address_id: resolvedAddressId,
      address_text: addrText,
      latitude: lat,
      longitude: lng,
      is_urgent: isUrgent,
      description: note || undefined,
      custom_base_price:
        cartItems.reduce((acc, i) => acc + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0) || undefined,
    };

    setIsLoading(true);
    setError(null);

    try {
      const booking = await bookingApi.createBooking(payload);
      // The slot is now taken for THIS worker only: refresh that worker's calendar.
      invalidateAvailability(workerId);
      setIsLoading(false);
      return { booking, error: null };
    } catch (err: any) {
      let conflict = false;
      let msg = err?.response?.data?.error?.message || err?.message || 'Failed to create booking. Please try again.';
      if (isSlotConflictError(err)) {
        conflict = true;
        // Someone else got the slot (stale availability / double tap): drop it and reload real slots.
        useBookingDraftStore.getState().setSelectedTimeSlot(null);
        invalidateAvailability(workerId);
        msg = 'This time slot was just booked by someone else. Please pick another slot.';
      }
      setError(msg);
      setIsLoading(false);
      return { booking: null, error: msg, conflict };
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
    liveLocation,
    token,
    setAddress,
  ]);

  return {
    submit,
    isLoading,
    error,
  };
}
