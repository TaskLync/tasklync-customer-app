import { createMMKV } from 'react-native-mmkv';

/**
 * Privacy-safe authentication diagnostics.
 *
 * Keeps the last 50 auth events on the device (MMKV, survives restarts) so "why was I logged out?"
 * can be answered from a support build or a debug screen via getAuthEvents(). The session-ending
 * event is also kept separately (getLastSessionEnd).
 *
 * Never put a token, OTP, phone number or password in `fields`: keys that look sensitive are
 * dropped here as a second line of defence.
 */

export type AuthEventName =
  | 'SESSION_RESTORED'
  | 'SESSION_RESTORE_EMPTY'
  | 'SESSION_RESTORE_FAILED'
  | 'SESSION_STORAGE_FALLBACK'
  | 'ACCESS_TOKEN_EXPIRED'
  | 'AUTHENTICATION_FAILED'
  | 'TOKEN_REFRESH_STARTED'
  | 'TOKEN_REFRESH_SUCCESS'
  | 'TOKEN_REFRESH_FAILED'
  | 'TOKEN_REFRESH_DISCARDED'
  | 'SESSION_REVOKED'
  | 'SESSION_EXPIRED'
  | 'LOGIN_COMPLETED'
  | 'LOGOUT_COMPLETED';

export interface AuthEvent {
  event: AuthEventName | string;
  ts: string;
  [field: string]: unknown;
}

const storage = createMMKV({ id: 'tasklync_auth_diagnostics' });
const EVENTS_KEY = 'auth.events';
const LAST_END_KEY = 'auth.lastSessionEnd';
const MAX_EVENTS = 50;
const SENSITIVE = /token|otp|password|secret|phone|authorization|bearer/i;

function sanitize(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || SENSITIVE.test(k)) continue;
    out[k] = typeof v === 'string' && v.length > 200 ? v.slice(0, 200) : v;
  }
  return out;
}

function readEvents(): AuthEvent[] {
  try {
    const raw = storage.getString(EVENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordAuthEvent(event: AuthEventName | string, fields: Record<string, unknown> = {}): void {
  try {
    const entry: AuthEvent = { event, ts: new Date().toISOString(), ...sanitize(fields) };
    const events = readEvents();
    events.push(entry);
    storage.set(EVENTS_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
    if (event === 'SESSION_EXPIRED' || event === 'SESSION_REVOKED' || event === 'LOGOUT_COMPLETED') {
      storage.set(LAST_END_KEY, JSON.stringify(entry));
    }
    if (__DEV__) console.log(`[AuthEvent] ${event}`, sanitize(fields));
  } catch {
    /* diagnostics must never break authentication */
  }
}

export function getAuthEvents(): AuthEvent[] {
  return readEvents();
}

export function getLastSessionEnd(): AuthEvent | null {
  try {
    const raw = storage.getString(LAST_END_KEY);
    return raw ? (JSON.parse(raw) as AuthEvent) : null;
  } catch {
    return null;
  }
}
