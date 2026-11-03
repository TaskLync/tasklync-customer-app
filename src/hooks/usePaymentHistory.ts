import { useQuery } from '@tanstack/react-query';
import { paymentApi } from '../services/api/payment.api';
import { PaymentHistoryResponse } from '../types/payment.types';

export const PAYMENT_HISTORY_QUERY_KEY = 'payment-history';

export interface UsePaymentHistoryParams {
  page?: number;
  limit?: number;
  status?: string;
}

export function usePaymentHistory(params?: UsePaymentHistoryParams) {
  const query = useQuery<PaymentHistoryResponse>({
    queryKey: [PAYMENT_HISTORY_QUERY_KEY, params?.page, params?.limit, params?.status],
    queryFn: async () => {
      return await paymentApi.getPaymentHistory(params);
    },
    staleTime: 60_000,
  });

  return {
    history: query.data?.data || [],
    meta: query.data?.meta || { page: 1, limit: 20, total: 0, totalPages: 1 },
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
