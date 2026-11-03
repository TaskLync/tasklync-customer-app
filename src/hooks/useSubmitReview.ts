import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewApi } from '../services/api/review.api';
import { CreateReviewPayload, ReviewSubmitPayload, ReviewItem } from '../types/review.types';

export function useSubmitReview() {
  const queryClient = useQueryClient();

  const mutation = useMutation<ReviewItem, Error, CreateReviewPayload | ReviewSubmitPayload>({
    mutationFn: async (payload: CreateReviewPayload | ReviewSubmitPayload) => {
      return reviewApi.submitReview(payload);
    },
    onSuccess: (data, variables) => {
      const bookingId = (variables as CreateReviewPayload).booking_id || (variables as ReviewSubmitPayload).bookingId;
      const workerId = data?.worker_id || (variables as ReviewSubmitPayload).targetId;

      if (workerId) {
        queryClient.invalidateQueries({ queryKey: ['worker', workerId] });
        queryClient.invalidateQueries({ queryKey: ['worker-profile', workerId] });
        queryClient.invalidateQueries({ queryKey: ['worker-reviews', workerId] });
        queryClient.invalidateQueries({ queryKey: ['worker-review-summary', workerId] });
      }

      if (bookingId) {
        queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
        queryClient.invalidateQueries({ queryKey: ['booking-details', bookingId] });
        queryClient.invalidateQueries({ queryKey: ['review-eligibility', bookingId] });
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
      }

      queryClient.invalidateQueries({ queryKey: ['user-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['reviews/pending'] });
    },
  });

  return {
    submitReview: mutation.mutateAsync,
    isSubmitting: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    reset: mutation.reset,
  };
}
