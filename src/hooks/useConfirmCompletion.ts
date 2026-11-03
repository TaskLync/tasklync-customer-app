import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingApi } from '../services/api/booking.api';

export function useConfirmCompletion() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return await bookingApi.confirmCompletion(bookingId);
    },
    onSuccess: (_data, bookingId) => {
      // Backend is the source of truth: invalidate and let the refetch supply the final status
      // instead of optimistically writing COMPLETED into the cache.
      queryClient.invalidateQueries({ queryKey: ['bookings-list'] });
      queryClient.invalidateQueries({ queryKey: ['booking-details', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking-track', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['active-booking'] });
    },
  });

  return {
    confirmCompletion: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error ? (mutation.error as Error).message : null,
  };
}
