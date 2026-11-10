import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createSlotHoldManager, type HoldApi } from '../../src/services/booking/slotHold.ts';
import { cartDurationHours } from '../../src/utils/bookingDuration.ts';

const W = 'worker-1';
const T = { workerId: W, date: '2030-01-07', startTime: '10:00', durationHours: 1 };

function fakeApi(behaviour: (call: number) => Promise<any>) {
  const calls: string[] = [];
  let n = 0;
  const api: HoldApi = {
    holdSlot: async (w, d, t, h) => { calls.push(`hold ${w} ${d} ${t} ${h}`); return behaviour(++n); },
    releaseSlotHold: async (w, d, t, h) => { calls.push(`release ${w} ${d} ${t} ${h}`); },
  };
  return { api, calls };
}

const conflict = (code: string, reason?: string) =>
  Object.assign(new Error('x'), { status: 409, code, ...(reason ? { details: { reason } } : {}) });

describe('checkout slot hold', () => {
  test('a double tap on Continue sends ONE hold request', async () => {
    const { api, calls } = fakeApi(async () => ({ expires_at: new Date(Date.now() + 300_000).toISOString() }));
    const m = createSlotHoldManager(api);
    const [a, b] = await Promise.all([m.acquire(T), m.acquire(T)]);
    assert.deepStrictEqual(a, b);
    assert.strictEqual(calls.length, 1);
  });

  test('coming back to the same slot reuses the live hold (no request)', async () => {
    const { api, calls } = fakeApi(async () => ({ expires_at: new Date(Date.now() + 300_000).toISOString() }));
    const m = createSlotHoldManager(api);
    await m.acquire(T);
    await m.acquire(T);
    assert.strictEqual(calls.length, 1);
  });

  test('picking another slot releases the previous hold first (no slot left blocked)', async () => {
    const { api, calls } = fakeApi(async () => ({ expires_at: new Date(Date.now() + 300_000).toISOString() }));
    const m = createSlotHoldManager(api);
    await m.acquire(T);
    await m.acquire({ ...T, startTime: '11:00' });
    assert.deepStrictEqual(calls, [
      `hold ${W} 2030-01-07 10:00 1`,
      `release ${W} 2030-01-07 10:00 1`,
      `hold ${W} 2030-01-07 11:00 1`,
    ]);
  });

  test('Scenario 5 — an expiring hold is re-acquired instead of trusted', async () => {
    let now = 1_000_000;
    const { api, calls } = fakeApi(async () => ({ expires_at: new Date(now + 300_000).toISOString() }));
    const m = createSlotHoldManager(api, () => now);
    await m.acquire(T);
    now += 295_000; // 5 s left
    await m.acquire(T);
    assert.strictEqual(calls.filter((c) => c.startsWith('hold')).length, 2);
  });

  test('a verified conflict stops the customer; a network failure does not', async () => {
    const taken = createSlotHoldManager(fakeApi(async () => { throw conflict('SLOT_NOT_AVAILABLE'); }).api);
    const r1 = await taken.acquire(T);
    assert.strictEqual(r1.ok, false);
    assert.strictEqual(!r1.ok && r1.failure.kind, 'slot_taken');

    const paused = createSlotHoldManager(fakeApi(async () => { throw conflict('WORKER_PAUSED'); }).api);
    const r2 = await paused.acquire(T);
    assert.strictEqual(!r2.ok && r2.failure.kind, 'worker_unavailable');

    const offline = createSlotHoldManager(fakeApi(async () => { throw { isNetworkError: true, category: 'NETWORK_ERROR' }; }).api);
    const r3 = await offline.acquire(T);
    assert.deepStrictEqual(r3, { ok: true, held: false, expiresAt: null });
  });

  test('release never throws and forgets the hold', async () => {
    const api: HoldApi = {
      holdSlot: async () => ({ expires_at: new Date(Date.now() + 300_000).toISOString() }),
      releaseSlotHold: async () => { throw new Error('offline'); },
    };
    const m = createSlotHoldManager(api);
    await m.acquire(T);
    await m.release();
    assert.strictEqual(m.current, null);
  });
});

describe('one booking duration for slots, hold and create', () => {
  test('sums lines x quantity and clamps to the backend bounds (0.5..12 h)', () => {
    assert.strictEqual(cartDurationHours([]), 0.5);
    assert.strictEqual(cartDurationHours([{ durationMins: 20 }]), 0.5);          // below 0.5 h -> 0.5
    assert.strictEqual(cartDurationHours([{ durationHours: 1, quantity: 2 }, { durationMins: 30 }]), 2.5);
    assert.strictEqual(cartDurationHours([{ durationHours: 8, quantity: 2 }]), 12);
    assert.strictEqual(cartDurationHours([{}]), 0.5);
  });
});
