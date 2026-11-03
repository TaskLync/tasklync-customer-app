import axios from 'axios';

export type AppErrorCategory =
  | 'NETWORK_ERROR'
  | 'REQUEST_TIMEOUT'
  | 'SERVER_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'CANCELLED_REQUEST'
  | 'WEBSOCKET_ERROR'
  | 'UNKNOWN_ERROR';

export interface ClassifiedError {
  category: AppErrorCategory;
  code: string;
  message: string;
  userMessage: string;
  status?: number | undefined;
  isRetryable: boolean;
  retryAfterSeconds?: number | undefined;
  originalError: any;
}

/**
 * Checks if an error is an intentional cancellation from AbortController,
 * axios CancelToken, or React Query unmount.
 */
export function isCancelledError(error: any): boolean {
  return Boolean(
    axios.isCancel(error) ||
      error?.code === 'ERR_CANCELED' ||
      error?.name === 'CanceledError' ||
      error?.name === 'AbortError' ||
      error?.__CANCEL__
  );
}

/**
 * Checks if an error is a network connectivity failure (offline, DNS, socket closed).
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  if (isCancelledError(error)) return false;

  const code = String(error.code || error.originalError?.code || '').toUpperCase();
  const message = String(error.message || '').toLowerCase();

  return Boolean(
    code === 'ERR_NETWORK' ||
      code === 'ENOTFOUND' ||
      code === 'ECONNREFUSED' ||
      code === 'EHOSTUNREACH' ||
      code === 'NETWORK_ERROR' ||
      message === 'network error' ||
      (!error.response && message.includes('network')) ||
      (!error.response && message.includes('failed to fetch'))
  );
}

/**
 * Checks if an error is a timeout.
 */
export function isTimeoutError(error: any): boolean {
  if (!error) return false;
  if (isCancelledError(error)) return false;

  const code = String(error.code || error.originalError?.code || '').toUpperCase();
  const message = String(error.message || '').toLowerCase();

  return Boolean(
    code === 'ECONNABORTED' ||
      code === 'TIMEOUT' ||
      code === 'ETIMEDOUT' ||
      message.includes('timeout')
  );
}

/**
 * Centralized error classifier for Tasklink mobile applications.
 *
 * Rules:
 * 1. Never leaks raw stack traces or internal SQL/framework errors to userMessage.
 * 2. Distinguishes AUTHENTICATION_ERROR (401 - identity missing/expired) from
 *    AUTHORIZATION_ERROR (403 - permissions denied).
 * 3. Classifies 500, 502, 503, 504 as SERVER_ERROR (retryable).
 * 4. Classifies network drops as NETWORK_ERROR (retryable, preserves session).
 */
export function classifyError(error: any): ClassifiedError {
  if (isCancelledError(error)) {
    return {
      category: 'CANCELLED_REQUEST',
      code: 'CANCELLED',
      message: 'Request was cancelled',
      userMessage: '',
      isRetryable: false,
      originalError: error,
    };
  }

  const status = typeof error.response?.status === 'number'
    ? error.response.status
    : typeof error.status === 'number'
    ? error.status
    : undefined;

  const rawData = error.response?.data?.error || error.response?.data || {};
  const rawCode = String(rawData.code || error.code || '').toUpperCase();
  const rawMessage = String(rawData.message || error.message || '');

  const retryAfterHeader = error.response?.headers?.['retry-after'];
  const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;

  // 1. Network Disconnection
  if (isNetworkError(error)) {
    return {
      category: 'NETWORK_ERROR',
      code: 'NETWORK_ERROR',
      message: rawMessage || 'Network connectivity error',
      userMessage: "You're offline. Please check your internet connection.",
      status,
      isRetryable: true,
      originalError: error,
    };
  }

  // 2. Request Timeout
  if (isTimeoutError(error)) {
    return {
      category: 'REQUEST_TIMEOUT',
      code: 'REQUEST_TIMEOUT',
      message: rawMessage || 'Request timed out',
      userMessage: 'Connection timed out. Please check your connection and try again.',
      status,
      isRetryable: true,
      originalError: error,
    };
  }

  // 3. HTTP Status Based Classification
  if (status !== undefined) {
    // 401 Unauthorized
    if (status === 401) {
      return {
        category: 'AUTHENTICATION_ERROR',
        code: rawCode || 'UNAUTHORIZED',
        message: rawMessage || 'Authentication required or session expired',
        userMessage: 'Your session has expired. Please sign in again.',
        status: 401,
        isRetryable: false,
        originalError: error,
      };
    }

    // 403 Forbidden
    if (status === 403) {
      return {
        category: 'AUTHORIZATION_ERROR',
        code: rawCode || 'FORBIDDEN',
        message: rawMessage || 'Access forbidden',
        userMessage: "You don't have permission to perform this action.",
        status: 403,
        isRetryable: false,
        originalError: error,
      };
    }

    // 429 Rate Limited
    if (status === 429) {
      return {
        category: 'RATE_LIMIT_ERROR',
        code: rawCode || 'RATE_LIMITED',
        message: rawMessage || 'Too many requests',
        userMessage: 'Too many requests. Please wait a moment and try again.',
        status: 429,
        isRetryable: true,
        retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : 5,
        originalError: error,
      };
    }

    // 400 Validation Error
    if (status === 400 || status === 422) {
      return {
        category: 'VALIDATION_ERROR',
        code: rawCode || (status === 422 ? 'UNPROCESSABLE_ENTITY' : 'VALIDATION_ERROR'),
        message: rawMessage || 'Invalid request parameters',
        userMessage: rawMessage || 'Please check your details and try again.',
        status,
        isRetryable: false,
        originalError: error,
      };
    }

    // 500, 502, 503, 504 Server Errors
    if (status >= 500 && status <= 599) {
      let code = 'SERVER_ERROR';
      if (status === 502) code = 'BAD_GATEWAY';
      else if (status === 503) code = 'SERVICE_UNAVAILABLE';
      else if (status === 504) code = 'GATEWAY_TIMEOUT';

      return {
        category: 'SERVER_ERROR',
        code: rawCode || code,
        message: rawMessage || `Server error (${status})`,
        userMessage: "We're having trouble connecting to the service. Please try again shortly.",
        status,
        isRetryable: true,
        originalError: error,
      };
    }
  }

  // 4. Default Unknown Error
  return {
    category: 'UNKNOWN_ERROR',
    code: rawCode || 'UNKNOWN_ERROR',
    message: rawMessage || 'An unexpected error occurred',
    userMessage: 'Something went wrong. Please try again.',
    status,
    isRetryable: false,
    originalError: error,
  };
}
