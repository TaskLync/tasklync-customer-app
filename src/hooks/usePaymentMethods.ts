import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService, COD_PAYMENT_METHOD, DEFAULT_PAYMENT_METHODS } from '../services/payments/payment.service';
import { PaymentMethod, AddWalletDTO, AddCardDTO } from '../types/payment.types';

export const PAYMENT_METHODS_QUERY_KEY = ['payment-methods'];

function sortWithDefaultFirst(methods: PaymentMethod[]): PaymentMethod[] {
  return [...methods].sort((a, b) => {
    if (a.is_default && !b.is_default) return -1;
    if (!a.is_default && b.is_default) return 1;
    return 0;
  });
}

export function usePaymentMethods() {
  const queryClient = useQueryClient();

  // 1. Fetch saved payment methods query (Cash on Delivery is authoritative active default)
  const query = useQuery<PaymentMethod[]>({
    queryKey: PAYMENT_METHODS_QUERY_KEY,
    queryFn: async (): Promise<PaymentMethod[]> => {
      const data = await paymentService.getPaymentMethods();
      return sortWithDefaultFirst(data || DEFAULT_PAYMENT_METHODS);
    },
    staleTime: 60_000,
  });

  // 2. Add Mobile Wallet Mutation (Online platforms safely disabled)
  const addWalletMutation = useMutation({
    mutationFn: async (dto: AddWalletDTO) => {
      return await paymentService.addWalletMethod(dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY });
    },
  });

  // 3. Add Card Mutation (Online platforms safely disabled)
  const addCardMutation = useMutation({
    mutationFn: async (dto: AddCardDTO) => {
      return await paymentService.addCardMethod(dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY });
    },
  });

  // 4. Delete Payment Method Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await paymentService.deletePaymentMethod(id);
    },
    onMutate: async (idToDelete) => {
      await queryClient.cancelQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY });
      const prev = queryClient.getQueryData<PaymentMethod[]>(PAYMENT_METHODS_QUERY_KEY) || DEFAULT_PAYMENT_METHODS;

      const filtered = prev.filter((m) => m.id !== idToDelete);
      // Ensure COD is always present and default
      const withCod = filtered.some((m) => m.type === 'cash')
        ? filtered
        : [COD_PAYMENT_METHOD, ...filtered];

      const adjusted = withCod.map((m) => ({
        ...m,
        is_default: m.type === 'cash' || m.id === 'CASH_ON_DELIVERY',
      }));

      queryClient.setQueryData<PaymentMethod[]>(PAYMENT_METHODS_QUERY_KEY, sortWithDefaultFirst(adjusted));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(PAYMENT_METHODS_QUERY_KEY, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY });
    },
  });

  // 5. Set Default Payment Method Mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await paymentService.setDefaultPaymentMethod(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY });
    },
  });

  return {
    methods: query.data || DEFAULT_PAYMENT_METHODS,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    addWallet: addWalletMutation.mutateAsync,
    addCard: addCardMutation.mutateAsync,
    deleteMethod: deleteMutation.mutateAsync,
    setDefaultMethod: setDefaultMutation.mutateAsync,
    isAdding: addWalletMutation.isPending || addCardMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
