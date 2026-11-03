import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingApi } from '../services/api/booking.api';
import { DisputeDetails, DisputeReason } from '../types/booking.types';

export interface OpenDisputeArgs {
  bookingId: string;
  reason: DisputeReason | string;
  description?: string | undefined;
  evidenceUrls?: string[] | undefined;
}

export function useDispute(bookingId?: string | null) {
  const queryClient = useQueryClient();

  const disputeQuery = useQuery<DisputeDetails | null, Error>({
    queryKey: ['booking-dispute', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      return await bookingApi.getDispute(bookingId);
    },
    enabled: Boolean(bookingId),
    retry: false,
    staleTime: 1000 * 30,
  });

  const openMutation = useMutation<DisputeDetails, Error, OpenDisputeArgs>({
    mutationFn: async ({ bookingId: targetId, reason, description, evidenceUrls }) => {
      const finalReason = reason || 'work_not_completed';
      const finalDesc =
        description && description.trim().length > 0
          ? description.trim()
          : `Dispute filed regarding ${finalReason.replace(/_/g, ' ')}.`;

      return await bookingApi.openDispute(targetId, finalReason, finalDesc, evidenceUrls);
    },
    onSuccess: (_, variables) => {

      queryClient.invalidateQueries({ queryKey: ['booking-dispute', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking-details', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking-track', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings-list'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['active-booking'] });
    },
  });

  const respondMutation = useMutation<DisputeDetails, Error, { bookingId: string; responseText: string }>({
    mutationFn: async ({ bookingId: targetId, responseText }) => {
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('Response message cannot be empty.');
      }
      return await bookingApi.respondToDispute(targetId, responseText);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking-dispute', variables.bookingId] });
    },
  });

  return {
    dispute: disputeQuery.data,
    isLoadingDispute: disputeQuery.isLoading,
    openDispute: openMutation.mutateAsync,
    isSubmitting: openMutation.isPending,
    isSuccess: openMutation.isSuccess,
    error: openMutation.error ? openMutation.error.message : null,
    resetSubmit: openMutation.reset,
    respondToDispute: respondMutation.mutateAsync,
    isResponding: respondMutation.isPending,
  };
}
