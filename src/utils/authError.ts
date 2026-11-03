export interface MappedOtpError {
  message: string;
  isOtpError: boolean;
  status?: number;
  code?: string | number;
}

/**
 * Maps backend / network responses to human-friendly, accessible OTP verification error messages.
 * Never leaks stack traces, internal server tokens, or sensitive diagnostics.
 */
export function mapOtpVerificationError(err: any): MappedOtpError {
  if (!err) {
    return {
      message: "We couldn't verify your code right now. Please try again.",
      isOtpError: false,
    };
  }

  const status = typeof err.status === 'number' 
    ? err.status 
    : typeof err.response?.status === 'number' 
    ? err.response.status 
    : undefined;

  const rawCode = String(err.code || err.response?.data?.code || '').toUpperCase();
  const rawMessage = String(err.message || err.response?.data?.message || '').toLowerCase();

  const isNetwork = Boolean(
    err.isNetworkError ||
    err.isTimeout ||
    rawCode === 'NETWORK_ERROR' ||
    rawCode === 'TIMEOUT' ||
    rawCode === 'ERR_NETWORK' ||
    rawCode === 'ECONNABORTED' ||
    rawMessage.includes('network') ||
    rawMessage.includes('timeout') ||
    rawMessage.includes('connection')
  );

  // 1. Network Failure
  if (isNetwork) {
    return {
      message: 'Connection problem. Check your internet and try again.',
      isOtpError: false,
      status,
      code: 'NETWORK_ERROR',
    };
  }

  // 2. Too many attempts / Rate Limit (HTTP 429)
  if (
    status === 429 ||
    rawCode.includes('RATE_LIMIT') ||
    rawCode.includes('TOO_MANY_ATTEMPTS') ||
    rawMessage.includes('too many attempts') ||
    rawMessage.includes('rate limit')
  ) {
    return {
      message: 'Too many attempts. Please wait before trying again.',
      isOtpError: true,
      status: 429,
      code: 'RATE_LIMIT',
    };
  }

  // 3. Expired OTP (HTTP 410 or explicit EXPIRED status/code)
  if (
    status === 410 ||
    rawCode.includes('EXPIRE') ||
    rawMessage.includes('expired')
  ) {
    return {
      message: 'Your code has expired. Request a new code.',
      isOtpError: true,
      status: 410,
      code: 'EXPIRED_OTP',
    };
  }

  // 4. Incorrect OTP (HTTP 401 or 400 with invalid/wrong code)
  if (
    status === 401 ||
    rawCode.includes('INVALID_OTP') ||
    rawCode.includes('WRONG_OTP') ||
    rawCode.includes('INCORRECT_OTP') ||
    rawMessage.includes('invalid') ||
    rawMessage.includes('wrong') ||
    rawMessage.includes('incorrect') ||
    rawMessage.includes('not match')
  ) {
    return {
      message: 'Incorrect verification code. Please try again.',
      isOtpError: true,
      status: 401,
      code: 'INVALID_OTP',
    };
  }

  // 5. Server Errors (HTTP 500, 502, 503, 504)
  if (typeof status === 'number' && status >= 500) {
    return {
      message: "We couldn't verify your code right now. Please try again.",
      isOtpError: false,
      status,
      code: 'SERVER_ERROR',
    };
  }

  // 6. Generic Safe Fallback
  return {
    message: "We couldn't verify your code right now. Please try again.",
    isOtpError: false,
    status,
    code: rawCode || 'UNKNOWN_ERROR',
  };
}

/**
 * Maps backend / network responses to human-friendly OTP resend error messages.
 */
export function mapOtpResendError(err: any): { message: string; isRateLimited: boolean } {
  if (!err) {
    return {
      message: "Couldn't resend the code. Please try again.",
      isRateLimited: false,
    };
  }

  const status = typeof err.status === 'number' 
    ? err.status 
    : typeof err.response?.status === 'number' 
    ? err.response.status 
    : undefined;

  const rawCode = String(err.code || err.response?.data?.code || '').toUpperCase();
  const rawMessage = String(err.message || err.response?.data?.message || '').toLowerCase();

  const isNetwork = Boolean(
    err.isNetworkError ||
    err.isTimeout ||
    rawCode === 'NETWORK_ERROR' ||
    rawCode === 'TIMEOUT' ||
    rawCode === 'ERR_NETWORK' ||
    rawMessage.includes('network') ||
    rawMessage.includes('connection')
  );

  if (isNetwork) {
    return {
      message: 'Connection problem. Check your internet and try again.',
      isRateLimited: false,
    };
  }

  if (
    status === 429 ||
    rawCode.includes('RATE_LIMIT') ||
    rawCode.includes('TOO_MANY_ATTEMPTS') ||
    rawMessage.includes('too many') ||
    rawMessage.includes('wait')
  ) {
    return {
      message: 'Too many attempts. Please wait before trying again.',
      isRateLimited: true,
    };
  }

  return {
    message: "Couldn't resend the code. Please try again.",
    isRateLimited: false,
  };
}
