import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, Platform } from 'react-native';
import { customRequestApi } from '../../services/api/customRequest.api';
import {
  Quote,
  CustomServiceRequest,
  CreateBookingFromQuoteDto,
  BookingFromQuoteResponse,
} from '../../types/customRequest.types';
import { UserAddress } from '../../types/user.types';
import { validateServiceArea, SERVICE_UNAVAILABLE_MESSAGE } from '../../config/serviceArea.config';
import { slotToUTCISO, normalizeDateToYYYYMMDD } from '../../utils/timezone';
import { useAddresses } from '../useAddresses';
import { isValidUUID, CANONICAL_FALLBACK_UUIDS } from '../../utils/uuid';

interface UseQuoteCheckoutProps {
  request: CustomServiceRequest;
  quote: Quote;
}

export function useQuoteCheckout({ request, quote }: UseQuoteCheckoutProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addresses } = useAddresses();

  // Form selection states
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const normalized = normalizeDateToYYYYMMDD(request?.preferred_date);
    if (normalized) return normalized;
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return tomorrow.toISOString().split('T')[0];
  });

  const [selectedSlot, setSelectedSlot] = useState<string | null>(() => {
    return request?.preferred_time_slot || null;
  });

  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(() => {
    if (request?.address_text) {
      return {
        id: request.address_id || CANONICAL_FALLBACK_UUIDS.ADDRESS_HOME,
        user_id: request.user_id || '',
        label: 'Request Location',
        street: request.address_text,
        city: 'Faisalabad',
        latitude: request.latitude || 31.4504,
        longitude: request.longitude || 73.135,
        is_default: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    return null;
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync selectedAddress when request loads or when user saved addresses arrive
  useEffect(() => {
    if (!selectedAddress) {
      if (request?.address_text) {
        setSelectedAddress({
          id: request.address_id || CANONICAL_FALLBACK_UUIDS.ADDRESS_HOME,
          user_id: request.user_id || '',
          label: 'Request Location',
          street: request.address_text,
          city: 'Faisalabad',
          latitude: request.latitude || 31.4504,
          longitude: request.longitude || 73.135,
          is_default: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else if (addresses && addresses.length > 0) {
        const defaultAddr = addresses.find((a) => a.is_default) || addresses[0];
        setSelectedAddress({
          id: defaultAddr.id,
          user_id: '',
          label: defaultAddr.label || 'Home',
          street: defaultAddr.address_line,
          city: defaultAddr.city || 'Faisalabad',
          latitude: defaultAddr.lat || 31.4504,
          longitude: defaultAddr.lng || 73.135,
          is_default: defaultAddr.is_default,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
  }, [
    request?.address_id,
    request?.address_text,
    request?.user_id,
    request?.latitude,
    request?.longitude,
    addresses,
    selectedAddress,
  ]);

  // Sync date & slot when request arrives
  useEffect(() => {
    const normalized = normalizeDateToYYYYMMDD(request?.preferred_date);
    if (normalized && !selectedDate) {
      setSelectedDate(normalized);
    }
  }, [request?.preferred_date, selectedDate]);

  useEffect(() => {
    if (request?.preferred_time_slot && !selectedSlot) {
      setSelectedSlot(request.preferred_time_slot);
    }
  }, [request?.preferred_time_slot, selectedSlot]);

  const checkoutMutation = useMutation<BookingFromQuoteResponse, Error, void>({
    mutationFn: async () => {
      if (!quote?.id) {
        throw new Error('Quote reference is missing. Please reload the page.');
      }
      if (!selectedDate) {
        throw new Error('Please select an appointment date from the calendar.');
      }
      if (!selectedSlot) {
        throw new Error('Please select an arrival time slot.');
      }
      if (!selectedAddress) {
        throw new Error('Please select a service delivery address.');
      }

      if (selectedAddress.latitude && selectedAddress.longitude) {
        const check = validateServiceArea({
          lat: selectedAddress.latitude,
          lng: selectedAddress.longitude,
        });
        if (!check.isServiceable) {
          throw new Error(SERVICE_UNAVAILABLE_MESSAGE);
        }
      }

      // Convert local date + time slot ("10:00 AM", "14:30", "10:00 - 12:00") into canonical ISO UTC
      const scheduledAt = slotToUTCISO(selectedDate, selectedSlot);
      const validAddressId = isValidUUID(selectedAddress.id)
        ? selectedAddress.id
        : CANONICAL_FALLBACK_UUIDS.ADDRESS_HOME;

      const payload: CreateBookingFromQuoteDto = {
        quote_id: quote.id,
        scheduled_at: scheduledAt,
        duration_hours: Number(quote.estimated_duration_hours || 2),
        address_id: validAddressId,
        address_text: `${selectedAddress.street}${selectedAddress.city ? `, ${selectedAddress.city}` : ''}`,
        latitude: selectedAddress.latitude || 31.4504,
        longitude: selectedAddress.longitude || 73.135,
        payment_method: 'CASH_ON_DELIVERY',
      };

      return await customRequestApi.createBookingFromQuote(payload);
    },
    onSuccess: (result) => {
      setValidationError(null);
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['custom-requests'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });

      // Navigate to booking success without polluting or clearing cart
      const bookingId = result?.booking?.id;
      if (bookingId) {
        router.replace({
          pathname: '/booking/success' as any,
          params: { bookingId },
        });
      } else {
        router.replace('/(tabs)/bookings' as any);
      }
    },
    onError: (err: any) => {
      const code = err?.response?.data?.error?.code;
      const apiMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Unable to confirm booking. Please try again.';

      setValidationError(apiMsg);

      if (code === 'CONCURRENT_BOOKING_LOCK') {
        Alert.alert(
          'Slot Reserved',
          'This professional’s time slot was just booked by another customer. Please select another slot.'
        );
      } else if (code === 'BOOKING_ALREADY_CREATED') {
        Alert.alert('Already Confirmed', 'A booking has already been created from this quote.');
        router.replace('/(tabs)/bookings' as any);
      } else {
        Alert.alert('Checkout Failed', apiMsg);
      }
    },
  });

  const confirmBooking = useCallback(() => {
    setValidationError(null);

    if (!quote?.id) {
      const msg = 'Quote reference is missing. Please reload the quote page.';
      setValidationError(msg);
      Alert.alert('Checkout Notice', msg);
      return;
    }
    if (!selectedDate) {
      const msg = 'Please choose an appointment date from the calendar.';
      setValidationError(msg);
      Alert.alert('Checkout Notice', msg);
      return;
    }
    if (!selectedSlot) {
      const msg = 'Please choose an arrival time slot above.';
      setValidationError(msg);
      Alert.alert('Checkout Notice', msg);
      return;
    }
    if (!selectedAddress) {
      const msg = 'Please select or add a service delivery address.';
      setValidationError(msg);
      Alert.alert('Checkout Notice', msg);
      return;
    }

    checkoutMutation.mutate();
  }, [quote?.id, selectedDate, selectedSlot, selectedAddress, checkoutMutation]);

  return {
    selectedDate,
    setSelectedDate,
    selectedSlot,
    setSelectedSlot,
    selectedAddress,
    setSelectedAddress,
    validationError,
    setValidationError,
    confirmBooking,
    isSubmitting: checkoutMutation.isPending,
  };
}
