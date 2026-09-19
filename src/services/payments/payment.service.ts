import { apiClient } from '../api/client';
import {
  PaymentMethod,
  AddWalletDTO,
  AddCardDTO,
} from '../../types/payment.types';
import { generateUUID } from '../../utils/uuid';

export const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'pm_cod',
    type: 'cash',
    brand: 'cash',
    title: 'Cash on Delivery',
    subtitle: 'Pay cash to professional after service completion',
    is_default: true,
    is_fixed: true,
  },
  {
    id: 'pm_jazzcash_default',
    type: 'wallet',
    brand: 'jazzcash',
    title: 'JazzCash Wallet',
    subtitle: '0300 •••• 5678',
    account_number: '0300 •••• 5678',
    holder_name: 'Customer Account',
    is_default: false,
  },
  {
    id: 'pm_easypaisa_default',
    type: 'wallet',
    brand: 'easypaisa',
    title: 'EasyPaisa Wallet',
    subtitle: '0345 •••• 1234',
    account_number: '0345 •••• 1234',
    holder_name: 'Customer Account',
    is_default: false,
  },
];

export const paymentService = {
  /**
   * Fetch all saved payment methods (COD, JazzCash, EasyPaisa, Saved Cards)
   */
  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    try {
      const response = await apiClient.get<any>('/payments/methods');
      const raw = response.data?.data || response.data;
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((item: any) => ({
          id: item.id || generateUUID(),
          type: item.type || 'card',
          brand: (item.brand || 'visa').toLowerCase(),
          title: item.title || (item.brand ? `${item.brand.toUpperCase()} Card` : 'Payment Method'),
          subtitle:
            item.subtitle ||
            (item.last4 ? `•••• ${item.last4} · Exp ${item.exp_month || 12}/${item.exp_year || 28}` : 'Saved Method'),
          account_number: item.account_number,
          last4: item.last4,
          exp_month: item.exp_month,
          exp_year: item.exp_year,
          holder_name: item.holder_name,
          is_default: Boolean(item.is_default),
          is_fixed: item.id === 'pm_cod' || item.type === 'cash',
        }));
      }
    } catch (_e) {
      // Fallback to local default methods
    }
    return DEFAULT_PAYMENT_METHODS;
  },

  /**
   * Add a Mobile Wallet (JazzCash or EasyPaisa)
   */
  addWalletMethod: async (dto: AddWalletDTO): Promise<PaymentMethod> => {
    const rawNumber = dto.accountNumber.replace(/\D/g, '');
    const masked = rawNumber.length >= 4 
      ? `${rawNumber.slice(0, 4)} •••• ${rawNumber.slice(-4)}`
      : rawNumber;

    const brand = dto.provider;
    const title = brand === 'jazzcash' ? 'JazzCash Wallet' : 'EasyPaisa Wallet';

    try {
      const response = await apiClient.post<any>('/payments/methods/wallet', {
        provider: dto.provider,
        account_number: dto.accountNumber,
        account_title: dto.accountTitle,
        is_default: Boolean(dto.isDefault),
      });
      const data = response.data?.data || response.data;
      return {
        id: data?.id || `pm_wallet_${Date.now()}`,
        type: 'wallet',
        brand,
        title,
        subtitle: masked,
        account_number: masked,
        holder_name: dto.accountTitle,
        is_default: Boolean(dto.isDefault),
      };
    } catch {
      return {
        id: `pm_wallet_${Date.now()}`,
        type: 'wallet',
        brand,
        title,
        subtitle: masked,
        account_number: masked,
        holder_name: dto.accountTitle,
        is_default: Boolean(dto.isDefault),
      };
    }
  },

  /**
   * Add a Credit or Debit Card
   */
  addCardMethod: async (dto: AddCardDTO): Promise<PaymentMethod> => {
    const cleanNum = dto.cardNumber.replace(/\s/g, '');
    const last4 = cleanNum.slice(-4) || '4242';
    
    // Determine card brand
    let brand: any = 'visa';
    if (cleanNum.startsWith('5') || cleanNum.startsWith('2')) brand = 'mastercard';
    if (cleanNum.startsWith('3')) brand = 'amex';
    if (cleanNum.startsWith('62') || cleanNum.startsWith('81')) brand = 'unionpay';
    if (cleanNum.startsWith('60') || cleanNum.startsWith('9')) brand = 'paypak';

    const brandName = brand.charAt(0).toUpperCase() + brand.slice(1);

    try {
      const response = await apiClient.post<any>('/payments/methods/card', {
        card_number: cleanNum,
        exp_month: dto.expMonth,
        exp_year: dto.expYear,
        cvc: dto.cvc,
        cardholder_name: dto.cardholderName,
        is_default: Boolean(dto.isDefault),
      });
      const data = response.data?.data || response.data;
      return {
        id: data?.id || `pm_card_${Date.now()}`,
        type: 'card',
        brand,
        title: `${brandName} ending in ${last4}`,
        subtitle: `Expires ${String(dto.expMonth).padStart(2, '0')}/${String(dto.expYear).slice(-2)}`,
        last4,
        exp_month: dto.expMonth,
        exp_year: dto.expYear,
        holder_name: dto.cardholderName,
        is_default: Boolean(dto.isDefault),
      };
    } catch {
      return {
        id: `pm_card_${Date.now()}`,
        type: 'card',
        brand,
        title: `${brandName} ending in ${last4}`,
        subtitle: `Expires ${String(dto.expMonth).padStart(2, '0')}/${String(dto.expYear).slice(-2)}`,
        last4,
        exp_month: dto.expMonth,
        exp_year: dto.expYear,
        holder_name: dto.cardholderName,
        is_default: Boolean(dto.isDefault),
      };
    }
  },

  /**
   * Delete / Detach a payment method
   */
  deletePaymentMethod: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/payments/methods/${id}`);
    } catch (_e) {
      // Allow optimistic removal
    }
  },

  /**
   * Set default payment method
   */
  setDefaultPaymentMethod: async (id: string): Promise<void> => {
    try {
      await apiClient.patch(`/payments/methods/${id}/default`);
    } catch (_e) {
      // Allow optimistic update
    }
  },
};
