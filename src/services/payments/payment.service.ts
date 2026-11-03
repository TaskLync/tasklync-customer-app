import { paymentApi } from '../api/payment.api';
import {
  PaymentMethod,
  AddWalletDTO,
  AddCardDTO,
  ONLINE_PAYMENTS_DISABLED_MESSAGE,
} from '../../types/payment.types';

/**
 * Authoritative Standard Payment Method: Cash on Delivery (COD)
 * All online payment gateways are safely disconnected as per CUSTOMER_APP_PAYMENT_APIS.md
 */
export const COD_PAYMENT_METHOD: PaymentMethod = {
  id: 'CASH_ON_DELIVERY',
  type: 'cash',
  brand: 'cash',
  title: 'Cash on Delivery',
  subtitle: 'Pay after service completion',
  is_default: true,
  isDefault: true,
  is_fixed: true,
  is_enabled: true,
  isEnabled: true,
};

export const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [COD_PAYMENT_METHOD];

export const paymentService = {
  /**
   * Fetch all payment methods.
   * Cash on Delivery is strictly the active default method.
   * Any remote saved payment instruments are loaded with disabled flags.
   */
  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    try {
      const remoteMethods = await paymentApi.getSavedPaymentMethods();
      if (Array.isArray(remoteMethods) && remoteMethods.length > 0) {
        const mappedRemote: PaymentMethod[] = remoteMethods.map((item) => {
          const isWallet = item.type?.toLowerCase().includes('wallet');
          const isJazz = item.type?.toLowerCase().includes('jazzcash');
          const isEasy = item.type?.toLowerCase().includes('easypaisa');
          const brand = isJazz ? 'jazzcash' : isEasy ? 'easypaisa' : 'visa';

          return {
            id: item.id,
            type: isWallet ? 'wallet' : 'card',
            brand,
            title: item.display_name || (isWallet ? 'Mobile Wallet' : 'Saved Card'),
            subtitle: item.masked_number || '••••',
            account_number: isWallet ? item.masked_number : undefined,
            last4: !isWallet ? item.masked_number?.slice(-4) : undefined,
            is_default: false, // In COD mode, COD is strictly the active default
            isDefault: false,
            is_fixed: false,
            is_enabled: false, // Safely disconnected
            isEnabled: false,
            disabled_reason: ONLINE_PAYMENTS_DISABLED_MESSAGE,
          };
        });

        return [COD_PAYMENT_METHOD, ...mappedRemote];
      }
    } catch (_e) {
      // Fallback cleanly to COD only — zero fake/demo accounts injected
    }
    return [COD_PAYMENT_METHOD];
  },

  /**
   * Online Wallet addition is explicitly disabled by platform policy
   */
  addWalletMethod: async (_dto: AddWalletDTO): Promise<PaymentMethod> => {
    throw new Error(ONLINE_PAYMENTS_DISABLED_MESSAGE);
  },

  /**
   * Online Card addition is explicitly disabled by platform policy
   */
  addCardMethod: async (_dto: AddCardDTO): Promise<PaymentMethod> => {
    throw new Error(ONLINE_PAYMENTS_DISABLED_MESSAGE);
  },

  /**
   * Delete / Detach a payment method
   */
  deletePaymentMethod: async (id: string): Promise<void> => {
    if (id === 'CASH_ON_DELIVERY' || id === 'pm_cod' || id === 'CASH') {
      throw new Error('Cash on Delivery is the standard platform payment method and cannot be removed.');
    }
    await paymentApi.deletePaymentMethod(id);
  },

  /**
   * Set default payment method
   */
  setDefaultPaymentMethod: async (id: string): Promise<void> => {
    if (id === 'CASH_ON_DELIVERY' || id === 'pm_cod' || id === 'CASH') {
      return; // Already default
    }
    // Remote online methods cannot be set as active default while disabled
    throw new Error(ONLINE_PAYMENTS_DISABLED_MESSAGE);
  },
};
