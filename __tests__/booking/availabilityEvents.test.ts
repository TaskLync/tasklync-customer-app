import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  invalidateAvailability,
  onAvailabilityInvalidated,
  isSlotConflictError,
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

  test('detects slot conflicts by status and by backend code', () => {
    assert.strictEqual(isSlotConflictError({ response: { status: 409 } }), true);
    assert.strictEqual(isSlotConflictError({ response: { data: { error: { code: 'WORKER_NOT_AVAILABLE' } } } }), true);
    assert.strictEqual(isSlotConflictError({ response: { data: { error: { code: 'CONCURRENT_BOOKING_LOCK' } } } }), true);
    assert.strictEqual(isSlotConflictError({ response: { status: 500 } }), false);
    assert.strictEqual(isSlotConflictError(new Error('network')), false);
  });
});
