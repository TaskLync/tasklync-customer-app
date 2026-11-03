import { apiClient } from './client';
import {
  PaymentInitiatePayload,
  PaymentInitiateResponse,
  PaymentRecord,
  PaymentHistoryResponse,
  SavedPaymentMethodDto,
  CreatePaymentMethodPayload,
} from '../../types/payment.types';
import { extractPaymentErrorMessage } from '../../utils/paymentStatus';

export interface SavedPaymentMethod {
  id: string;
  type?: 'cash' | 'wallet' | 'card';
  brand?: 'visa' | 'mastercard' | 'amex' | 'discover' | 'cash' | 'jazzcash' | 'easypaisa';
  last4?: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
  isEnabled?: boolean;
  disabledReason?: string;
  holderName?: string;
  title?: string;
  subtitle?: string;
}

// Active Mode: Cash on Delivery (Online gateways safely disconnected)
export const STANDARD_PAYMENT_METHODS: SavedPaymentMethod[] = [
  {
    id: 'CASH',
    type: 'cash',
    brand: 'cash',
    title: 'Cash on Delivery',
    subtitle: 'Pay cash to professional upon service completion',
    isDefault: true,
    isEnabled: true,
  },
];

export const paymentApi = {
  /**
   * Module 9.5: Initiate Booking Checkout / Payment
   * POST /api/v1/payments/initiate
   * Defaults to CASH_ON_DELIVERY
   */
  initiatePayment: async (payload: PaymentInitiatePayload): Promise<PaymentInitiateResponse> => {
    const bookingId = payload.booking_id;
    if (!bookingId || bookingId.startsWith('b-') || bookingId.startsWith('TL-')) {
      throw new Error('Invalid booking reference. Payment cannot be initiated for unconfirmed or fake bookings.');
    }

    try {
      const response = await apiClient.post<any>('/payments/initiate', {
        booking_id: bookingId,
        method: payload.method || 'CASH_ON_DELIVERY',
        amount: payload.amount,
        worker_id: payload.worker_id,
        phone_number: payload.phone_number,
        saved_method_id: payload.saved_method_id,
      });

      const data = response.data?.data || response.data;
      if (data && typeof data === 'object') {
        return {
          ...data,
          success: true,
        };
      }
      return {
        payment_id: `pay_${Date.now()}`,
        booking_id: bookingId,
        amount: payload.amount || 0,
        currency: 'PKR',
        method: payload.method || 'CASH_ON_DELIVERY',
        status: 'PENDING',
        success: true,
        instructions: {
          type: 'cod',
          message: 'Pay cash directly to the worker upon service completion. The worker will confirm receipt in-app.',
        },
      };
    } catch (err: any) {
      const userMessage = extractPaymentErrorMessage(err);
      throw new Error(userMessage);
    }
  },

  /**
   * Module 9.6: Get Payment Record by Payment ID
   * GET /api/v1/payments/:id
   */
  getPaymentById: async (id: string): Promise<PaymentRecord> => {
    try {
      const response = await apiClient.get<any>(`/payments/${id}`);
      return response.data?.data || response.data;
    } catch (err: any) {
      throw new Error(extractPaymentErrorMessage(err));
    }
  },

  /**
   * Module 9.7: Get Payment Record by Booking ID
   * GET /api/v1/payments/booking/:bookingId
   */
  getPaymentByBookingId: async (bookingId: string): Promise<PaymentRecord> => {
    try {
      const response = await apiClient.get<any>(`/payments/booking/${bookingId}`);
      return response.data?.data || response.data;
    } catch (err: any) {
      throw new Error(extractPaymentErrorMessage(err));
    }
  },

  /**
   * Module 9.8: Customer Payment History
   * GET /api/v1/payments/history
   */
  getPaymentHistory: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<PaymentHistoryResponse> => {
    try {
      const response = await apiClient.get<any>('/payments/history', {
        params: {
          page: params?.page || 1,
          limit: params?.limit || 20,
          status: params?.status,
        },
      });
      return response.data?.data || response.data || { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } };
    } catch (err: any) {
      throw new Error(extractPaymentErrorMessage(err));
    }
  },

  /**
   * Module 9.1: List Customer's Saved Payment Methods
   * GET /api/v1/payment-methods
   */
  getSavedPaymentMethods: async (): Promise<SavedPaymentMethodDto[]> => {
    try {
      const response = await apiClient.get<any>('/payment-methods');
      const rawList = response.data?.data || response.data || [];
      return Array.isArray(rawList) ? rawList : [];
    } catch (_error) {
      return [];
    }
  },

  /**
   * Module 9.2: Save a Payment Method
   * POST /api/v1/payment-methods
   */
  savePaymentMethod: async (payload: CreatePaymentMethodPayload): Promise<SavedPaymentMethodDto> => {
    try {
      const response = await apiClient.post<any>('/payment-methods', payload);
      return response.data?.data || response.data;
    } catch (err: any) {
      throw new Error(extractPaymentErrorMessage(err));
    }
  },

  /**
   * Module 9.3: Set Default Payment Method
   * PATCH /api/v1/payment-methods/:id/default
   */
  setDefaultPaymentMethod: async (id: string): Promise<void> => {
    try {
      await apiClient.patch(`/payment-methods/${id}/default`);
    } catch (err: any) {
      throw new Error(extractPaymentErrorMessage(err));
    }
  },

  /**
   * Module 9.4: Delete Saved Payment Method
   * DELETE /api/v1/payment-methods/:id
   */
  deletePaymentMethod: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/payment-methods/${id}`);
    } catch (err: any) {
      throw new Error(extractPaymentErrorMessage(err));
    }
  },

  /**
   * Backward Compatibility: List Saved Methods with COD as active standard
   */
  getSavedMethods: async (): Promise<SavedPaymentMethod[]> => {
    try {
      const remoteMethods = await paymentApi.getSavedPaymentMethods();
      const mappedRemote: SavedPaymentMethod[] = remoteMethods.map((m) => ({
        id: m.id,
        type: m.type?.toLowerCase().includes('wallet') ? 'wallet' : 'card',
        brand: m.type?.toLowerCase().includes('jazzcash')
          ? 'jazzcash'
          : m.type?.toLowerCase().includes('easypaisa')
          ? 'easypaisa'
          : 'visa',
        title: m.display_name || 'Saved Method',
        subtitle: m.masked_number || '••••',
        isDefault: Boolean(m.is_default),
        isEnabled: false,
        disabledReason: 'Online payments temporarily disabled',
      }));

      return [...STANDARD_PAYMENT_METHODS, ...mappedRemote];
    } catch (_error) {
      return STANDARD_PAYMENT_METHODS;
    }
  },
};
