import * as SecureStore from 'expo-secure-store';
import { createMMKV } from 'react-native-mmkv';
import { recordAuthEvent } from './authEvents';

/**
 * Durable, secure session persistence.
 *
 * - Tokens live in the OS keychain / keystore (expo-secure-store) as ONE JSON value, so the
 *   access and refresh token can never be stored half-updated.
 * - Writes are serialised: two rotations in a row cannot land out of order.
 * - Migration: builds before this change kept tokens in plain MMKV ('accessToken' /
 *   'refreshToken' in the default instance). They are moved on first launch, and deleted
 *   from MMKV only after the secure write succeeded, so upgrading never logs anyone out.
 * - A rotated refresh token MUST be stored somewhere: the old one is dead on the server after
 *   60s. If the keystore write fails (rare Android keystore faults) the session is kept in
 *   MMKV as a fallback instead of being lost, and moved back on the next successful write.
 * - iOS keeps keychain items after uninstall. A first launch without our install marker clears
 *   a leftover session so a reinstalled app starts signed out (like Android).
 */

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  /** device-clock ms when the access token expires (see computeAccessExpiresAt) */
  accessExpiresAt: number | null;
  savedAt: number;
}

const SECURE_KEY = 'tasklync.session.v1';
const SECURE_OPTS: SecureStore.SecureStoreOptions = {
  // readable after the first unlock since boot: background launches (push taps) can restore
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

// default instance: where the legacy tokens were written
const legacy = createMMKV();
const LEGACY_ACCESS = 'accessToken';
const LEGACY_REFRESH = 'refreshToken';
const FALLBACK_KEY = 'auth.session.fallback';
const INSTALL_MARKER = 'auth.installMarker';

function parse(raw: string | null | undefined): StoredSession | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    if (s && typeof s.accessToken === 'string' && typeof s.refreshToken === 'string' && s.refreshToken) {
      return {
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        accessExpiresAt: typeof s.accessExpiresAt === 'number' ? s.accessExpiresAt : null,
        savedAt: typeof s.savedAt === 'number' ? s.savedAt : 0,
      };
    }
  } catch {
    /* corrupt value: treated as absent */
  }
  return null;
}

function readLegacy(): StoredSession | null {
  const fallback = parse(legacy.getString(FALLBACK_KEY));
  if (fallback) return fallback;
  const accessToken = legacy.getString(LEGACY_ACCESS);
  const refreshToken = legacy.getString(LEGACY_REFRESH);
  return accessToken && refreshToken ? { accessToken, refreshToken, accessExpiresAt: null, savedAt: 0 } : null;
}

function clearLegacy(): void {
  legacy.remove(LEGACY_ACCESS);
  legacy.remove(LEGACY_REFRESH);
  legacy.remove(FALLBACK_KEY);
}

async function readSecure(): Promise<{ session: StoredSession | null; failed: boolean }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return { session: parse(await SecureStore.getItemAsync(SECURE_KEY, SECURE_OPTS)), failed: false };
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  return { session: null, failed: true };
}

let writeChain: Promise<unknown> = Promise.resolve();
const serialised = <T>(task: () => Promise<T>): Promise<T> => {
  const next = writeChain.then(task, task);
  writeChain = next.catch(() => undefined);
  return next;
};

/** Never throws. `failed` = the keystore could not be read (do NOT treat as "signed out" forever). */
export async function loadSession(): Promise<{ session: StoredSession | null; failed: boolean }> {
  const firstLaunch = !legacy.getString(INSTALL_MARKER);
  const old = readLegacy();

  if (firstLaunch && !old) {
    // fresh install (MMKV is wiped on uninstall, the iOS keychain is not)
    await serialised(() => SecureStore.deleteItemAsync(SECURE_KEY, SECURE_OPTS)).catch(() => undefined);
    legacy.set(INSTALL_MARKER, '1');
    return { session: null, failed: false };
  }
  legacy.set(INSTALL_MARKER, '1');

  const secure = await readSecure();
  if (secure.session) {
    // a fallback copy newer than the secure one means the last secure write failed
    if (old && old.savedAt > secure.session.savedAt) {
      await saveSession(old);
      return { session: old, failed: false };
    }
    if (old) clearLegacy();
    return secure;
  }

  if (old) {
    // migrate legacy MMKV tokens (or recover the fallback copy)
    await saveSession({ ...old, savedAt: old.savedAt || Date.now() });
    return { session: old, failed: false };
  }
  return secure;
}

/** Resolves once the session is durably stored (secure store, else MMKV fallback). Never throws. */
export function saveSession(session: StoredSession): Promise<'secure' | 'fallback'> {
  return serialised(async () => {
    try {
      await SecureStore.setItemAsync(SECURE_KEY, JSON.stringify(session), SECURE_OPTS);
      clearLegacy();
      return 'secure' as const;
    } catch {
      legacy.set(FALLBACK_KEY, JSON.stringify(session));
      recordAuthEvent('SESSION_STORAGE_FALLBACK', {});
      return 'fallback' as const;
    }
  });
}

export function clearSession(): Promise<void> {
  clearLegacy();
  return serialised(async () => {
    try {
      await SecureStore.deleteItemAsync(SECURE_KEY, SECURE_OPTS);
    } catch {
      /* nothing else to do: the in-memory session is already gone */
    }
  });
}
