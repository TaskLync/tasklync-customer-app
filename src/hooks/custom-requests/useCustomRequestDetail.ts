import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { customRequestApi } from '../../services/api/customRequest.api';
import {
  CustomServiceRequest,
  CustomServiceRequestMedia,
  CustomRequestStatus,
  Quote,
} from '../../types/customRequest.types';
import { showAlert } from '../../components/feedback/AppAlert';

export function useCustomRequestDetail(id: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['custom-requests', id],
    queryFn: () => customRequestApi.getRequestById(id),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.request?.status;
      // Auto-poll while waiting for worker response
      if (
        status === CustomRequestStatus.SUBMITTED ||
        status === CustomRequestStatus.UNDER_REVIEW ||
        status === CustomRequestStatus.CLARIFICATION_REQUESTED
      ) {
        return 10000; // 10 seconds
      }
      return false;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => customRequestApi.cancelRequest(id, reason),
    onSuccess: (updated) => {
      queryClient.setQueryData(['custom-requests', id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          request: {
            ...old.request,
            status: CustomRequestStatus.CANCELLED,
            cancellation_reason: updated.cancellation_reason,
            cancelled_by: 'USER',
          },
        };
      });
      queryClient.invalidateQueries({ queryKey: ['custom-requests'] });
      showAlert('Request Cancelled', 'Your custom service request has been cancelled.');
    },
    onError: (err: any) => {
      showAlert('Cancellation Failed', err?.message || 'Could not cancel request. Please try again.');
    },
  });

  const request: CustomServiceRequest | undefined = query.data?.request;
  const media: CustomServiceRequestMedia[] = query.data?.media || request?.media || [];
  const activeQuote: Quote | null = query.data?.activeQuote || request?.active_quote || null;

  return {
    request,
    media,
    activeQuote,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    cancelRequest: cancelMutation.mutate,
    isCancelling: cancelMutation.isPending,
  };
}
