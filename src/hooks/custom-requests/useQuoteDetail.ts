import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { customRequestApi } from '../../services/api/customRequest.api';
import { Quote, QuoteRevision, QuoteStatus } from '../../types/customRequest.types';

export function useQuoteDetail(requestId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const query = useQuery({
    queryKey: ['custom-requests', requestId, 'quotes'],
    queryFn: () => customRequestApi.getQuotesForRequest(requestId),
    enabled: Boolean(requestId),
  });

  const quotes: Quote[] = query.data?.quotes || [];
  const revisions: QuoteRevision[] = query.data?.revisions || [];

  // Active quote is either the one in SENT status, or ACCEPTED if already accepted
  const activeQuote =
    quotes.find((q) => q.status === QuoteStatus.SENT) ||
    quotes.find((q) => q.status === QuoteStatus.ACCEPTED) ||
    quotes[0] ||
    null;

  const acceptMutation = useMutation({
    mutationFn: (quoteId: string) => customRequestApi.acceptQuote(quoteId),
    onSuccess: (acceptedQuote) => {
      queryClient.invalidateQueries({ queryKey: ['custom-requests', requestId] });
      queryClient.invalidateQueries({ queryKey: ['custom-requests', requestId, 'quotes'] });
      // Direct transition to dedicated checkout funnel
      router.push(`/custom-request/${requestId}/checkout` as any);
    },
    onError: (err: any) => {
      Alert.alert('Acceptance Error', err?.message || 'Could not accept quote. Please try again.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ quoteId, reason }: { quoteId: string; reason?: string }) =>
      customRequestApi.rejectQuote(quoteId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-requests', requestId] });
      queryClient.invalidateQueries({ queryKey: ['custom-requests', requestId, 'quotes'] });
      Alert.alert('Quote Declined', 'The professional has been notified. They may issue an updated quote.');
    },
    onError: (err: any) => {
      Alert.alert('Decline Error', err?.message || 'Could not decline quote. Please try again.');
    },
  });

  return {
    activeQuote,
    quotes,
    revisions,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    acceptQuote: acceptMutation.mutate,
    isAccepting: acceptMutation.isPending,
    rejectQuote: rejectMutation.mutate,
    isRejecting: rejectMutation.isPending,
  };
}
