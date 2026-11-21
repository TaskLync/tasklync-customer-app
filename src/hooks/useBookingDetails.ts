import { useQuery } from '@tanstack/react-query';
import { bookingApi, getPersistedBookings } from '../services/api/booking.api';

export function useBookingDetails(bookingId: string | null | undefined) {
  const query = useQuery({
    queryKey: ['booking-details', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      return await bookingApi.getBookingDetails(bookingId);
    },
    enabled: Boolean(bookingId),
    staleTime: 10_000,
    retry: false,
    // Paint instantly from the last server copy saved on this device (written by getBookingDetails),
    // then refresh from the server straight away: updatedAt 0 marks it stale, so the fetch always runs.
    initialData: () => (bookingId ? getPersistedBookings().find((b) => b.id === bookingId) : undefined),
    initialDataUpdatedAt: 0,
  });

  return {
    booking: query.data,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error,
    refetch: query.refetch,
  };
}
