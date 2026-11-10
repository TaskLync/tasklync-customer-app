import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  formatDistance,
  isValidCoordinate,
  rememberWorkerCoords,
  resolveWorkerDistance,
} from '../../src/utils/locationUtils.ts';

// Offsets from a customer position: 1 degree latitude ≈ 111,195 m (R = 6371 km).
const CUSTOMER = { lat: 31.4187, lng: 73.0791 };
const M_PER_DEG_LAT = (Math.PI / 180) * 6371e3;
const northOf = (meters: number) => ({ lat: CUSTOMER.lat + meters / M_PER_DEG_LAT, lng: CUSTOMER.lng });

describe('formatDistance', () => {
  test('metres below 1 km, one-decimal km from 1 km', () => {
    assert.strictEqual(formatDistance(55), '55 m');
    assert.strictEqual(formatDistance(200), '200 m');
    assert.strictEqual(formatDistance(1200), '1.2 km');
    assert.strictEqual(formatDistance(5300), '5.3 km');
  });

  test('never renders "1000 m" at the boundary', () => {
    assert.strictEqual(formatDistance(999.6), '1.0 km');
  });

  test('unknown values render nothing, not a made-up label', () => {
    assert.strictEqual(formatDistance(0), '');
    assert.strictEqual(formatDistance(null), '');
    assert.strictEqual(formatDistance(NaN), '');
  });
});

describe('resolveWorkerDistance', () => {
  for (const [meters, label] of [
    [55, '55 m'],
    [200, '200 m'],
    [1200, '1.2 km'],
    [5300, '5.3 km'],
  ] as const) {
    test(`computes ${label} from real coordinates`, () => {
      const r = resolveWorkerDistance({ id: `w-${meters}`, ...northOf(meters) }, CUSTOMER);
      assert.strictEqual(r.distanceLabel, label);
    });
  }

  test('exact coordinates win over a rounded backend distance', () => {
    const r = resolveWorkerDistance({ id: 'a', distanceMeters: 100, ...northOf(55) }, CUSTOMER);
    assert.strictEqual(r.distanceLabel, '55 m');
  });

  test('same worker resolves identically with and without coords in the response', () => {
    // Nearby response carries coordinates; the search response for the same worker does not.
    const nearby = { id: 'shared', ...northOf(1200) };
    rememberWorkerCoords(nearby);
    const fromNearby = resolveWorkerDistance(nearby, CUSTOMER);
    const fromSearch = resolveWorkerDistance({ id: 'shared', distanceMeters: 1200 }, CUSTOMER);
    assert.strictEqual(fromNearby.distanceLabel, fromSearch.distanceLabel);
  });

  test('uses the backend distance when the worker has no coordinates', () => {
    const r = resolveWorkerDistance({ id: 'no-coords', distanceMeters: 2400 }, CUSTOMER);
    assert.strictEqual(r.distanceLabel, '2.4 km');
  });

  test('unknown customer location, missing/invalid worker coordinates → unavailable', () => {
    assert.deepStrictEqual(resolveWorkerDistance({ id: 'x', ...northOf(500) }, null), {
      distanceMeters: null,
      distanceLabel: '',
    });
    assert.deepStrictEqual(resolveWorkerDistance({ id: 'y', lat: 0, lng: 0 }, CUSTOMER), {
      distanceMeters: null,
      distanceLabel: '',
    });
    assert.deepStrictEqual(resolveWorkerDistance({ id: 'z', lat: NaN, lng: 73 }, CUSTOMER), {
      distanceMeters: null,
      distanceLabel: '',
    });
  });

  test('a moved customer changes the distance for the same worker', () => {
    const worker = { id: 'mover', ...northOf(1000) };
    const before = resolveWorkerDistance(worker, CUSTOMER).distanceMeters!;
    const after = resolveWorkerDistance(worker, northOf(600))!.distanceMeters!;
    assert.ok(Math.abs(before - 1000) <= 1);
    assert.ok(Math.abs(after - 400) <= 1);
  });
});

describe('isValidCoordinate', () => {
  test('rejects null island, NaN and out-of-range values', () => {
    assert.strictEqual(isValidCoordinate({ lat: 0, lng: 0 }), false);
    assert.strictEqual(isValidCoordinate({ lat: NaN, lng: 1 }), false);
    assert.strictEqual(isValidCoordinate({ lat: 91, lng: 1 }), false);
    assert.strictEqual(isValidCoordinate(null), false);
    assert.strictEqual(isValidCoordinate(CUSTOMER), true);
  });
});
