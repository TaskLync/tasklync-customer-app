import { useQuery } from '@tanstack/react-query';
import { fetchInvoice } from '../services/invoice/invoice.service';
import { InvoiceData } from '../types/booking.types';

/**
 * useInvoice Hook
 *
 * Implements immutable query fetching for post-booking financial receipts/invoices.
 * - Discriminated union return (kind: 'structured' | 'pdf')
 * - StaleTime set to Infinity because settled booking invoices are immutable records
 */
export function useInvoice(bookingId?: string | null) {
  const query = useQuery<InvoiceData, Error>({
    queryKey: ['booking', bookingId, 'invoice'],
    queryFn: async () => {
      if (!bookingId) {
        throw new Error('Booking ID is required to fetch invoice');
      }
      return await fetchInvoice(bookingId);
    },
    enabled: Boolean(bookingId),
    // Payment status can move (PENDING -> PAID / REFUNDED), so the invoice is re-checked on revisit.
    staleTime: 60_000,
  });

  return {
    invoice: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? query.error.message : null,
    refetch: query.refetch,
  };
}
