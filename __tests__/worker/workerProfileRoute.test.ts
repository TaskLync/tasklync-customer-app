import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  normalizeWorkerId,
  getWorkerProfileHref,
  isCompanyProfile,
  isProfileBelowCurrent,
  getBookAgainHref,
} from '../../src/utils/workerProfileRoute.ts';
import { CANONICAL_FALLBACK_UUIDS } from '../../src/utils/uuid.ts';

const ID = '5b1f0c2e-7d3a-4f6b-9a8e-1c2d3e4f5a6b';

describe('normalizeWorkerId: missing / invalid ids never navigate', () => {
  test('accepts real ids and trims them', () => {
    assert.strictEqual(normalizeWorkerId(ID), ID);
    assert.strictEqual(normalizeWorkerId(`  ${ID} `), ID);
    assert.strictEqual(normalizeWorkerId(42), '42');
  });

  test('rejects nullish, empty and stringified-nullish values', () => {
    for (const bad of [undefined, null, '', '   ', 'undefined', 'null', 'NaN', '0', 0, -1, NaN, {}, []]) {
      assert.strictEqual(normalizeWorkerId(bad), null, `expected null for ${JSON.stringify(bad)}`);
    }
  });

  test('rejects the placeholder worker UUID used before assignment', () => {
    assert.strictEqual(normalizeWorkerId(CANONICAL_FALLBACK_UUIDS.WORKER_DEFAULT), null);
  });
});

describe('getWorkerProfileHref: reuses the existing profile routes', () => {
  test('individual worker → /worker/[id]', () => {
    assert.deepStrictEqual(getWorkerProfileHref(ID), { pathname: '/worker/[id]', params: { id: ID } });
  });
  test('agency → /company/[id]', () => {
    assert.deepStrictEqual(getWorkerProfileHref(ID, true), { pathname: '/company/[id]', params: { id: ID } });
  });
  test('invalid id → null (caller renders a plain, non-interactive avatar)', () => {
    assert.strictEqual(getWorkerProfileHref(undefined), null);
    assert.strictEqual(getWorkerProfileHref('undefined', true), null);
  });
});

describe('isCompanyProfile: agency detection from cached profile data', () => {
  test('recognises both API shapes', () => {
    assert.strictEqual(isCompanyProfile({ is_company: true }), true);
    assert.strictEqual(isCompanyProfile({ provider_type: 'COMPANY' }), true);
    assert.strictEqual(isCompanyProfile({ providerType: 'COMPANY' }), true);
    assert.strictEqual(isCompanyProfile({ isCompany: true }), true);
  });
  test('unknown or individual → worker profile', () => {
    assert.strictEqual(isCompanyProfile(undefined), false);
    assert.strictEqual(isCompanyProfile({ provider_type: 'INDIVIDUAL' }), false);
  });
});

describe('isProfileBelowCurrent: no duplicate profiles in history', () => {
  const href = getWorkerProfileHref(ID)!;

  test('same profile directly below → go back', () => {
    const state = { index: 1, routes: [{ name: 'worker/[id]', params: { id: ID } }, { name: 'custom-request/new' }] };
    assert.strictEqual(isProfileBelowCurrent(state, href), true);
  });
  test('different worker below → push', () => {
    const state = { index: 1, routes: [{ name: 'worker/[id]', params: { id: 'other' } }, { name: 'chat/request/[requestId]' }] };
    assert.strictEqual(isProfileBelowCurrent(state, href), false);
  });
  test('company profile below but opening the worker route → push', () => {
    const state = { index: 1, routes: [{ name: 'company/[id]', params: { id: ID } }, { name: 'booking/[id]/chat' }] };
    assert.strictEqual(isProfileBelowCurrent(state, href), false);
  });
  test('first screen / missing state → push', () => {
    assert.strictEqual(isProfileBelowCurrent({ index: 0, routes: [{ name: 'worker/[id]', params: { id: ID } }] }, href), false);
    assert.strictEqual(isProfileBelowCurrent(undefined, href), false);
  });
});

describe('getBookAgainHref', () => {
  test('individual worker booking → that worker profile', () => {
    assert.deepStrictEqual(getBookAgainHref({ worker_id: ID }), { pathname: '/worker/[id]', params: { id: ID } });
  });

  test('agency booking → company profile (either flag)', () => {
    const company = { pathname: '/company/[id]', params: { id: ID } };
    assert.deepStrictEqual(getBookAgainHref({ worker_id: ID, is_company: true }), company);
    assert.deepStrictEqual(getBookAgainHref({ worker_id: ID, provider_type: 'COMPANY' }), company);
  });

  test('each past booking opens its own provider', () => {
    const bookings = [
      { worker_id: 'w-ali' },
      { worker_id: 'w-sara' },
      { worker_id: 'agency-1', provider_type: 'COMPANY' },
    ];
    assert.deepStrictEqual(
      bookings.map((b) => getBookAgainHref(b)),
      [
        { pathname: '/worker/[id]', params: { id: 'w-ali' } },
        { pathname: '/worker/[id]', params: { id: 'w-sara' } },
        { pathname: '/company/[id]', params: { id: 'agency-1' } },
      ],
    );
  });

  test('no real provider on the booking → null (caller shows a message, never a random worker)', () => {
    assert.strictEqual(getBookAgainHref({}), null);
    assert.strictEqual(getBookAgainHref({ worker_id: '' }), null);
    assert.strictEqual(getBookAgainHref({ worker_id: 'undefined' }), null);
    assert.strictEqual(getBookAgainHref({ worker_id: CANONICAL_FALLBACK_UUIDS.WORKER_DEFAULT }), null);
  });
});
