/**
 * Checkout slot hold — the customer's temporary reservation while they enter address / review / pay.
 *
 * Lifecycle (the backend owns every state; the app only asks):
 *   viewing slots        -> nothing is held (browsing never blocks a worker)
 *   "Continue" on a slot -> acquire(): worker-service atomically holds the interval for SLOT_HOLD_TTL
 *                           (others now see it as HELD; checkout refuses it for anyone else)
 *   picking another slot -> the previous hold is released before the new one is taken
 *   booking created      -> booking-service releases the hold itself
 *   abandoned            -> the hold simply expires on the server
 *
 * The hold is protection, not the source of truth: booking create re-validates atomically in the
 * database. So a hold that could not be placed for a transient reason (network) does not stop the
 * customer — only a refusal the backend verified does.
 */
import { classifyBookingFailure, type BookingFailure } from '../../utils/availabilityEvents';

export interface HoldTarget {
  workerId: string;
  date: string;        // YYYY-MM-DD (PKT)
  startTime: string;   // HH:MM (24h, PKT)
  durationHours: number;
}

export interface HoldApi {
  holdSlot(workerId: string, date: string, startTime: string, durationHours: number): Promise<{ expires_at?: string }>;
  releaseSlotHold(workerId: string, date: string, startTime: string, durationHours: number): Promise<void>;
}

export type AcquireResult =
  | { ok: true; held: boolean; expiresAt: number | null }
  | { ok: false; failure: BookingFailure };

const sameTarget = (a: HoldTarget, b: HoldTarget) =>
  a.workerId === b.workerId && a.date === b.date && a.startTime === b.startTime && a.durationHours === b.durationHours;

export function createSlotHoldManager(api: HoldApi, now: () => number = Date.now) {
  let current: { target: HoldTarget; expiresAt: number } | null = null;
  let pending: Promise<AcquireResult> | null = null;

  async function release(): Promise<void> {
    const prev = current;
    current = null;
    if (!prev) return;
    try {
      await api.releaseSlotHold(prev.target.workerId, prev.target.date, prev.target.startTime, prev.target.durationHours);
    } catch {
      /* it expires on its own */
    }
  }

  async function acquireOnce(target: HoldTarget): Promise<AcquireResult> {
    // Still holding exactly this slot: no request.
    if (current && sameTarget(current.target, target) && current.expiresAt - now() > 15_000) {
      return { ok: true, held: true, expiresAt: current.expiresAt };
    }
    if (current && !sameTarget(current.target, target)) await release();
    try {
      const res = await api.holdSlot(target.workerId, target.date, target.startTime, target.durationHours);
      const expiresAt = res?.expires_at ? Date.parse(res.expires_at) : NaN;
      current = { target, expiresAt: Number.isFinite(expiresAt) ? expiresAt : now() + 5 * 60_000 };
      return { ok: true, held: true, expiresAt: current.expiresAt };
    } catch (err) {
      const failure = classifyBookingFailure(err);
      if (failure.kind === 'slot_taken' || failure.kind === 'worker_unavailable' || failure.kind === 'time_unavailable') {
        return { ok: false, failure };
      }
      // Transient / unknown: continue without a hold; create still validates atomically.
      return { ok: true, held: false, expiresAt: null };
    }
  }

  return {
    /** Concurrent calls share one request (double tap on "Continue"). */
    acquire(target: HoldTarget): Promise<AcquireResult> {
      if (!pending) pending = acquireOnce(target).finally(() => { pending = null; });
      return pending;
    },
    release,
    /** Booking created: booking-service already released the hold server-side. */
    forget() { current = null; },
    get current() { return current; },
  };
}
