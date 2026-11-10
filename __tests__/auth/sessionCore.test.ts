import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  classifyRefreshFailure,
  computeAccessExpiresAt,
  createRefreshCoordinator,
  decideOnUnauthorized,
  decodeJwtClaims,
  RefreshError,
  sessionCorrelationId,
  shouldRefreshProactively,
  type RefreshDeps,
  type RefreshFailure,
  type TokenPair,
} from '../../src/services/auth/sessionCore.ts';

const b64url = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const fakeJwt = (claims: object) => `${b64url({ alg: 'RS256' })}.${b64url(claims)}.sig`;

// ---------------------------------------------------------------------------
describe('JWT claims', () => {
  test('decodes exp / iat / sid, including UTF-8', () => {
    const t = fakeJwt({ exp: 2000, iat: 1100, sid: 'abcdef1234567890', name: 'Zoë' });
    assert.deepStrictEqual(decodeJwtClaims(t), { exp: 2000, iat: 1100, sid: 'abcdef1234567890', name: 'Zoë' });
    assert.strictEqual(sessionCorrelationId(t), 'abcdef12');
  });

  test('garbage never throws', () => {
    for (const t of [null, undefined, '', 'abc', 'a.b', 'a.!!!.c', 'a.' + b64url([1]) + '.c']) {
      assert.doesNotThrow(() => decodeJwtClaims(t as any));
    }
    assert.strictEqual(decodeJwtClaims('a.!!!.c'), null);
  });

  test('expiry uses token lifetime from receipt, not the device clock', () => {
    // server says: issued at 1000, expires at 1900 (15 min). Device clock is 3 hours ahead.
    const t = fakeJwt({ iat: 1000, exp: 1900 });
    const deviceNow = 1000 * 1000 + 3 * 3600 * 1000;
    assert.strictEqual(computeAccessExpiresAt(t, deviceNow), deviceNow + 900_000);
    assert.strictEqual(shouldRefreshProactively(computeAccessExpiresAt(t, deviceNow), deviceNow), false);
    assert.strictEqual(shouldRefreshProactively(deviceNow + 900_000, deviceNow + 850_000), true);
    assert.strictEqual(shouldRefreshProactively(null, deviceNow), false);
  });
});

// ---------------------------------------------------------------------------
describe('401 policy: a 401 is never a logout by itself', () => {
  const base = {
    isAuthEndpoint: false,
    alreadyRetried: false,
    tokenSent: 'A1',
    currentAccessToken: 'A1',
    hasRefreshToken: true,
  };

  test('expired token -> refresh', () => {
    assert.strictEqual(decideOnUnauthorized({ ...base, reason: 'TOKEN_EXPIRED' }), 'REFRESH');
  });
  test('older server without reason -> refresh', () => {
    assert.strictEqual(decideOnUnauthorized(base), 'REFRESH');
  });
  test('request left before session restore / before a refresh landed -> resend with current token', () => {
    assert.strictEqual(
      decideOnUnauthorized({ ...base, tokenSent: null, reason: 'TOKEN_MISSING' }),
      'RETRY_WITH_CURRENT'
    );
    assert.strictEqual(decideOnUnauthorized({ ...base, tokenSent: 'A0' }), 'RETRY_WITH_CURRENT');
  });
  test('signed out (no tokens) -> reject, no refresh', () => {
    assert.strictEqual(
      decideOnUnauthorized({ ...base, tokenSent: null, currentAccessToken: null, hasRefreshToken: false }),
      'REJECT'
    );
  });
  test('already retried once -> reject (no loops)', () => {
    assert.strictEqual(decideOnUnauthorized({ ...base, alreadyRetried: true }), 'REJECT');
  });
  test('auth endpoints never trigger refresh (no recursion)', () => {
    assert.strictEqual(decideOnUnauthorized({ ...base, isAuthEndpoint: true }), 'REJECT');
  });
});

// ---------------------------------------------------------------------------
describe('refresh failure classification', () => {
  test('401 from the refresh endpoint ends the session', () => {
    for (const reason of ['SESSION_NOT_FOUND', 'TOKEN_REUSE_DETECTED', 'SESSION_REPLACED', 'REFRESH_TOKEN_EXPIRED', 'REFRESH_TOKEN_INVALID']) {
      assert.strictEqual(classifyRefreshFailure({ status: 401, reason }), 'TERMINAL', String(reason));
    }
    // older auth server: no `reason`, but it is our error envelope
    assert.strictEqual(classifyRefreshFailure({ status: 401, appEnvelope: true }), 'TERMINAL');
  });
  test('a bare 401 from a proxy / WAF / CDN (no reason, not our envelope) keeps the session', () => {
    assert.strictEqual(classifyRefreshFailure({ status: 401 }), 'TRANSIENT');
    assert.strictEqual(classifyRefreshFailure({ status: 401, appEnvelope: false }), 'TRANSIENT');
  });
  test('400 on refresh (body lost in transit) keeps the session', () => {
    assert.strictEqual(classifyRefreshFailure({ status: 400 }), 'TRANSIENT');
  });
  test('network, timeout, 429, 5xx never end the session', () => {
    for (const f of [{ noResponse: true }, {}, { status: 429 }, { status: 500 }, { status: 502 }, { status: 503 }, { status: 504 }, { status: 408 }]) {
      assert.strictEqual(classifyRefreshFailure(f), 'TRANSIENT', JSON.stringify(f));
    }
  });
  test('gateway misconfig (refresh route answered TOKEN_MISSING) does not log everyone out', () => {
    assert.strictEqual(classifyRefreshFailure({ status: 401, reason: 'TOKEN_MISSING' }), 'TRANSIENT');
  });
});

// ---------------------------------------------------------------------------
type Script = Array<TokenPair | RefreshFailure>;

function harness(script: Script, opts: { postDelayMs?: number } = {}) {
  const state = { rt: 'R0' as string | null, at: 'A0', epoch: 1 };
  const calls: string[] = [];
  const events: Array<[string, Record<string, unknown>]> = [];
  const log = { terminal: [] as Array<string | undefined>, transient: 0, persisted: [] as TokenPair[], sleeps: [] as number[] };
  const deps: RefreshDeps = {
    getRefreshToken: () => state.rt,
    getEpoch: () => state.epoch,
    async post(rt) {
      calls.push(rt);
      if (opts.postDelayMs) await new Promise((r) => setTimeout(r, opts.postDelayMs));
      const step = script.shift();
      if (!step) throw { noResponse: true };
      if ('accessToken' in step) return step as TokenPair;
      throw step;
    },
    toFailure: (e) => e as RefreshFailure,
    async persist(t) {
      log.persisted.push(t);
      state.at = t.accessToken;
      state.rt = t.refreshToken;
    },
    onTerminal(reason) {
      log.terminal.push(reason);
      state.rt = null;
    },
    onTransient() {
      log.transient++;
    },
    onEvent: (e, f) => events.push([e, f]),
    sleep: async (ms) => {
      log.sleeps.push(ms);
    },
  };
  return { state, calls, events, log, coordinator: createRefreshCoordinator(deps) };
}

describe('single-flight refresh coordinator', () => {
  test('10 simultaneous 401s -> ONE refresh request, all callers get the new token', async () => {
    const h = harness([{ accessToken: 'A1', refreshToken: 'R1' }], { postDelayMs: 20 });
    const results = await Promise.all(Array.from({ length: 10 }, () => h.coordinator.refresh('401')));
    assert.strictEqual(h.calls.length, 1);
    assert.deepStrictEqual(new Set(results), new Set(['A1']));
    assert.strictEqual(h.state.rt, 'R1');
    assert.strictEqual(h.coordinator.inFlight(), null);
  });

  test('persists BEFORE callers resume (retried requests use the stored token)', async () => {
    const h = harness([{ accessToken: 'A1', refreshToken: 'R1' }]);
    await h.coordinator.refresh('401');
    assert.deepStrictEqual(h.log.persisted, [{ accessToken: 'A1', refreshToken: 'R1' }]);
  });

  test('sequential refreshes each use the latest refresh token (never re-use a rotated one)', async () => {
    const h = harness([
      { accessToken: 'A1', refreshToken: 'R1' },
      { accessToken: 'A2', refreshToken: 'R2' },
    ]);
    await h.coordinator.refresh('a');
    await h.coordinator.refresh('b');
    assert.deepStrictEqual(h.calls, ['R0', 'R1']);
  });

  test('lost response: transient failure is retried with the SAME token (server grace replays)', async () => {
    const h = harness([{ noResponse: true }, { accessToken: 'A1', refreshToken: 'R1' }]);
    assert.strictEqual(await h.coordinator.refresh('401'), 'A1');
    assert.deepStrictEqual(h.calls, ['R0', 'R0']);
    assert.deepStrictEqual(h.log.sleeps, [1500]);
    assert.strictEqual(h.log.terminal.length, 0);
  });

  test('offline throughout -> TRANSIENT, session kept, retries bounded (no infinite loop)', async () => {
    const h = harness([{ noResponse: true }, { status: 503 }, { status: 502 }]);
    await assert.rejects(h.coordinator.refresh('401'), (e: any) => e instanceof RefreshError && e.kind === 'TRANSIENT');
    assert.strictEqual(h.calls.length, 3);
    assert.strictEqual(h.log.terminal.length, 0);
    assert.strictEqual(h.log.transient, 1);
    assert.strictEqual(h.state.rt, 'R0', 'refresh token must survive a network failure');
    assert.ok(h.coordinator.lastTransientFailureAt() > 0);
  });

  test('429 is transient', async () => {
    const h = harness([{ status: 429 }, { accessToken: 'A1', refreshToken: 'R1' }]);
    assert.strictEqual(await h.coordinator.refresh('401'), 'A1');
  });

  test('401 from refresh -> session ends exactly once, with the server reason, no retry', async () => {
    const h = harness([{ status: 401, reason: 'TOKEN_REUSE_DETECTED' }], { postDelayMs: 10 });
    const all = Array.from({ length: 5 }, () => h.coordinator.refresh('401').catch((e) => e));
    const errors = await Promise.all(all);
    assert.strictEqual(h.calls.length, 1);
    assert.deepStrictEqual(h.log.terminal, ['TOKEN_REUSE_DETECTED']);
    assert.ok(errors.every((e) => e instanceof RefreshError && e.kind === 'TERMINAL'));
    // afterwards: no refresh token -> immediate terminal, no network call
    await assert.rejects(h.coordinator.refresh('later'));
    assert.strictEqual(h.calls.length, 1);
  });

  test('logout while refresh in flight -> result discarded, nothing persisted, no terminal', async () => {
    const h = harness([{ accessToken: 'A1', refreshToken: 'R1' }], { postDelayMs: 20 });
    const p = h.coordinator.refresh('401');
    h.state.epoch++; // user tapped "log out"
    await assert.rejects(p, (e: any) => e.kind === 'SESSION_CHANGED');
    assert.strictEqual(h.log.persisted.length, 0);
    assert.strictEqual(h.log.terminal.length, 0);
  });

  test('events carry no token material', async () => {
    const h = harness([{ noResponse: true }, { accessToken: 'A1', refreshToken: 'R1' }]);
    await h.coordinator.refresh('401');
    const dump = JSON.stringify(h.events);
    assert.ok(!dump.includes('R0') && !dump.includes('R1') && !dump.includes('A1'));
    assert.deepStrictEqual(
      h.events.map((e) => e[0]),
      ['TOKEN_REFRESH_STARTED', 'TOKEN_REFRESH_FAILED', 'TOKEN_REFRESH_STARTED', 'TOKEN_REFRESH_SUCCESS']
    );
  });
});
