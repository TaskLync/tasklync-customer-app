import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  invalidateAvailability,
  onAvailabilityInvalidated,
  isSlotConflictError,
  classifyBookingFailure,
} from '../../src/utils/availabilityEvents.ts';

describe('availabilityEvents', () => {
  test('notifies subscribers with the worker id and supports unsubscribe', () => {
    const seen: Array<string | null> = [];
    const off = onAvailabilityInvalidated((id) => seen.push(id));
    invalidateAvailability('worker-a');
    invalidateAvailability();
    off();
    invalidateAvailability('worker-b');
    assert.deepStrictEqual(seen, ['worker-a', null]);
  });

  test('a throwing listener does not block others', () => {
    let ok = false;
    const off1 = onAvailabilityInvalidated(() => { throw new Error('boom'); });
    const off2 = onAvailabilityInvalidated(() => { ok = true; });
    invalidateAvailability('w');
    off1(); off2();
    assert.strictEqual(ok, true);
  });

  // Regression: every 409 / WORKER_NOT_AVAILABLE used to read as "booked by someone else", even for a
  // paused worker, a blocked time, a busy lock or a failed verification — while the slot stayed available.
  test('only a backend-verified conflict is a slot conflict', () => {
    const e = (code: string, reason?: string, status = 409, message = '') =>
      ({ status, code, message, ...(reason ? { details: { reason } } : {}) });
    assert.strictEqual(isSlotConflictError(e('WORKER_NOT_AVAILABLE', 'SLOT_TAKEN')), true);
    assert.strictEqual(isSlotConflictError(e('SLOT_HELD_BY_ANOTHER_USER', 'SLOT_HELD')), true);
    assert.strictEqual(isSlotConflictError(e('SLOT_UNAVAILABLE', 'SLOT_TAKEN')), true);
    assert.strictEqual(isSlotConflictError({ response: { status: 409, data: { error: { code: 'SLOT_UNAVAILABLE' } } } }), true);

    assert.strictEqual(isSlotConflictError(e('WORKER_NOT_AVAILABLE', 'WORKER_PAUSED')), false);
    assert.strictEqual(isSlotConflictError(e('WORKER_NOT_AVAILABLE', 'OUTSIDE_SCHEDULE')), false);
    assert.strictEqual(isSlotConflictError(e('CONCURRENT_BOOKING_LOCK', 'LOCK_BUSY')), false);
    assert.strictEqual(isSlotConflictError(e('COUPON_NO_LONGER_AVAILABLE')), false);
    assert.strictEqual(isSlotConflictError({ response: { status: 409 } }), false);
    assert.strictEqual(isSlotConflictError({ response: { status: 500 } }), false);
    assert.strictEqual(isSlotConflictError(new Error('network')), false);
  });

  test('classifies every failure from what the backend reported', () => {
    const k = (err: any) => classifyBookingFailure(err).kind;
    const e = (code: string, reason?: string, status = 409, message = '') =>
      ({ status, code, message, ...(reason ? { details: { reason } } : {}) });
    assert.strictEqual(k(e('WORKER_NOT_AVAILABLE', 'BLOCKED')), 'time_unavailable');
    assert.strictEqual(k(e('WORKER_NOT_AVAILABLE', 'OUTSIDE_SCHEDULE')), 'time_unavailable');
    assert.strictEqual(k(e('WORKER_NOT_AVAILABLE', 'WORKER_PAUSED')), 'worker_unavailable');
    assert.strictEqual(k(e('WORKER_PAUSED')), 'worker_unavailable');
    assert.strictEqual(k(e('WORKER_NOT_AVAILABLE', 'VERIFY_FAILED')), 'retryable');
    assert.strictEqual(k(e('CONCURRENT_BOOKING_LOCK')), 'retryable');
    assert.strictEqual(k({ isNetworkError: true, status: undefined, code: 'NETWORK_ERROR' }), 'retryable');
    assert.strictEqual(k({ isTimeout: true }), 'retryable');
    assert.strictEqual(k({ status: 503, code: 'SERVICE_UNAVAILABLE' }), 'retryable');
    assert.strictEqual(k({ status: 422, code: 'VALIDATION_ERROR' }), 'other');
    assert.strictEqual(k(new Error('Authentication required')), 'other');
  });

  test('older backend (no details.reason): only the overlap message is a conflict', () => {
    const k = (message: string) => classifyBookingFailure({ status: 409, code: 'WORKER_NOT_AVAILABLE', message }).kind;
    assert.strictEqual(k('Worker has an overlapping booking for the requested time slot'), 'slot_taken');
    assert.strictEqual(k('Worker is currently paused'), 'worker_unavailable');
    assert.strictEqual(k('Worker availability could not be verified. Please try again.'), 'retryable');
    assert.strictEqual(k('Worker is not scheduled to work during the requested time slot'), 'time_unavailable');
  });
});
