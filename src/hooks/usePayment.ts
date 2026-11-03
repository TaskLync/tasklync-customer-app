import { useState, useCallback } from 'react';
import { paymentApi } from '../services/api/payment.api';
import {
  PaymentInitiatePayload,
  PaymentInitiateResponse,
  PaymentMethodCode,
  ONLINE_PAYMENTS_DISABLED_MESSAGE,
} from '../types/payment.types';
import { extractPaymentErrorMessage } from '../utils/paymentStatus';

export interface InitiatePaymentOptions {
  bookingId: string;
  amount?: number;
  workerId?: string;
  method?: PaymentMethodCode;
}

export function usePayment() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentInitiateResponse | null>(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Primary Checkout Initiation method conforming to CUSTOMER_APP_PAYMENT_APIS.md
   * Exclusively initiates Cash on Delivery (COD)
   */
  const initiateCodPayment = useCallback(
    async (
      bookingId: string,
      amount?: number,
      workerId?: string
    ): Promise<{ success: boolean; data?: PaymentInitiateResponse; error?: string }> => {
      if (!bookingId || bookingId.startsWith('b-') || bookingId.startsWith('TL-')) {
        const msg = 'No valid confirmed booking reference found for payment.';
        setError(msg);
        return { success: false, error: msg };
      }

      setIsLoading(true);
      setError(null);

      try {
        const payload: PaymentInitiatePayload = {
          booking_id: bookingId,
          method: 'CASH_ON_DELIVERY',
        };
        if (amount !== undefined) payload.amount = amount;
        if (workerId !== undefined) payload.worker_id = workerId;

        const response = await paymentApi.initiatePayment(payload);

        setIsLoading(false);
        setPaymentData(response);
        return { success: true, data: response };
      } catch (err: any) {
        const userMsg = extractPaymentErrorMessage(err);
        setError(userMsg);
        setIsLoading(false);
        return { success: false, error: userMsg };
      }
    },
    []
  );

  /**
   * Backwards compatible payment processing method
   */
  const processPayment = useCallback(
    async (
      amount: number,
      methodId: string,
      bookingId?: string | null,
      workerId?: string
    ): Promise<boolean> => {
      if (amount <= 0) {
        setError('Invalid payment amount.');
        return false;
      }

      if (!bookingId || bookingId.startsWith('b-') || bookingId.startsWith('TL-')) {
        setError('No valid booking reference found for checkout.');
        return false;
      }

      // Check if user somehow selected a non-COD method
      const isCod =
        !methodId ||
        methodId === 'CASH_ON_DELIVERY' ||
        methodId === 'CASH' ||
        methodId === 'pm_cod' ||
        methodId.toLowerCase().includes('cash');

      if (!isCod) {
        setError(ONLINE_PAYMENTS_DISABLED_MESSAGE);
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        const payload: PaymentInitiatePayload = {
          booking_id: bookingId,
          method: 'CASH_ON_DELIVERY',
          amount,
        };
        if (workerId !== undefined) payload.worker_id = workerId;

        const res = await paymentApi.initiatePayment(payload);

        setIsLoading(false);
        setPaymentData(res);
        return true;
      } catch (err: any) {
        const msg = extractPaymentErrorMessage(err);
        setError(msg);
        setIsLoading(false);
        return false;
      }
    },
    []
  );

  return {
    initiateCodPayment,
    processPayment,
    isLoading,
    error,
    paymentData,
    resetError,
  };
}
