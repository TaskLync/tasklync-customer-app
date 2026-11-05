/**
 * Session core: the decisions behind token refresh, with no React Native or axios imports
 * so every rule here is unit tested (__tests__/auth/sessionCore.test.ts).
 *
 * Contract with the backend (api-gateway + auth-service):
 *   - Every 401 has code UNAUTHORIZED. Newer servers add `reason`:
 *       gateway:  TOKEN_MISSING | TOKEN_EXPIRED | TOKEN_INVALID
 *       refresh:  REFRESH_TOKEN_EXPIRED | REFRESH_TOKEN_INVALID | SESSION_NOT_FOUND |
 *                 SESSION_EXPIRED | SESSION_REPLACED | TOKEN_REUSE_DETECTED | ACCOUNT_*
 *   - A refresh token is single use. Presenting it again within the server grace window
 *     (60s) returns the SAME new pair, so retrying a refresh whose response was lost is safe.
 *   - A 401 from POST /auth/token/refresh means the session is over. Nothing else does.
 */

// ---------------------------------------------------------------------------
// JWT claims (read only, never verified on the device: the server is the authority)
// ---------------------------------------------------------------------------

export interface JwtClaims {
  exp?: number;
  iat?: number;
  sid?: string;
  sub?: string;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64UrlDecode(input: string): string {
  const s = input.replace(/-/g, '+').replace(/_/g, '/');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of s) {
    if (ch === '=') break;
    const idx = B64.indexOf(ch);
    if (idx < 0) throw new Error('bad base64');
    value = (value << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >> bits) & 0xff);
    }
  }
  // claims are ASCII/UTF-8 JSON; decode UTF-8 without TextDecoder (not on every Hermes build)
  return decodeURIComponent(bytes.map((b) => '%' + b.toString(16).padStart(2, '0')).join(''));
}

export function decodeJwtClaims(token: string | null | undefined): JwtClaims | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const claims = JSON.parse(base64UrlDecode(parts[1]));
    return claims && typeof claims === 'object' ? (claims as JwtClaims) : null;
  } catch {
    return null;
  }
}

/** First 8 chars of the session id, safe to log (it is a random id, not a credential). */
export function sessionCorrelationId(token: string | null | undefined): string | undefined {
  const sid = decodeJwtClaims(token)?.sid;
  return typeof sid === 'string' ? sid.slice(0, 8) : undefined;
}

/**
 * When the access token expires, on the DEVICE clock.
 * Uses the token lifetime (exp - iat) from the moment we received it, so a phone whose clock is
 * hours off does not refresh on every request (or never).
 */
export function computeAccessExpiresAt(token: string, receivedAtMs: number): number | null {
  const c = decodeJwtClaims(token);
  if (!c || typeof c.exp !== 'number') return null;
  if (typeof c.iat === 'number' && c.exp > c.iat) return receivedAtMs + (c.exp - c.iat) * 1000;
  return c.exp * 1000;
}

/** Refresh ahead of expiry so requests do not go out with a token that dies in flight. */
export const PROACTIVE_REFRESH_MARGIN_MS = 60_000;

export function shouldRefreshProactively(
  accessExpiresAt: number | null | undefined,
  nowMs: number,
  marginMs: number = PROACTIVE_REFRESH_MARGIN_MS
): boolean {
  return typeof accessExpiresAt === 'number' && accessExpiresAt - nowMs <= marginMs;
}

// ---------------------------------------------------------------------------
// What to do with a 401 from a normal API call
// ---------------------------------------------------------------------------

export type UnauthorizedAction =
  /** The token changed since the request left (refresh or login finished): resend, no refresh. */
  | 'RETRY_WITH_CURRENT'
  /** Access token expired / rejected and we hold a refresh token: refresh once, then resend. */
  | 'REFRESH'
  /** Nothing can fix it: hand the 401 to the caller. Never logs the user out. */
  | 'REJECT';

export interface UnauthorizedInput {
  isAuthEndpoint: boolean;
  alreadyRetried: boolean;
  tokenSent: string | null | undefined;
  currentAccessToken: string | null | undefined;
  hasRefreshToken: boolean;
  reason?: string | undefined;
}

export function decideOnUnauthorized(i: UnauthorizedInput): UnauthorizedAction {
  if (i.isAuthEndpoint || i.alreadyRetried) return 'REJECT';
  if (i.currentAccessToken && i.tokenSent !== i.currentAccessToken) return 'RETRY_WITH_CURRENT';
  if (!i.hasRefreshToken) return 'REJECT';
  // TOKEN_EXPIRED, TOKEN_INVALID, TOKEN_MISSING while holding a session, or an older server
  // without `reason`: one refresh decides it.
  return 'REFRESH';
}

// ---------------------------------------------------------------------------
// Refresh failures: is the session over, or was it just the network?
// ---------------------------------------------------------------------------

export interface RefreshFailure {
  status?: number | undefined;
  reason?: string | undefined;
  /** no HTTP response at all: offline, DNS, TLS, timeout */
  noResponse?: boolean | undefined;
}

export type RefreshFailureKind = 'TERMINAL' | 'TRANSIENT';

export function classifyRefreshFailure(f: RefreshFailure): RefreshFailureKind {
  if (f.noResponse || f.status === undefined) return 'TRANSIENT';
  // The refresh route is public. TOKEN_MISSING there means a proxy/gateway misconfiguration,
  // not a dead session: never log everyone out because of it.
  if (f.status === 401) return f.reason === 'TOKEN_MISSING' ? 'TRANSIENT' : 'TERMINAL';
  if (f.status === 400) return 'TERMINAL'; // malformed token in storage, cannot recover
  return 'TRANSIENT'; // 408, 429, 5xx, anything unexpected
}

/** What the customer is told after a terminal refresh failure. */
export function sessionEndMessage(reason: string | undefined): string {
  switch (reason) {
    case 'SESSION_REPLACED':
      return 'You signed in on another device, so you were signed out here.';
    case 'ACCOUNT_BANNED':
    case 'ACCOUNT_SUSPENDED':
    case 'ACCOUNT_DELETED':
    case 'ACCOUNT_NOT_FOUND':
    case 'ACCOUNT_INACTIVE':
      return 'Your account is not available. Please contact support.';
    case 'TOKEN_REUSE_DETECTED':
      return 'For your security, please sign in again.';
    default:
      return 'Your session has ended. Please sign in again.';
  }
}

// ---------------------------------------------------------------------------
// Single-flight refresh coordinator
// ---------------------------------------------------------------------------

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class RefreshError extends Error {
  readonly kind: RefreshFailureKind | 'SESSION_CHANGED';
  readonly reason: string | undefined;
  readonly original: unknown;
  constructor(kind: RefreshFailureKind | 'SESSION_CHANGED', reason: string | undefined, cause?: unknown) {
    super(`REFRESH_${kind}${reason ? `:${reason}` : ''}`);
    this.name = 'RefreshError';
    this.kind = kind;
    this.reason = reason;
    this.original = cause;
  }
}

export interface RefreshDeps {
  getRefreshToken(): string | null;
  /** Changes on login / logout / session end. A refresh started in an older epoch is discarded. */
  getEpoch(): number;
  /** POST /auth/token/refresh. Rejects with something `toFailure` understands. */
  post(refreshToken: string): Promise<TokenPair>;
  toFailure(error: unknown): RefreshFailure;
  /** Persist + publish the new pair. Resolves only once the pair is stored. */
  persist(tokens: TokenPair): Promise<void>;
  onTerminal(reason: string | undefined): void;
  onTransient(failure: RefreshFailure): void;
  onEvent?(event: string, fields: Record<string, unknown>): void;
  sleep(ms: number): Promise<void>;
  /**
   * Delays between attempts after a transient failure. Short on purpose: the retry re-sends the
   * SAME refresh token and must land inside the server's 60s grace window (lost-response case).
   */
  retryDelaysMs?: number[];
}

export interface RefreshCoordinator {
  /** Joins the refresh in flight, or starts one. Resolves with the new access token. */
  refresh(trigger: string): Promise<string>;
  inFlight(): Promise<string> | null;
  /** ms timestamp of the last transient failure (0 = none), used to back off proactive refresh */
  lastTransientFailureAt(): number;
}

export function createRefreshCoordinator(deps: RefreshDeps): RefreshCoordinator {
  const delays = deps.retryDelaysMs ?? [1_500, 4_000];
  let current: Promise<string> | null = null;
  let lastTransientAt = 0;
  const emit = (event: string, fields: Record<string, unknown>) => {
    try {
      deps.onEvent?.(event, fields);
    } catch {
      /* diagnostics never break auth */
    }
  };

  async function run(trigger: string): Promise<string> {
    const epoch = deps.getEpoch();
    let lastFailure: RefreshFailure = {};

    for (let attempt = 1; attempt <= delays.length + 1; attempt++) {
      const refreshToken = deps.getRefreshToken();
      if (!refreshToken) {
        emit('TOKEN_REFRESH_FAILED', { trigger, attempt, category: 'NO_REFRESH_TOKEN' });
        throw new RefreshError('TERMINAL', 'NO_REFRESH_TOKEN');
      }

      emit('TOKEN_REFRESH_STARTED', { trigger, attempt });
      try {
        const tokens = await deps.post(refreshToken);
        if (deps.getEpoch() !== epoch) {
          // logged out (or another account logged in) while the request was in flight
          emit('TOKEN_REFRESH_DISCARDED', { trigger, attempt });
          throw new RefreshError('SESSION_CHANGED', undefined);
        }
        await deps.persist(tokens);
        lastTransientAt = 0;
        emit('TOKEN_REFRESH_SUCCESS', { trigger, attempt });
        return tokens.accessToken;
      } catch (error) {
        if (error instanceof RefreshError) throw error;
        lastFailure = deps.toFailure(error);
        const kind = classifyRefreshFailure(lastFailure);
        emit('TOKEN_REFRESH_FAILED', {
          trigger,
          attempt,
          category: kind,
          status: lastFailure.status,
          reason: lastFailure.reason,
        });

        if (kind === 'TERMINAL') {
          if (deps.getEpoch() === epoch) deps.onTerminal(lastFailure.reason);
          throw new RefreshError('TERMINAL', lastFailure.reason, error);
        }
        if (attempt <= delays.length) {
          await deps.sleep(delays[attempt - 1] as number);
          if (deps.getEpoch() !== epoch) throw new RefreshError('SESSION_CHANGED', undefined);
          continue;
        }
      }
    }

    lastTransientAt = Date.now();
    if (deps.getEpoch() === epoch) deps.onTransient(lastFailure);
    throw new RefreshError('TRANSIENT', lastFailure.reason);
  }

  return {
    refresh(trigger: string) {
      if (!current) {
        current = run(trigger).finally(() => {
          current = null;
        });
      }
      return current;
    },
    inFlight: () => current,
    lastTransientFailureAt: () => lastTransientAt,
  };
}
