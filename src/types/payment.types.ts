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
  account_number?: string; // e.g. "0300 ••• 1234" for JazzCash / EasyPaisa
  last4?: string;          // e.g. "4242" for cards
  exp_month?: number;
  exp_year?: number;
  holder_name?: string;
  is_default: boolean;
  is_fixed?: boolean;      // True for Cash on Delivery which cannot be deleted
  created_at?: string;
  // Compatibility aliases
  expMonth?: number;
  expYear?: number;
  holderName?: string;
  isDefault?: boolean;
}

export type AddPaymentMethodType = 'jazzcash' | 'easypaisa' | 'card';

export interface AddWalletDTO {
  provider: PaymentWalletProvider;
  accountNumber: string; // 11 digit mobile number
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
