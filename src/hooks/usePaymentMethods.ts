import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService, DEFAULT_PAYMENT_METHODS } from '../services/payments/payment.service';
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

  // 1. Fetch saved payment methods query
  const query = useQuery<PaymentMethod[]>({
    queryKey: PAYMENT_METHODS_QUERY_KEY,
    queryFn: async (): Promise<PaymentMethod[]> => {
      const data = await paymentService.getPaymentMethods();
      return sortWithDefaultFirst(data || DEFAULT_PAYMENT_METHODS);
    },
    staleTime: 60_000,
  });

  // 2. Add Mobile Wallet Mutation (JazzCash / EasyPaisa)
  const addWalletMutation = useMutation({
    mutationFn: async (dto: AddWalletDTO) => {
      return await paymentService.addWalletMethod(dto);
    },
    onMutate: async (newWallet) => {
      await queryClient.cancelQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY });
      const prev = queryClient.getQueryData<PaymentMethod[]>(PAYMENT_METHODS_QUERY_KEY) || DEFAULT_PAYMENT_METHODS;

      const rawNum = newWallet.accountNumber.replace(/\D/g, '');
      const masked = rawNum.length >= 4 
        ? `${rawNum.slice(0, 4)} •••• ${rawNum.slice(-4)}`
        : rawNum;
      
      const optimisticItem: PaymentMethod = {
        id: `pm_wallet_${Date.now()}`,
        type: 'wallet',
        brand: newWallet.provider,
        title: newWallet.provider === 'jazzcash' ? 'JazzCash Wallet' : 'EasyPaisa Wallet',
        subtitle: masked,
        account_number: masked,
        holder_name: newWallet.accountTitle,
        is_default: Boolean(newWallet.isDefault),
      };

      const updated = newWallet.isDefault
        ? [optimisticItem, ...prev.map((m) => ({ ...m, is_default: false }))]
        : [...prev, optimisticItem];

      queryClient.setQueryData<PaymentMethod[]>(PAYMENT_METHODS_QUERY_KEY, sortWithDefaultFirst(updated));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(PAYMENT_METHODS_QUERY_KEY, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY });
    },
  });

  // 3. Add Card Mutation
  const addCardMutation = useMutation({
    mutationFn: async (dto: AddCardDTO) => {
      return await paymentService.addCardMethod(dto);
    },
    onMutate: async (newCard) => {
      await queryClient.cancelQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY });
      const prev = queryClient.getQueryData<PaymentMethod[]>(PAYMENT_METHODS_QUERY_KEY) || DEFAULT_PAYMENT_METHODS;

      const cleanNum = newCard.cardNumber.replace(/\s/g, '');
      const last4 = cleanNum.slice(-4) || '4242';
      let brand: any = 'visa';
      if (cleanNum.startsWith('5') || cleanNum.startsWith('2')) brand = 'mastercard';
      if (cleanNum.startsWith('3')) brand = 'amex';
      if (cleanNum.startsWith('62') || cleanNum.startsWith('81')) brand = 'unionpay';
      if (cleanNum.startsWith('60') || cleanNum.startsWith('9')) brand = 'paypak';

      const brandName = brand.charAt(0).toUpperCase() + brand.slice(1);

      const optimisticItem: PaymentMethod = {
        id: `pm_card_${Date.now()}`,
        type: 'card',
        brand,
        title: `${brandName} ending in ${last4}`,
        subtitle: `Expires ${String(newCard.expMonth).padStart(2, '0')}/${String(newCard.expYear).slice(-2)}`,
        last4,
        exp_month: newCard.expMonth,
        exp_year: newCard.expYear,
        holder_name: newCard.cardholderName,
        is_default: Boolean(newCard.isDefault),
      };

      const updated = newCard.isDefault
        ? [optimisticItem, ...prev.map((m) => ({ ...m, is_default: false }))]
        : [...prev, optimisticItem];

      queryClient.setQueryData<PaymentMethod[]>(PAYMENT_METHODS_QUERY_KEY, sortWithDefaultFirst(updated));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(PAYMENT_METHODS_QUERY_KEY, ctx.prev);
    },
    onSettled: () => {
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
      // If deleted method was default and we still have items, ensure COD or top item is default
      const hasDefault = filtered.some((m) => m.is_default);
      const adjusted = (!hasDefault && filtered.length > 0)
        ? filtered.map((m, idx) => ({ ...m, is_default: idx === 0 }))
        : filtered;

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
    onMutate: async (defaultId) => {
      await queryClient.cancelQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY });
      const prev = queryClient.getQueryData<PaymentMethod[]>(PAYMENT_METHODS_QUERY_KEY) || DEFAULT_PAYMENT_METHODS;

      const flipped = prev.map((m) => ({
        ...m,
        is_default: m.id === defaultId,
      }));

      queryClient.setQueryData<PaymentMethod[]>(PAYMENT_METHODS_QUERY_KEY, sortWithDefaultFirst(flipped));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(PAYMENT_METHODS_QUERY_KEY, ctx.prev);
    },
    onSettled: () => {
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
