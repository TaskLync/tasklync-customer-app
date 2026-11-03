import type { BookingStatus } from '../types/booking.types';

export interface VerificationErrorState {
  message: string;
  isFatal: boolean;
  isExpired: boolean;
  isRateLimited: boolean;
  isAlreadyStarted: boolean;
}

/**
 * Checks whether a booking is in the correct lifecycle state for customer job-start verification.
 * Per backend state-machine rules, verification OTP and QR generation are strictly allowed
 * when status is ACCEPTED (job accepted and scheduled, awaiting worker start).
 */
export function isVerificationEligible(status?: BookingStatus | string | null): boolean {
  if (!status) return false;
  return status.toUpperCase() === 'ACCEPTED';
}

/**
 * Maps backend error responses to clean, human-centered UX copy.
 * Raw technical error details and stack traces are never shown to the customer.
 */
export function mapVerificationError(error: any): VerificationErrorState {
  const backendCode =
    error?.response?.data?.error?.code ||
    error?.response?.data?.code ||
    error?.code ||
    '';

  const backendMessage =
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    '';

  const normalizedCode = String(backendCode).toUpperCase();
  const normalizedMsg = String(backendMessage).toLowerCase();

  // 1. Service already started / in progress
  if (
    normalizedCode === 'BOOKING_ALREADY_STARTED' ||
    normalizedMsg.includes('already started') ||
    normalizedMsg.includes('already in progress')
  ) {
    return {
      message: 'Service is already in progress. Verification complete.',
      isFatal: false,
      isExpired: false,
      isRateLimited: false,
      isAlreadyStarted: true,
    };
  }

  // 2. Booking not eligible for start (e.g. PENDING, CANCELLED, COMPLETED)
  if (
    normalizedCode === 'BOOKING_NOT_ELIGIBLE' ||
    normalizedMsg.includes('not eligible')
  ) {
    return {
      message: 'Verification code becomes active when your professional is confirmed.',
      isFatal: false,
      isExpired: false,
      isRateLimited: false,
      isAlreadyStarted: false,
    };
  }

  // 3. Expired OTP or QR token
  if (
    normalizedCode === 'OTP_EXPIRED' ||
    normalizedCode === 'QR_TOKEN_EXPIRED' ||
    normalizedMsg.includes('expired')
  ) {
    return {
      message: 'Your verification code has expired. Tap to generate a fresh one.',
      isFatal: false,
      isExpired: true,
      isRateLimited: false,
      isAlreadyStarted: false,
    };
  }

  // 4. Rate-limit / Lockout protection
  if (
    normalizedCode === 'OTP_LOCKED' ||
    normalizedCode === 'VERIFICATION_RATE_LIMITED' ||
    normalizedCode === 'RATE_LIMITED' ||
    error?.response?.status === 429
  ) {
    return {
      message: 'Please wait a moment before requesting another verification code.',
      isFatal: false,
      isExpired: false,
      isRateLimited: true,
      isAlreadyStarted: false,
    };
  }

  // 5. Access control / unauthorized customer
  if (
    normalizedCode === 'BOOKING_ACCESS_DENIED' ||
    normalizedCode === 'UNAUTHORIZED_CUSTOMER' ||
    error?.response?.status === 403
  ) {
    return {
      message: 'Only the account holder who booked this service can view verification codes.',
      isFatal: true,
      isExpired: false,
      isRateLimited: false,
      isAlreadyStarted: false,
    };
  }

  // 6. Booking not found
  if (
    normalizedCode === 'BOOKING_NOT_FOUND' ||
    error?.response?.status === 404
  ) {
    return {
      message: 'Booking details could not be found. Please pull to refresh.',
      isFatal: true,
      isExpired: false,
      isRateLimited: false,
      isAlreadyStarted: false,
    };
  }

  // 7. Network or offline error
  if (
    normalizedCode === 'ERR_NETWORK' ||
    normalizedCode === 'ECONNABORTED' ||
    normalizedMsg.includes('network') ||
    normalizedMsg.includes('offline')
  ) {
    return {
      message: 'No internet connection. Please check your network and tap to retry.',
      isFatal: false,
      isExpired: false,
      isRateLimited: false,
      isAlreadyStarted: false,
    };
  }

  // 8. General fallback
  return {
    message: 'Unable to retrieve your verification code. Tap to retry.',
    isFatal: false,
    isExpired: false,
    isRateLimited: false,
    isAlreadyStarted: false,
  };
}

/**
 * Formats a remaining seconds countdown into a human-friendly "m:ss" format.
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0 || !Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
