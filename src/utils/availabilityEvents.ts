/**
 * Tiny pub/sub so any screen can tell the availability hooks "this worker's calendar changed"
 * (booking created, booking failed with a slot conflict, booking cancelled, ...).
 * Hooks refetch from the backend; nothing is ever generated or patched locally.
 */
type Listener = (workerId: string | null) => void;
const listeners = new Set<Listener>();

export function onAvailabilityInvalidated(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Pass the worker id whose calendar changed, or null to refresh every mounted calendar. */
export function invalidateAvailability(workerId: string | null = null): void {
  listeners.forEach((fn) => {
    try {
      fn(workerId);
    } catch {
      /* a failing listener must not block others */
    }
  });
}

/**
 * What a failed booking / hold request means for the customer. Decided ONLY from what the backend
 * reported (`error.code` + `error.details.reason`), never guessed from the HTTP status alone:
 *
 *  - slot_taken          another booking or another customer's live checkout owns the time (genuine conflict)
 *  - time_unavailable    the professional can't do this time (blocked, outside working hours)
 *  - worker_unavailable  the professional isn't taking bookings (paused / suspended)
 *  - retryable           temporary: network, timeout, server error, busy lock, availability not verifiable
 *  - other               anything else (validation, discount, ...): show the backend's message
 */
export type BookingFailureKind = 'slot_taken' | 'time_unavailable' | 'worker_unavailable' | 'retryable' | 'other';

export interface BookingFailure {
  kind: BookingFailureKind;
  code: string | null;
  reason: string | null;
  message: string;
}

function readError(err: any) {
  const body = err?.response?.data?.error ?? err?.response?.data ?? null;
  const status: number | undefined = err?.response?.status ?? err?.status;
  const code: string | null = body?.code ?? err?.code ?? null;
  const details = body?.details ?? err?.details;
  const reason: string | null =
    details && typeof details === 'object' && !Array.isArray(details) && typeof details.reason === 'string'
      ? details.reason
      : null;
  const message: string = body?.message ?? err?.message ?? '';
  return { status, code, reason, message };
}

export function classifyBookingFailure(err: any): BookingFailure {
  const { status, code, reason, message } = readError(err);
  const out = (kind: BookingFailureKind): BookingFailure => ({ kind, code, reason, message });

  // 1. The backend told us why (current booking-service / worker-service).
  if (reason === 'SLOT_TAKEN' || reason === 'SLOT_HELD') return out('slot_taken');
  if (reason === 'BLOCKED' || reason === 'OUTSIDE_SCHEDULE') return out('time_unavailable');
  if (reason === 'WORKER_PAUSED' || reason === 'WORKER_UNAVAILABLE') return out('worker_unavailable');
  if (reason === 'LOCK_BUSY' || reason === 'VERIFY_FAILED') return out('retryable');

  // 2. Codes that are unambiguous on their own.
  if (code === 'SLOT_UNAVAILABLE' || code === 'SLOT_HELD_BY_ANOTHER_USER' || code === 'SLOT_NOT_AVAILABLE') {
    return out('slot_taken');
  }
  if (code === 'WORKER_PAUSED') return out('worker_unavailable');
  if (code === 'CONCURRENT_BOOKING_LOCK') return out('retryable');

  // 3. Older backend without details.reason: only the overlap message is a genuine conflict.
  if (code === 'WORKER_NOT_AVAILABLE') {
    if (/overlapping booking/i.test(message)) return out('slot_taken');
    if (/could not be verified/i.test(message)) return out('retryable');
    if (/paused|not accepting bookings/i.test(message)) return out('worker_unavailable');
    return out('time_unavailable');
  }

  // 4. Transport / server trouble: the booking was NOT refused for the slot.
  if (
    err?.isNetworkError || err?.isTimeout ||
    err?.category === 'NETWORK_ERROR' || err?.category === 'REQUEST_TIMEOUT' ||
    code === 'ERR_NETWORK' || code === 'ECONNABORTED' || code === 'ETIMEDOUT' ||
    status === 429 || (typeof status === 'number' && status >= 500)
  ) {
    return out('retryable');
  }
  return out('other');
}

/** True only when the backend verified that the slot itself is taken (booking or live hold). */
export function isSlotConflictError(err: any): boolean {
  return classifyBookingFailure(err).kind === 'slot_taken';
}
