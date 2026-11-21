/**
 * Idempotency key for "Confirm booking" — pure logic, storage injected (MMKV in the app, a Map in tests).
 *
 * One set of booking details = one key, minted BEFORE the first request and reused by every retry of that same
 * booking (double tap, timeout, lost response, app restart, returning to the summary). The backend stores the key
 * on the booking under a unique index, so a repeat returns the ORIGINAL booking instead of creating another.
 * Cleared only when the checkout is finished (payment confirmed / customer left the payment step) or the details
 * change.
 */

export interface KeyValueStore {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
}

interface StoredAttempt {
  /** Canonical request details the key was minted for. Different details => different logical booking. */
  details: string;
  key: string;
  /** Set once the server confirmed the booking for this key. */
  bookingId?: string;
}

export const IDEMPOTENCY_STORAGE_KEY = 'tasklync_booking_idempotency_v1';

/** booking-service accepts 8-64 chars of [A-Za-z0-9._:-] for Idempotency-Key / attempt_id. */
export const IDEMPOTENCY_KEY_FORMAT = /^[A-Za-z0-9._:-]{8,64}$/;

export function newIdempotencyKey(): string {
  const rand = () => Math.random().toString(36).slice(2, 10).padEnd(8, '0');
  return `ba-${Date.now().toString(36)}-${rand()}${rand()}`;
}

/** Stable string for the exact request: same payload (any key order) => same string => same key. */
export function bookingDetailsFingerprint(payload: Record<string, unknown>): string {
  const sortKeys = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === 'object') {
      return Object.keys(v as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          const val = (v as Record<string, unknown>)[k];
          if (val !== undefined) acc[k] = sortKeys(val);
          return acc;
        }, {});
    }
    return v;
  };
  return JSON.stringify(sortKeys(payload));
}

export function createBookingIdempotency(store: KeyValueStore, mintKey: () => string = newIdempotencyKey) {
  const read = (): StoredAttempt | null => {
    try {
      const raw = store.getString(IDEMPOTENCY_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredAttempt;
      return parsed && typeof parsed.key === 'string' && typeof parsed.details === 'string' ? parsed : null;
    } catch {
      return null;
    }
  };
  const write = (value: StoredAttempt | null): void => {
    try {
      if (value) store.set(IDEMPOTENCY_STORAGE_KEY, JSON.stringify(value));
      else store.remove(IDEMPOTENCY_STORAGE_KEY);
    } catch {
      // Storage failure only loses restart-survival; this run still reuses the key it returned.
    }
  };

  return {
    /** The key for these details: the stored one if the details are unchanged, otherwise a fresh (persisted) one. */
    keyFor(details: string): string {
      const stored = read();
      if (stored && stored.details === details) return stored.key;
      const key = mintKey();
      write({ details, key });
      return key;
    },
    /** Remember which booking the key produced (diagnostics; the server stays the source of truth). */
    markConfirmed(details: string, bookingId: string): void {
      const stored = read();
      if (stored && stored.details === details) write({ ...stored, bookingId });
    },
    /** The server said this key belongs to a different request: never send it again. */
    discard(details: string): void {
      const stored = read();
      if (stored && stored.details === details) write(null);
    },
    /** Checkout finished: the next booking is a new logical booking with a new key. */
    clear(): void {
      write(null);
    },
    /** Booking id confirmed for the current key, if any. */
    confirmedBookingId(): string | undefined {
      return read()?.bookingId;
    },
  };
}
