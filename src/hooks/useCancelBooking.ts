import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingApi } from '../services/api/booking.api';
import { BookingDetails, CancelBookingData } from '../types/booking.types';
import { computeRefundPolicy } from '../utils/refundPolicy';
import { usePricingConfig } from './usePricingConfig';

export function useCancelBooking(booking?: Partial<BookingDetails> | null) {
  const queryClient = useQueryClient();
  // Cancellation fee settings come from the admin dashboard (via the server), never from the app.
  const { data: pricingConfig } = usePricingConfig();
  const terms = pricingConfig?.cancellation ?? null;

  const refundPolicy = useMemo(() => {
    return computeRefundPolicy(booking, terms);
  }, [booking, terms]);

  const mutation = useMutation<CancelBookingData, Error, { bookingId: string; reason: string }>({
    mutationFn: async ({ bookingId, reason }) => {
      return await bookingApi.cancelBooking(bookingId, reason);
    },
    onSuccess: (_, variables) => {

      queryClient.invalidateQueries({ queryKey: ['bookings-list'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking-details', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking-track', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['active-booking'] });
    },
  });

  return {
    cancelBooking: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error ? (mutation.error as Error).message : null,
    refundPolicy,
  };
}
