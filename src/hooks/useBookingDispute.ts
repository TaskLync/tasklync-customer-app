import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingApi } from '../services/api/booking.api';
import { DisputeDetails } from '../types/booking.types';

export function useBookingDispute(bookingId?: string | null) {
  const queryClient = useQueryClient();

  const disputeQuery = useQuery<DisputeDetails | null, Error>({
    queryKey: ['booking-dispute', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      return await bookingApi.getDispute(bookingId);
    },
    enabled: Boolean(bookingId),
    retry: false, // 404 indicates no dispute has been filed; do not retry
    staleTime: 1000 * 30, // 30s cache
  });

  const openDisputeMutation = useMutation({
    mutationFn: async ({
      id,
      reason,
      description,
      evidenceUrls,
    }: {
      id: string;
      reason: string;
      description?: string | undefined;
      evidenceUrls?: string[] | undefined;
    }) => {
      return await bookingApi.openDispute(id, reason, description, evidenceUrls);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking-dispute', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['booking-details', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['bookings-list'] });
    },
  });

  return {
    dispute: disputeQuery.data ?? null,
    isDisputeLoading: disputeQuery.isLoading,
    openDispute: openDisputeMutation.mutateAsync,
    isSubmittingDispute: openDisputeMutation.isPending,
    disputeError: openDisputeMutation.error
      ? (openDisputeMutation.error as Error).message
      : null,
  };
}
