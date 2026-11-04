import { test, describe } from 'node:test';
import assert from 'node:assert';
import { backoffDelay, sendWithRetry } from '../../src/utils/messageSender.ts';
import type { AckResult, SendSignal, SendTransport } from '../../src/utils/messageSender.ts';

type Payload = { tempId: string; content: string };
const payload: Payload = { tempId: 'temp_1', content: 'hello' };

/** Deterministic clock + sleeper: sleeping advances the clock instantly. */
function harness(acks: Array<AckResult | 'timeout'>, connected: boolean[] = []) {
  let now = 0;
  let i = 0;
  let c = 0;
  const sleeps: number[] = [];
  const emitted: Payload[] = [];
  let waited = 0;
  let waitResult = false;
  const transport: SendTransport<Payload> = {
    isConnected: () => (connected.length ? (connected[Math.min(c++, connected.length - 1)] as boolean) : true),
    waitForConnection: async (ms: number) => {
      waited += 1;
      now += ms;
      return waitResult;
    },
    emit: async (p: Payload) => {
      emitted.push(p);
      const next = acks[Math.min(i++, acks.length - 1)] as AckResult | 'timeout';
      if (next === 'timeout') throw new Error('timeout');
      return next;
    },
  };
  const options = {
    random: () => 0.5,
    now: () => now,
    sleep: async (ms: number) => {
      sleeps.push(ms);
      now += ms;
    },
  };
  return { transport, options, sleeps, emitted, waited: () => waited, setWaitResult: (v: boolean) => (waitResult = v) };
}

describe('sendWithRetry (customer app)', () => {
  test('is sent only when the server acknowledges, with the canonical message', async () => {
    const h = harness([{ ok: true, message: { id: 'srv-1', createdAt: '2026-11-04T10:00:00Z' } }]);
    const out = await sendWithRetry(payload, h.transport, undefined, h.options);
    assert.deepStrictEqual(out, {
      status: 'sent',
      message: { id: 'srv-1', createdAt: '2026-11-04T10:00:00Z' },
      duplicate: false,
      attempts: 1,
    });
  });

  test('a lost ack is retried with the SAME client id every time', async () => {
    const h = harness(['timeout', 'timeout', { ok: true, duplicate: true, message: { id: 'srv-1' } }]);
    const out = await sendWithRetry(payload, h.transport, undefined, h.options);
    assert.strictEqual(out.status, 'sent');
    assert.deepStrictEqual(h.emitted.map((p) => p.tempId), ['temp_1', 'temp_1', 'temp_1']);
  });

  for (const code of ['VALIDATION_ERROR', 'ROOM_CLOSED', 'CHAT_BLOCKED', 'CONTACT_INFO_NOT_ALLOWED']) {
    test(`non-retryable ${code} fails at once without retrying`, async () => {
      const h = harness([{ ok: false, code, retryable: false }]);
      const out = await sendWithRetry(payload, h.transport, undefined, h.options);
      assert.deepStrictEqual(out, { status: 'failed', code, retryable: false, attempts: 1 });
      assert.strictEqual(h.emitted.length, 1);
      assert.deepStrictEqual(h.sleeps, []);
    });
  }

  test('backs off exponentially and never retries instantly', async () => {
    const h = harness(['timeout']);
    await sendWithRetry(payload, h.transport, undefined, {
      ...h.options,
      maxAttempts: 5,
      baseDelayMs: 1000,
      maxDelayMs: 100_000,
      deadlineMs: 10_000_000,
    });
    assert.deepStrictEqual(h.sleeps, [750, 1500, 3000, 6000]);
  });

  test('gives up after maxAttempts with a retryable failure (UI offers manual retry)', async () => {
    const h = harness(['timeout']);
    const out = await sendWithRetry(payload, h.transport, undefined, { ...h.options, maxAttempts: 3, deadlineMs: 10_000_000 });
    assert.deepStrictEqual(out, { status: 'failed', code: 'ACK_TIMEOUT', retryable: true, attempts: 3 });
  });

  test('never emits into a dead socket: waits for the connection, fails as OFFLINE if it never returns', async () => {
    const h = harness([{ ok: true, message: { id: 'x' } }], [false]);
    const out = await sendWithRetry(payload, h.transport, undefined, { ...h.options, maxAttempts: 2, deadlineMs: 100_000 });
    assert.deepStrictEqual(out, { status: 'failed', code: 'OFFLINE', retryable: true, attempts: 2 });
    assert.strictEqual(h.emitted.length, 0);
    assert.ok(h.waited() > 0);
  });

  test('sends as soon as the connection returns', async () => {
    const h = harness([{ ok: true, message: { id: 'srv-3' } }], [false, true]);
    h.setWaitResult(true);
    const out = await sendWithRetry(payload, h.transport, undefined, h.options);
    assert.strictEqual(out.status, 'sent');
    assert.strictEqual(h.emitted.length, 1);
  });

  test('stops retrying once the echo confirmed the message (signal.settled): no duplicate resend', async () => {
    const signal: SendSignal = { settled: false, cancelled: false };
    const h = harness(['timeout']);
    const base = h.options.sleep;
    h.options.sleep = async (ms: number) => {
      await base(ms);
      signal.settled = true; // the message_received echo arrives while backing off
    };
    const out = await sendWithRetry(payload, h.transport, signal, h.options);
    assert.strictEqual(out.status, 'sent');
    assert.strictEqual(h.emitted.length, 1);
  });

  test('backoffDelay stays within [exp/2, exp], is capped and is jittered', () => {
    const o = { baseDelayMs: 1000, maxDelayMs: 8000 };
    for (let attempt = 1; attempt <= 10; attempt++) {
      for (const r of [0, 0.25, 0.5, 0.99]) {
        const d = backoffDelay(attempt, { ...o, random: () => r });
        const exp = Math.min(8000, 1000 * 2 ** (attempt - 1));
        assert.ok(d >= exp / 2 && d <= exp, `attempt ${attempt} r=${r} -> ${d}`);
      }
    }
    assert.notStrictEqual(backoffDelay(3, { ...o, random: () => 0 }), backoffDelay(3, { ...o, random: () => 1 }));
  });
});
