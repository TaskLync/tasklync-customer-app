import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '../../store/auth.store';
import { socketService } from '../socket/socket.service';
import { classifyError, isCancelledError } from './errorClassifier';

declare const process: any;

const resolveApiBaseUrl = (): string => {
  const envUrl =
    process?.env?.EXPO_PUBLIC_API_URL ||
    Constants?.expoConfig?.extra?.apiBaseUrl ||
    process?.env?.API_BASE_URL;

  if (envUrl && typeof envUrl === 'string' && !envUrl.includes('tasklync.com')) {
    const trimmed = envUrl.replace(/\/+$/, '');
    return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
  }
  return 'https://api.tasklync.pk/api/v1';
};

const API_URL = resolveApiBaseUrl();

const generateRequestId = (): string => {
  return 'req-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
};

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: Attach Bearer token & x-request-id trace header reliably
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  const authState = useAuthStore.getState().authState;

  if (token && config.headers) {
    if (typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  if (config.headers) {
    const requestId = generateRequestId();
    if (typeof config.headers.set === 'function' && !config.headers.has('x-request-id')) {
      config.headers.set('x-request-id', requestId);
    } else if (!config.headers['x-request-id']) {
      (config.headers as Record<string, string>)['x-request-id'] = requestId;
    }
  }

  // Handle FormData across all platforms (Web, iOS, Android):
  // Never hardcode 'Content-Type: multipart/form-data' without browser/client boundary
  const isFormData =
    Boolean(config.data) &&
    (config.data instanceof FormData ||
      (typeof window !== 'undefined' && (window as any).FormData && config.data instanceof (window as any).FormData) ||
      typeof config.data?.append === 'function');

  if (isFormData && config.headers) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type');
    } else {
      delete (config.headers as Record<string, string>)['Content-Type'];
    }
  }

  // Non-sensitive request logging for authentication diagnostics
  if (__DEV__) {
    const hasAuth = Boolean(token);
    const authSummary = hasAuth ? `Bearer [TOKEN_PRESENT: len=${token?.length}]` : '[NO_TOKEN]';
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} | AuthState: ${authState} | Authorization: ${authSummary}`);
  }

  return config;
});

let refreshPromise: Promise<string> | null = null;

async function executeTokenRefresh(): Promise<string> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) {
    throw new Error('NO_REFRESH_TOKEN');
  }

  useAuthStore.getState().setRefreshingToken();

  try {
    const refreshResponse = await axios.post(
      `${API_URL}/auth/token/refresh`,
      { refreshToken },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      }
    );

    const newAccessToken =
      refreshResponse.data?.data?.accessToken || refreshResponse.data?.accessToken;
    const newRefreshToken =
      refreshResponse.data?.data?.refreshToken ||
      refreshResponse.data?.refreshToken ||
      refreshToken;

    if (!newAccessToken) {
      throw new Error('EMPTY_ACCESS_TOKEN_IN_RESPONSE');
    }

    useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);
    useAuthStore.getState().setAuthState('AUTHENTICATED');

    try {
      socketService.updateToken(newAccessToken);
    } catch {}

    return newAccessToken;
  } catch (error: any) {
    const status = error.response?.status;
    const errorData = error.response?.data?.error || error.response?.data;
    const errorCode = String(errorData?.code || errorData?.reason || '').toUpperCase();
    const errorMessage = String(errorData?.message || error.message || '').toLowerCase();

    // STRICT: Only revoke the session if the refresh endpoint explicitly returned 401
    // with confirmed session invalidation/expiry/revocation/reuse from backend.
    const isConfirmedInvalidSession =
      status === 401 &&
      (errorCode === 'UNAUTHORIZED' ||
        errorCode === 'TOKEN_REUSE_DETECTED' ||
        errorCode === 'SESSION_EXPIRED' ||
        errorCode === 'ACCOUNT_NOT_FOUND' ||
        errorMessage.includes('expired') ||
        errorMessage.includes('invalid') ||
        errorMessage.includes('revoked'));

    if (isConfirmedInvalidSession) {
      if (__DEV__) {
        console.warn('[API Auth] Refresh token permanently rejected (401). Invalidating session.');
      }
      useAuthStore.getState().logout();
      throw error;
    }

    // Temporary failure (offline, timeout, 500, 502, 503, 504, 429) -> NEVER LOGOUT!
    if (__DEV__) {
      console.warn('[API Auth] Temporary network/server failure during refresh. Preserving session.');
    }
    useAuthStore.getState().setTemporarilyUnavailable();
    throw error;
  } finally {
    refreshPromise = null;
  }
}

// Response interceptor: Single-flight Token refresh & Centralized Error Classification
apiClient.interceptors.response.use(
  (response) => {
    // If we were previously temporarily unavailable and a request succeeds, restore AUTHENTICATED
    const currentAuthState = useAuthStore.getState().authState;
    if (
      currentAuthState === 'TEMPORARILY_UNAVAILABLE' &&
      useAuthStore.getState().accessToken
    ) {
      useAuthStore.getState().setAuthState('AUTHENTICATED');
    }
    return response;
  },
  async (error) => {
    // Preserve AbortController / React Query request cancellation without transforming into SERVER_ERROR
    if (isCancelledError(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    const url = originalRequest?.url || '';
    const isAuthRoute = Boolean(
      url.includes('/auth/token/refresh') ||
        url.includes('/auth/otp/') ||
        url.includes('/auth/user/logout') ||
        url.includes('/auth/logout')
    );
    const isPublicSearchRoute = Boolean(url.includes('/search/'));

    // 1. Handle HTTP 401 Unauthorized
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;

      if (refreshToken) {
        if (__DEV__) {
          console.warn(`[API Auth] 401 Unauthorized on ${url}. Awaiting single-flight refresh...`);
        }

        if (!refreshPromise) {
          refreshPromise = executeTokenRefresh();
        }

        try {
          const newAccessToken = await refreshPromise;

          if (typeof originalRequest.headers?.set === 'function') {
            originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
          } else if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          return apiClient(originalRequest);
        } catch (refreshErr: any) {
          // If public search route, retry anonymously without throwing error
          if (isPublicSearchRoute && originalRequest.headers) {
            if (typeof originalRequest.headers.delete === 'function') {
              originalRequest.headers.delete('Authorization');
            } else {
              delete originalRequest.headers.Authorization;
            }
            return apiClient(originalRequest);
          }

          // Otherwise return classified error without logging out (unless confirmed invalid)
          const classified = classifyError(refreshErr);
          return Promise.reject({
            ...classified,
            details: refreshErr.response?.data?.details,
            isNetworkError: classified.category === 'NETWORK_ERROR',
            isTimeout: classified.category === 'REQUEST_TIMEOUT',
          });
        }
      } else if (isPublicSearchRoute && originalRequest.headers) {
        // No refresh token but public search: retry anonymously
        if (typeof originalRequest.headers.delete === 'function') {
          originalRequest.headers.delete('Authorization');
        } else {
          delete originalRequest.headers.Authorization;
        }
        return apiClient(originalRequest);
      }
    }

    // 2. Centralized Error Classification
    const classified = classifyError(error);
    const rawError = error.response?.data?.error || error.response?.data;

    let errorMessage = classified.userMessage || classified.message;
    if (Array.isArray(rawError?.details) && rawError.details.length > 0) {
      const detailMessages = rawError.details
        .map((d: any) => `${d.field ? d.field + ': ' : ''}${d.message || d}`)
        .join(', ');
      if (detailMessages && !errorMessage.includes(detailMessages)) {
        errorMessage = `${errorMessage} (${detailMessages})`;
      }
    }

    const apiError = {
      ...classified,
      code: rawError?.code || classified.code,
      message: errorMessage,
      details: rawError?.details,
      status: error.response?.status,
      retryAfterSeconds: classified.retryAfterSeconds,
      isNetworkError: classified.category === 'NETWORK_ERROR',
      isTimeout: classified.category === 'REQUEST_TIMEOUT',
    };

    return Promise.reject(apiError);
  }
);
