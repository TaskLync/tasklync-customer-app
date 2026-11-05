import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore, whenAuthReady } from '../../store/auth.store';
import { socketService } from '../socket/socket.service';
import { classifyError, isCancelledError } from './errorClassifier';
import {
  createRefreshCoordinator,
  decideOnUnauthorized,
  RefreshError,
  sessionCorrelationId,
  shouldRefreshProactively,
} from '../auth/sessionCore';
import { recordAuthEvent } from '../auth/authEvents';

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

// Login / refresh calls: never wait for session restore, never refresh (no recursion).
const SESSIONLESS_ROUTES = ['/auth/token/refresh', '/auth/otp/'];
// Calls whose 401 must not trigger a refresh.
const NO_REFRESH_ROUTES = [...SESSIONLESS_ROUTES, '/auth/user/logout', '/auth/logout'];
const matches = (url: string, list: string[]) => list.some((p) => url.includes(p));
const endpointOf = (url: string) => url.split('?')[0];

type AuthAwareConfig = {
  headers?: any;
  url?: string;
  _retry?: boolean;
  /** access token the request was sent with (null = none) */
  _authToken?: string | null;
  /** public route retried without credentials: do not attach a token again */
  _anonymous?: boolean;
};

function setHeader(config: AuthAwareConfig, name: string, value: string) {
  if (!config.headers) return;
  if (typeof config.headers.set === 'function') config.headers.set(name, value);
  else config.headers[name] = value;
}

function deleteHeader(config: AuthAwareConfig, name: string) {
  if (!config.headers) return;
  if (typeof config.headers.delete === 'function') config.headers.delete(name);
  else delete config.headers[name];
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Single-flight token refresh (rules + tests: services/auth/sessionCore.ts)
// ---------------------------------------------------------------------------

const refreshCoordinator = createRefreshCoordinator({
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  getEpoch: () => useAuthStore.getState().sessionEpoch,

  async post(refreshToken) {
    useAuthStore.getState().setRefreshingToken();
    // plain axios, not apiClient: the refresh call must never pass through these interceptors
    const res = await axios.post(
      `${API_URL}/auth/token/refresh`,
      { refreshToken },
      {
        headers: { 'Content-Type': 'application/json', 'x-request-id': generateRequestId() },
        // generous: aborting while the server already rotated is what strands a session
        timeout: 20000,
      }
    );
    const accessToken = res.data?.data?.accessToken || res.data?.accessToken;
    const newRefreshToken = res.data?.data?.refreshToken || res.data?.refreshToken;
    if (!accessToken || !newRefreshToken) {
      // malformed 200: keep the session, the retry gets the grace replay
      throw { response: { status: 502, data: { reason: 'EMPTY_TOKEN_RESPONSE' } } };
    }
    return { accessToken, refreshToken: newRefreshToken };
  },

  toFailure(error: any) {
    if (!error?.response) return { noResponse: true };
    const data = error.response.data || {};
    return { status: error.response.status, reason: data.error?.reason || data.reason };
  },

  async persist(tokens) {
    // memory is updated synchronously inside setTokens; do not hold requests hostage to a slow keystore
    await Promise.race([useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken), sleep(3000)]);
    try {
      socketService.updateToken(tokens.accessToken);
    } catch {
      /* socket reconnect is best effort */
    }
  },

  onTerminal(reason) {
    useAuthStore.getState().expireSession(reason);
  },

  onTransient() {
    useAuthStore.getState().setTemporarilyUnavailable();
  },

  onEvent(event, fields) {
    recordAuthEvent(event, { ...fields, sid: sessionCorrelationId(useAuthStore.getState().accessToken) });
  },

  sleep,
});

/** Fresh access token via the shared single-flight refresh. Rejects with RefreshError. */
export function refreshAccessToken(trigger = 'manual'): Promise<string> {
  return refreshCoordinator.refresh(trigger);
}

/**
 * Before a protected request: wait for a refresh already in flight, and refresh ahead of expiry
 * so the request does not go out with a token that dies on the way. Never throws.
 */
export async function ensureFreshAccessToken(): Promise<void> {
  const inFlight = refreshCoordinator.inFlight();
  if (inFlight) {
    await inFlight.catch(() => undefined);
    return;
  }
  const s = useAuthStore.getState();
  if (!s.accessToken || !s.refreshToken) return;
  if (!shouldRefreshProactively(s.accessExpiresAt, Date.now())) return;
  // offline: do not make every request wait on another refresh attempt
  if (Date.now() - refreshCoordinator.lastTransientFailureAt() < 15000) return;
  await refreshCoordinator.refresh('proactive').catch(() => undefined);
}

// Chat socket handshake rejected (expired token): refresh once, updateToken() reconnects.
socketService.setAuthFailureHandler((failedToken) => {
  const s = useAuthStore.getState();
  if (s.accessToken && s.accessToken !== failedToken) {
    socketService.updateToken(s.accessToken);
    return;
  }
  if (!s.refreshToken) return;
  refreshCoordinator.refresh('socket').catch(() => undefined);
});

// ---------------------------------------------------------------------------
// Request interceptor: wait for session restore, attach the CURRENT token
// ---------------------------------------------------------------------------

apiClient.interceptors.request.use(async (config) => {
  const url = config.url || '';
  const cfg = config as unknown as AuthAwareConfig;

  if (!matches(url, SESSIONLESS_ROUTES)) {
    // A request fired during cold start used to leave with no header -> 401 "Authentication required".
    await whenAuthReady();
    await ensureFreshAccessToken();
  }

  const token = cfg._anonymous ? null : useAuthStore.getState().accessToken;
  if (token) {
    setHeader(cfg, 'Authorization', `Bearer ${token}`);
  }
  cfg._authToken = token;

  if (config.headers) {
    const hasId =
      typeof config.headers.has === 'function' ? config.headers.has('x-request-id') : Boolean(config.headers['x-request-id']);
    if (!hasId) setHeader(cfg, 'x-request-id', generateRequestId());
  }

  // Handle FormData across all platforms (Web, iOS, Android):
  // Never hardcode 'Content-Type: multipart/form-data' without browser/client boundary
  const isFormData =
    Boolean(config.data) &&
    (config.data instanceof FormData ||
      (typeof window !== 'undefined' && (window as any).FormData && config.data instanceof (window as any).FormData) ||
      typeof config.data?.append === 'function');

  if (isFormData) {
    deleteHeader(cfg, 'Content-Type');
  }

  // Non-sensitive request logging for authentication diagnostics
  if (__DEV__) {
    const authSummary = token ? `Bearer [TOKEN_PRESENT: len=${token.length}]` : '[NO_TOKEN]';
    console.log(
      `[API Request] ${config.method?.toUpperCase()} ${url} | AuthState: ${useAuthStore.getState().authState} | Authorization: ${authSummary}`
    );
  }

  return config;
});

// ---------------------------------------------------------------------------
// Response interceptor: 401 handling + centralized error classification
// ---------------------------------------------------------------------------

apiClient.interceptors.response.use(
  (response) => {
    // If we were previously temporarily unavailable and a request succeeds, restore AUTHENTICATED
    const s = useAuthStore.getState();
    if (s.authState === 'TEMPORARILY_UNAVAILABLE' && s.accessToken) {
      s.setAuthState('AUTHENTICATED');
    }
    return response;
  },
  async (error) => {
    // Preserve AbortController / React Query request cancellation without transforming into SERVER_ERROR
    if (isCancelledError(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as (AuthAwareConfig & Record<string, any>) | undefined;
    const url = originalRequest?.url || '';
    const isPublicSearchRoute = url.includes('/search/');

    if (error.response?.status === 401 && originalRequest) {
      const body = error.response.data || {};
      const reason: string | undefined = body.reason || body.error?.reason;
      const s = useAuthStore.getState();
      const action = decideOnUnauthorized({
        isAuthEndpoint: matches(url, NO_REFRESH_ROUTES),
        alreadyRetried: Boolean(originalRequest._retry),
        tokenSent: originalRequest._authToken,
        currentAccessToken: s.accessToken,
        hasRefreshToken: Boolean(s.refreshToken),
        reason,
      });

      recordAuthEvent(reason === 'TOKEN_EXPIRED' ? 'ACCESS_TOKEN_EXPIRED' : 'AUTHENTICATION_FAILED', {
        endpoint: endpointOf(url),
        status: 401,
        reason,
        action,
        request_id: body.request_id,
        sid: sessionCorrelationId(s.accessToken),
      });

      if (action === 'RETRY_WITH_CURRENT') {
        originalRequest._retry = true;
        return apiClient(originalRequest);
      }

      if (action === 'REFRESH') {
        originalRequest._retry = true;
        try {
          await refreshCoordinator.refresh('401');
          // the request interceptor attaches the token that was just stored
          return apiClient(originalRequest);
        } catch (refreshErr: any) {
          if (isPublicSearchRoute) {
            originalRequest._anonymous = true;
            deleteHeader(originalRequest, 'Authorization');
            return apiClient(originalRequest);
          }
          // Session is only ended inside the coordinator (refresh endpoint said 401).
          const cause =
            refreshErr instanceof RefreshError && refreshErr.original ? refreshErr.original : error;
          const classified = classifyError(cause);
          return Promise.reject({
            ...classified,
            details: (cause as any)?.response?.data?.details,
            isNetworkError: classified.category === 'NETWORK_ERROR',
            isTimeout: classified.category === 'REQUEST_TIMEOUT',
          });
        }
      }

      if (isPublicSearchRoute && !originalRequest._anonymous && !s.accessToken) {
        // No session at all on a public search: retry anonymously
        originalRequest._anonymous = true;
        originalRequest._retry = true;
        deleteHeader(originalRequest, 'Authorization');
        return apiClient(originalRequest);
      }
    }

    // Centralized Error Classification
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
