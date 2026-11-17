import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  createProviderHealth,
  classifyGoogleFailure,
  PROVIDER_COOLDOWN_MS,
  SOFT_FAILURE_THRESHOLD,
} from '../../src/services/maps/providerHealth.ts';

describe('providerHealth', () => {
  test('a denied project is skipped after ONE failure, for the denied cooldown', () => {
    let now = 0;
    const h = createProviderHealth(() => now);
    assert.strictEqual(h.isAvailable('places_new'), true);
    assert.strictEqual(h.recordFailure('places_new', 'denied'), true);
    assert.strictEqual(h.isAvailable('places_new'), false);
    now += PROVIDER_COOLDOWN_MS.denied - 1;
    assert.strictEqual(h.isAvailable('places_new'), false);
    now += 2;
    assert.strictEqual(h.isAvailable('places_new'), true);
  });

  test('network blips only disable a provider after the soft threshold', () => {
    const h = createProviderHealth(() => 0);
    for (let i = 1; i < SOFT_FAILURE_THRESHOLD; i++) {
      assert.strictEqual(h.recordFailure('osm', 'network'), false);
      assert.strictEqual(h.isAvailable('osm'), true);
    }
    assert.strictEqual(h.recordFailure('osm', 'network'), true);
    assert.strictEqual(h.isAvailable('osm'), false);
  });

  test('success resets the soft failure count; providers are independent', () => {
    const h = createProviderHealth(() => 0);
    h.recordFailure('osm', 'network');
    h.recordFailure('osm', 'network');
    h.recordSuccess('osm');
    assert.strictEqual(h.recordFailure('osm', 'network'), false);
    h.recordFailure('proxy', 'not_deployed');
    assert.strictEqual(h.isAvailable('proxy'), false);
    assert.strictEqual(h.isAvailable('osm'), true);
    assert.strictEqual(h.lastReason('proxy'), 'not_deployed');
  });
});

describe('classifyGoogleFailure', () => {
  test('maps Google statuses / HTTP codes seen live in the audit', () => {
    assert.strictEqual(classifyGoogleFailure(200, 'REQUEST_DENIED'), 'denied'); // billing disabled
    assert.strictEqual(classifyGoogleFailure(403, undefined), 'denied'); // Places (New) PERMISSION_DENIED
    assert.strictEqual(classifyGoogleFailure(200, 'OVER_QUERY_LIMIT'), 'quota');
    assert.strictEqual(classifyGoogleFailure(429, undefined), 'quota');
    assert.strictEqual(classifyGoogleFailure(500, undefined), 'server');
    assert.strictEqual(classifyGoogleFailure(200, 'OK'), null);
    assert.strictEqual(classifyGoogleFailure(200, 'ZERO_RESULTS'), null);
  });
});
