/**
 * TaskLync Payment Architecture Types
 * Conforms strictly to CUSTOMER_APP_PAYMENT_APIS.md
 * 
 * Active Mode: Cash on Delivery (COD) (Online gateways safely disconnected)
 */

export type PaymentMethodCode =
  | 'CASH_ON_DELIVERY'
  | 'JAZZCASH_WALLET'
  | 'EASYPAISA_WALLET'
  | 'JAZZCASH_CARD'
  | 'RAAST'
  | 'IBFT'
  | 'BANK_CARD';

export type PaymentStatus =
  | 'PENDING'
  | 'HELD'
  | 'RELEASED'
  | 'REFUNDED'
  | 'FAILED'
  | 'CANCELLED';

export interface PaymentInstructions {
  type: 'cod' | 'wallet' | 'card' | string;
  message: string;
  expires_at?: string | null;
}

export type PaymentMethodType = 'wallet' | 'cash' | 'card';

export type PaymentWalletProvider = 'jazzcash' | 'easypaisa';

export type CardBrand =
  | 'jazzcash'
  | 'easypaisa'
  | 'cash'
  | 'visa'
  | 'mastercard'
  | 'paypak'
  | 'unionpay'
  | 'amex'
  | 'unknown';

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  brand: CardBrand;
  title: string;
  subtitle: string;
  account_number?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
  holder_name?: string;
  is_default: boolean;
  is_fixed?: boolean;       // True for Cash on Delivery which cannot be deleted
  is_enabled?: boolean;     // False when online platforms are disabled
  disabled_reason?: string; // Informative message explaining why method is disabled
  created_at?: string;
  // Compatibility aliases
  expMonth?: number;
  expYear?: number;
  holderName?: string;
  isDefault?: boolean;
  isEnabled?: boolean;
}

export interface PaymentInitiatePayload {
  booking_id: string;
  method?: PaymentMethodCode;
  amount?: number;
  worker_id?: string;
  phone_number?: string;
  saved_method_id?: string;
  // Compatibility aliases
  payment_method_id?: string;
  currency?: string;
}

export interface PaymentInitiateResponse {
  payment_id: string;
  booking_id: string;
  amount: number;
  currency: string;
  method: PaymentMethodCode;
  status: PaymentStatus;
  gateway_order_id?: string | null;
  instructions?: PaymentInstructions;
  // Compatibility aliases
  success?: boolean;
  transaction_id?: string;
  message?: string;
}

export interface PaymentRecord {
  id: string;
  booking_id: string;
  user_id?: string;
  worker_id?: string;
  booking_amount: number;
  platform_fee?: number;
  worker_amount?: number;
  currency: string;
  method: PaymentMethodCode;
  status: PaymentStatus;
  cod_confirmed_at?: string | null;
  cod_confirmed_by?: string | null;
  paid_at?: string | null;
  created_at: string;
}

export interface PaymentHistoryItem {
  id: string;
  booking_id: string;
  booking_amount: number;
  method: PaymentMethodCode;
  status: PaymentStatus;
  paid_at?: string | null;
}

export interface PaymentHistoryMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaymentHistoryResponse {
  data: PaymentHistoryItem[];
  meta: PaymentHistoryMeta;
}

export interface SavedPaymentMethodDto {
  id: string;
  type: string;
  display_name: string;
  masked_number?: string;
  is_default: boolean;
  is_active: boolean;
}

export interface CreatePaymentMethodPayload {
  type: 'JAZZCASH_WALLET' | 'EASYPAISA_WALLET' | 'BANK_CARD' | 'RAAST' | string;
  display_name: string;
  masked_number?: string;
  is_default?: boolean;
}

export type AddPaymentMethodType = 'jazzcash' | 'easypaisa' | 'card';

export interface AddWalletDTO {
  provider: PaymentWalletProvider;
  accountNumber: string;
  accountTitle: string;
  isDefault?: boolean;
}

export interface AddCardDTO {
  cardNumber: string;
  expMonth: number;
  expYear: number;
  cvc: string;
  cardholderName: string;
  saveForFuture?: boolean;
  isDefault?: boolean;
}

export const ONLINE_PAYMENTS_DISABLED_MESSAGE =
  'Online payments are temporarily unavailable. Please proceed with Cash on Delivery.';
