import { useState, useCallback } from 'react';
import { useCartStore } from '../store/cart.store';
import { useBookingDraftStore } from '../store/bookingDraft.store';
import { useLocationStore } from '../store/location.store';
import { useAuthStore } from '../store/auth.store';
import { bookingApi } from '../services/api/booking.api';
import { userApi } from '../services/api/user.api';
import { BookingDetails, CreateBookingPayload } from '../types/booking.types';
import { slotToUTCISO } from '../utils/timezone';
import { isValidUUID, CANONICAL_FALLBACK_UUIDS } from '../utils/uuid';
import {
  validateServiceArea,
  SERVICE_UNAVAILABLE_MESSAGE,
  FAISALABAD_CENTER,
} from '../config/serviceArea.config';

export function useCreateBooking() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const cartItems = useCartStore((s) => s.items);
  const cartWorker = useCartStore((s) => s.worker);
  const currentLocation = useLocationStore((s) => s.currentLocation);
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

  const submit = useCallback(async (): Promise<{ booking: BookingDetails | null; error: string | null }> => {
    if (!token) {
      const err = 'Please sign in to confirm and place your booking.';
      setError(err);
      return { booking: null, error: err };
    }

    const serviceIds = cartItems.map((i) => i.serviceId);
    const rawWorkerId = draftWorkerId || cartWorker?.id;

    // Validate that worker is not a mock worker ID
    if (typeof rawWorkerId === 'string' && (rawWorkerId.startsWith('w') || rawWorkerId.startsWith('mock'))) {
      const err = 'Selected professional is not valid. Please choose an active verified professional.';
      setError(err);
      return { booking: null, error: err };
    }

    // Validate workerId to standard RFC4122 UUID v4
    const workerId: string = isValidUUID(rawWorkerId)
      ? rawWorkerId
      : CANONICAL_FALLBACK_UUIDS.WORKER_DEFAULT;

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

    const addrText = address
      ? `${address.street}${address.city ? ', ' + address.city : ''}`
      : 'Delivery Address';

    const lat = address?.latitude || currentLocation?.lat || FAISALABAD_CENTER.lat;
    const lng = address?.longitude || currentLocation?.lng || FAISALABAD_CENTER.lng;

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
          city: address?.city || 'Faisalabad',
          country: 'Pakistan',
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
            city: createdAddr.city || 'Faisalabad',
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
      duration_hours: 2,
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
      setIsLoading(false);
      return { booking, error: null };
    } catch (err: any) {
      const msg = err?.message || 'Failed to create booking. Please try again.';
      setError(msg);
      setIsLoading(false);
      return { booking: null, error: msg };
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
    currentLocation,
    token,
    setAddress,
  ]);

  return {
    submit,
    isLoading,
    error,
  };
}
