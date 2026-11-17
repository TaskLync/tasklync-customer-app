import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createSharedRequests } from '../../src/utils/sharedRequest.ts';

/** A factory whose completion the test controls; records whether its signal was aborted. */
function deferredFactory() {
  const calls: { signal: AbortSignal; resolve: (v: string) => void }[] = [];
  const factory = (signal: AbortSignal) =>
    new Promise<string>((resolve, reject) => {
      calls.push({ signal, resolve });
      signal.addEventListener('abort', () => {
        const e = new Error('Aborted');
        e.name = 'AbortError';
        reject(e);
      });
    });
  return { calls, factory };
}

describe('createSharedRequests (LOC-009 backlog fix)', () => {
  test('identical concurrent requests share one underlying call', async () => {
    const s = createSharedRequests<string>();
    const { calls, factory } = deferredFactory();
    const a = s.run('k', factory, new AbortController().signal);
    const b = s.run('k', factory, new AbortController().signal);
    assert.strictEqual(calls.length, 1);
    calls[0]!.resolve('addr');
    assert.deepStrictEqual(await Promise.all([a, b]), ['addr', 'addr']);
    assert.strictEqual(s.size(), 0);
  });

  test('when the ONLY waiter aborts, the underlying request is cancelled (no work for nobody)', async () => {
    const s = createSharedRequests<string>();
    const { calls, factory } = deferredFactory();
    const ctrl = new AbortController();
    const p = s.run('k', factory, ctrl.signal);
    ctrl.abort();
    await assert.rejects(p, { name: 'AbortError' });
    assert.strictEqual(calls[0]!.signal.aborted, true);
    assert.strictEqual(s.size(), 0);
  });

  test('one of two waiters aborting does NOT cancel the shared work for the other', async () => {
    const s = createSharedRequests<string>();
    const { calls, factory } = deferredFactory();
    const c1 = new AbortController();
    const p1 = s.run('k', factory, c1.signal);
    const p2 = s.run('k', factory, new AbortController().signal);
    c1.abort();
    await assert.rejects(p1, { name: 'AbortError' });
    assert.strictEqual(calls[0]!.signal.aborted, false);
    calls[0]!.resolve('addr');
    assert.strictEqual(await p2, 'addr');
  });

  test('rapid pin moves: 5 superseded lookups leave nothing running', async () => {
    const s = createSharedRequests<string>();
    const { calls, factory } = deferredFactory();
    const pending: Promise<string>[] = [];
    for (let i = 0; i < 5; i++) {
      const ctrl = new AbortController();
      pending.push(s.run(`cell-${i}`, factory, ctrl.signal).catch((e) => e.name));
      ctrl.abort(); // the user moved the pin again
    }
    assert.deepStrictEqual(await Promise.all(pending), Array(5).fill('AbortError'));
    assert.ok(calls.every((c) => c.signal.aborted));
    assert.strictEqual(s.size(), 0);
  });

  test('a caller without a signal pins the request (it is never cancelled)', async () => {
    const s = createSharedRequests<string>();
    const { calls, factory } = deferredFactory();
    const pinned = s.run('k', factory);
    const c = new AbortController();
    const other = s.run('k', factory, c.signal);
    c.abort();
    await assert.rejects(other, { name: 'AbortError' });
    assert.strictEqual(calls[0]!.signal.aborted, false);
    calls[0]!.resolve('addr');
    assert.strictEqual(await pinned, 'addr');
  });

  test('an already-aborted signal rejects without starting work', async () => {
    const s = createSharedRequests<string>();
    const { calls, factory } = deferredFactory();
    const c = new AbortController();
    c.abort();
    await assert.rejects(s.run('k', factory, c.signal), { name: 'AbortError' });
    assert.strictEqual(calls.length, 0);
  });
});
