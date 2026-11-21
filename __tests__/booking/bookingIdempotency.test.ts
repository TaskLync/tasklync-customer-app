import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  createBookingIdempotency,
  bookingDetailsFingerprint,
  newIdempotencyKey,
  IDEMPOTENCY_KEY_FORMAT,
  type KeyValueStore,
} from '../../src/services/booking/bookingIdempotency.core.ts';

/** Stands in for MMKV: survives "app restarts" because a new manager is built over the same store. */
function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getString: (k) => data.get(k),
    set: (k, v) => { data.set(k, v); },
    remove: (k) => { data.delete(k); },
  };
}

const payload = {
  worker_id: 'w-1', scheduled_at: '2031-01-06T05:00:00.000Z', duration_hours: 1,
  items: [{ service_id: 's-1', quantity: 1 }], address_id: 'a-1',
};

describe('booking idempotency key (client side)', () => {
  test('keys match the backend format', () => {
    for (let i = 0; i < 200; i++) assert.match(newIdempotencyKey(), IDEMPOTENCY_KEY_FORMAT);
  });

  test('TEST 2/6: retries of the same booking (double tap, timeout, lost response) reuse ONE key', () => {
    const idem = createBookingIdempotency(memoryStore());
    const details = bookingDetailsFingerprint(payload);
    const first = idem.keyFor(details);
    assert.strictEqual(idem.keyFor(details), first);
    assert.strictEqual(idem.keyFor(details), first);
  });

  test('the key is NOT reset by a successful create: coming back to the summary re-sends the same key', () => {
    const idem = createBookingIdempotency(memoryStore());
    const details = bookingDetailsFingerprint(payload);
    const key = idem.keyFor(details);
    idem.markConfirmed(details, 'booking-123');
    assert.strictEqual(idem.keyFor(details), key); // the server will answer with booking-123, not a new booking
    assert.strictEqual(idem.confirmedBookingId(), 'booking-123');
  });

  test('TEST 11: the key survives an app restart (new manager over the same persisted store)', () => {
    const store = memoryStore();
    const details = bookingDetailsFingerprint(payload);
    const before = createBookingIdempotency(store).keyFor(details);
    const afterRestart = createBookingIdempotency(store).keyFor(details);
    assert.strictEqual(afterRestart, before);
  });

  test('field order does not matter; any changed detail is a different logical booking', () => {
    const idem = createBookingIdempotency(memoryStore());
    const reordered = { address_id: 'a-1', items: [{ quantity: 1, service_id: 's-1' }],
      duration_hours: 1, scheduled_at: payload.scheduled_at, worker_id: 'w-1' };
    assert.strictEqual(bookingDetailsFingerprint(reordered), bookingDetailsFingerprint(payload));

    const a = idem.keyFor(bookingDetailsFingerprint(payload));
    const b = idem.keyFor(bookingDetailsFingerprint({ ...payload, scheduled_at: '2031-01-06T06:00:00.000Z' }));
    assert.notStrictEqual(a, b);
  });

  test('TEST 10: after checkout finishes, the next booking (even identical details) gets a NEW key', () => {
    const idem = createBookingIdempotency(memoryStore());
    const details = bookingDetailsFingerprint(payload);
    const first = idem.keyFor(details);
    idem.clear();
    assert.notStrictEqual(idem.keyFor(details), first);
  });

  test('a key the server rejected as reused is discarded, never sent again', () => {
    const idem = createBookingIdempotency(memoryStore());
    const details = bookingDetailsFingerprint(payload);
    const first = idem.keyFor(details);
    idem.discard(details);
    assert.notStrictEqual(idem.keyFor(details), first);
  });

  test('a broken store never breaks booking: a key is still returned', () => {
    const broken: KeyValueStore = {
      getString: () => { throw new Error('mmkv down'); },
      set: () => { throw new Error('mmkv down'); },
      remove: () => { throw new Error('mmkv down'); },
    };
    assert.match(createBookingIdempotency(broken).keyFor('x'), IDEMPOTENCY_KEY_FORMAT);
  });
});
