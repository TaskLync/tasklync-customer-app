import { PaymentStatus, PaymentMethodCode } from '../types/payment.types';
import { getAppTheme } from '../theme/useAppTheme';

/**
 * Maps backend Payment error codes according to CUSTOMER_APP_PAYMENT_APIS.md Section 5
 */
export function mapPaymentErrorCode(code?: string, fallbackMessage?: string): string {
  switch (code) {
    case 'ONLINE_PAYMENTS_DISABLED':
      return 'Online payments are temporarily unavailable. Please proceed with Cash on Delivery.';
    case 'COD_DEBT_LIMIT_EXCEEDED':
      return 'The selected worker cannot take cash bookings right now. Please choose another worker.';
    case 'PAYMENT_ALREADY_EXISTS':
      return 'Payment is already processed for this booking.';
    case 'UNAUTHORIZED':
      return 'Please log in to proceed with checkout.';
    case 'FORBIDDEN':
      return 'You do not have permission to perform this action.';
    case 'VALIDATION_ERROR':
      return fallbackMessage || 'Please check your input details and try again.';
    default:
      return fallbackMessage || 'An unexpected error occurred during payment processing.';
  }
}

/**
 * Extracts friendly error from an API error response or Axios exception
 */
export function extractPaymentErrorMessage(err: any): string {
  if (!err) return 'An unexpected error occurred.';
  const code = err?.response?.data?.error?.code || err?.code;
  const message = err?.response?.data?.error?.message || err?.message;
  return mapPaymentErrorCode(code, message);
}

/**
 * Returns human-readable label for payment status
 */
export function getPaymentStatusLabel(status?: PaymentStatus | string): string {
  switch (status) {
    case 'PENDING':
      return 'Pending Cash Payment';
    case 'HELD':
      return 'Cash Receipt Confirmed';
    case 'RELEASED':
      return 'Settled & Completed';
    case 'REFUNDED':
      return 'Refunded';
    case 'FAILED':
      return 'Failed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status || 'Pending';
  }
}

/**
 * Returns status color for UI badges
 */
export function getPaymentStatusColor(status?: PaymentStatus | string): { color: string; bg: string } {
  const { colors, palette } = getAppTheme();
  switch (status) {
    case 'PENDING':
      return { color: colors.warningMedium, bg: colors.warningLight };
    case 'HELD':
      return { color: palette.sky600, bg: palette.sky100 };
    case 'RELEASED':
      return { color: colors.primaryDark, bg: colors.primaryLight };
    case 'REFUNDED':
      return { color: colors.textMuted, bg: colors.canvasGray };
    case 'FAILED':
    case 'CANCELLED':
      return { color: colors.dangerMedium, bg: colors.dangerLight };
    default:
      return { color: colors.textMuted, bg: colors.canvasGray };
  }
}

/**
 * Returns user-friendly payment method name
 */
export function formatPaymentMethodName(method?: PaymentMethodCode | string): string {
  switch (method) {
    case 'CASH_ON_DELIVERY':
      return 'Cash on Delivery (COD)';
    case 'JAZZCASH_WALLET':
      return 'JazzCash Wallet';
    case 'EASYPAISA_WALLET':
      return 'EasyPaisa Wallet';
    case 'JAZZCASH_CARD':
      return 'JazzCash Debit/Credit Card';
    case 'RAAST':
      return 'Raast Instant Transfer';
    case 'IBFT':
      return 'Bank Account (IBFT)';
    case 'BANK_CARD':
      return 'Bank Card';
    default:
      return method ? String(method).replace(/_/g, ' ') : 'Cash on Delivery';
  }
}
