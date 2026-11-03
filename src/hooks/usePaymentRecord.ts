import { useQuery } from '@tanstack/react-query';
import { paymentApi } from '../services/api/payment.api';
import { PaymentRecord } from '../types/payment.types';

export const PAYMENT_RECORD_QUERY_KEY = 'payment-record';

export function usePaymentRecord(bookingId?: string | null) {
  const query = useQuery<PaymentRecord>({
    queryKey: [PAYMENT_RECORD_QUERY_KEY, bookingId],
    queryFn: async () => {
      if (!bookingId) throw new Error('Booking ID is required');
      return await paymentApi.getPaymentByBookingId(bookingId);
    },
    enabled: Boolean(bookingId && !bookingId.startsWith('b-') && !bookingId.startsWith('TL-')),
    staleTime: 30_000,
  });

  return {
    payment: query.data || null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
