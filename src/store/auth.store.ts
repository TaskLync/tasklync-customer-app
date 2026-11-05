import { create } from 'zustand';
import { createMMKV } from 'react-native-mmkv';
import { AuthUser } from '../types/auth.types';
import { clearSession, loadSession, saveSession } from '../services/auth/tokenStorage';
import { computeAccessExpiresAt, sessionCorrelationId } from '../services/auth/sessionCore';
import { recordAuthEvent } from '../services/auth/authEvents';

// non-secret profile cache (the tokens are in the secure store, see tokenStorage.ts)
const storage = createMMKV();

/**
 * Session state machine.
 *
 *   INITIALIZING ──restore──> AUTHENTICATED | UNAUTHENTICATED
 *   AUTHENTICATED ──401──> REFRESHING_TOKEN ──ok──> AUTHENTICATED
 *                                           └─network/5xx/429──> TEMPORARILY_UNAVAILABLE (session kept)
 *                                           └─refresh 401──> SESSION_EXPIRED (tokens cleared)
 *   any ──logout──> UNAUTHENTICATED          SESSION_EXPIRED | UNAUTHENTICATED ──login──> AUTHENTICATED
 *
 * Only SESSION_EXPIRED / UNAUTHENTICATED send the user to the Welcome screen, and only the
 * refresh endpoint (or the user) can cause them.
 */
export type AuthState =
  | 'INITIALIZING'
  | 'AUTHENTICATED'
  | 'UNAUTHENTICATED'
  | 'REFRESHING_TOKEN'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'SESSION_EXPIRED'
  // Backward compatibility aliases
  | 'idle'
  | 'loading'
  | 'authenticated'
  | 'unauthenticated';

const SESSION_STATES: AuthState[] = ['AUTHENTICATED', 'authenticated', 'REFRESHING_TOKEN', 'TEMPORARILY_UNAVAILABLE'];
const LOADING_STATES: AuthState[] = ['INITIALIZING', 'loading', 'idle'];

export const isSessionState = (s: AuthState) => SESSION_STATES.includes(s);
export const isSignedOutState = (s: AuthState) =>
  s === 'UNAUTHENTICATED' || s === 'unauthenticated' || s === 'SESSION_EXPIRED';

interface AuthStoreState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** device-clock ms when the access token expires, null if unknown */
  accessExpiresAt: number | null;
  authState: AuthState;
  isNewUser: boolean;
  /** server reason for the last forced sign-out (SESSION_REPLACED, TOKEN_REUSE_DETECTED, ...) */
  sessionEndReason: string | null;
  /** bumps on login / logout / session end; a refresh started in an older epoch is discarded */
  sessionEpoch: number;

  // derived from authState on every change (plain fields: zustand copies getters as values)
  isAuthenticated: boolean;
  isLoading: boolean;

  /** Updates memory immediately; the promise resolves once the pair is durably stored. */
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  setUser: (user: AuthUser) => void;
  setIsNewUser: (isNewUser: boolean) => void;
  /** Restores the session from secure storage. Idempotent: every call returns the same promise. */
  hydrate: () => Promise<void>;
  /** User-initiated sign out. */
  logout: () => void;
  /** Server confirmed the session cannot be refreshed. */
  expireSession: (reason: string | undefined) => void;
  setAuthState: (state: AuthState) => void;
  setRefreshingToken: () => void;
  setTemporarilyUnavailable: () => void;
}

const derive = (authState: AuthState) => ({
  isAuthenticated: SESSION_STATES.includes(authState),
  isLoading: LOADING_STATES.includes(authState),
});

let hydratePromise: Promise<void> | null = null;
let resolveReady: () => void = () => undefined;
const readyPromise = new Promise<void>((r) => {
  resolveReady = r;
});

/** Resolves once the stored session has been restored (or found absent). Never rejects. */
export const whenAuthReady = (): Promise<void> => readyPromise;

const HYDRATE_TIMEOUT_MS = 5_000;

type LoadResult = Awaited<ReturnType<typeof loadSession>>;

export const useAuthStore = create<AuthStoreState>((set, get) => {
  const setAuth = (patch: Partial<AuthStoreState>) =>
    set(patch.authState ? { ...patch, ...derive(patch.authState) } : patch);

  const readCachedUser = (): AuthUser | null => {
    try {
      const raw = storage.getString('user');
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  };

  const clearLocal = (authState: AuthState, sessionEndReason: string | null) => {
    storage.remove('user');
    void clearSession();
    setAuth({
      user: null,
      accessToken: null,
      refreshToken: null,
      accessExpiresAt: null,
      isNewUser: false,
      sessionEndReason,
      sessionEpoch: get().sessionEpoch + 1,
      authState,
    });
  };

  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    accessExpiresAt: null,
    authState: 'INITIALIZING',
    isNewUser: false,
    sessionEndReason: null,
    sessionEpoch: 0,
    ...derive('INITIALIZING'),

    setTokens: (accessToken, refreshToken) => {
      const now = Date.now();
      const accessExpiresAt = computeAccessExpiresAt(accessToken, now);
      const wasSignedIn = isSessionState(get().authState);
      setAuth({
        accessToken,
        refreshToken,
        accessExpiresAt,
        sessionEndReason: null,
        authState: 'AUTHENTICATED',
        // a login (not a refresh) starts a new epoch
        ...(wasSignedIn ? {} : { sessionEpoch: get().sessionEpoch + 1 }),
      });
      if (!wasSignedIn) recordAuthEvent('LOGIN_COMPLETED', { sid: sessionCorrelationId(accessToken) });
      return saveSession({ accessToken, refreshToken, accessExpiresAt, savedAt: now }).then(() => undefined);
    },

    setUser: (user) => {
      storage.set('user', JSON.stringify(user));
      set({ user });
    },

    setIsNewUser: (isNewUser) => {
      set({ isNewUser });
    },

    setAuthState: (state) => {
      setAuth({ authState: state });
    },

    setRefreshingToken: () => {
      const current = get().authState;
      if (current === 'AUTHENTICATED' || current === 'authenticated' || current === 'TEMPORARILY_UNAVAILABLE') {
        setAuth({ authState: 'REFRESHING_TOKEN' });
      }
    },

    setTemporarilyUnavailable: () => {
      const current = get().authState;
      if (current === 'AUTHENTICATED' || current === 'authenticated' || current === 'REFRESHING_TOKEN') {
        setAuth({ authState: 'TEMPORARILY_UNAVAILABLE' });
      }
    },

    hydrate: () => {
      if (hydratePromise) return hydratePromise;
      const startEpoch = get().sessionEpoch;

      const apply = (result: LoadResult, late: boolean) => {
        const s = get();
        // a login/logout happened meanwhile: that state wins
        if (s.sessionEpoch !== startEpoch) return;
        if (late && s.authState !== 'UNAUTHENTICATED') return;
        if (result.session) {
          setAuth({
            accessToken: result.session.accessToken,
            refreshToken: result.session.refreshToken,
            accessExpiresAt: result.session.accessExpiresAt,
            user: readCachedUser(),
            authState: 'AUTHENTICATED',
          });
          recordAuthEvent('SESSION_RESTORED', { sid: sessionCorrelationId(result.session.accessToken), late });
        } else {
          // storage is NOT cleared here: a failed keystore read can recover on the next launch
          setAuth({ authState: 'UNAUTHENTICATED' });
          recordAuthEvent(result.failed ? 'SESSION_RESTORE_FAILED' : 'SESSION_RESTORE_EMPTY', {});
        }
      };

      const load: Promise<LoadResult> = loadSession().catch(() => ({ session: null, failed: true }));
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), HYDRATE_TIMEOUT_MS));

      hydratePromise = Promise.race([load, timeout]).then((first) => {
        if (first) {
          apply(first, false);
        } else {
          apply({ session: null, failed: true }, false);
          // keystore answered late: restore if the user is still on the signed-out screens
          void load.then((r) => apply(r, true));
        }
        resolveReady();
      });
      return hydratePromise;
    },

    logout: () => {
      recordAuthEvent('LOGOUT_COMPLETED', { sid: sessionCorrelationId(get().accessToken) });
      clearLocal('UNAUTHENTICATED', null);
    },

    expireSession: (reason) => {
      recordAuthEvent('SESSION_EXPIRED', { reason, sid: sessionCorrelationId(get().accessToken) });
      clearLocal('SESSION_EXPIRED', reason ?? 'UNKNOWN');
    },
  };
});

// Start restoring as soon as the module loads, before any screen renders.
void useAuthStore.getState().hydrate();
