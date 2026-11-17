import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  classifyPermissionPrecision,
  classifyFix,
  isLocationJump,
  pickBestConsistentSample,
  canSettleImmediately,
  pinShiftMeters,
  type FixSample,
} from '../../src/utils/locationConfidence.ts';

/** Neutral placeholder coordinates — logic tests only, no claims about real-world accuracy. */
const BASE = { lat: 10, lng: 20 };
const NOW = 1_000_000;
/** ~111 m per 0.001° of latitude */
const at = (dLatDeg: number, accuracy: number, ageMs = 0, extra: Partial<FixSample> = {}): FixSample => ({
  lat: BASE.lat + dLatDeg,
  lng: BASE.lng,
  accuracy,
  timestamp: NOW - ageMs,
  ...extra,
});

describe('classifyPermissionPrecision', () => {
  test('android coarse / ios reduced are approximate', () => {
    assert.strictEqual(classifyPermissionPrecision({ granted: true, android: { accuracy: 'coarse' } }), 'approximate');
    assert.strictEqual(classifyPermissionPrecision({ granted: true, ios: { accuracy: 'reduced' } }), 'approximate');
  });
  test('android fine / ios full are precise', () => {
    assert.strictEqual(classifyPermissionPrecision({ granted: true, android: { accuracy: 'fine' } }), 'precise');
    assert.strictEqual(classifyPermissionPrecision({ granted: true, ios: { accuracy: 'full' } }), 'precise');
  });
  test('not granted or no details is unknown', () => {
    assert.strictEqual(classifyPermissionPrecision({ granted: false, android: { accuracy: 'fine' } }), 'unknown');
    assert.strictEqual(classifyPermissionPrecision({ granted: true }), 'unknown');
    assert.strictEqual(classifyPermissionPrecision(null), 'unknown');
  });
});

describe('classifyFix', () => {
  test('tiers by accuracy for fresh fixes', () => {
    assert.strictEqual(classifyFix(at(0, 12), NOW), 'verified');
    assert.strictEqual(classifyFix(at(0, 30), NOW), 'acceptable');
    assert.strictEqual(classifyFix(at(0, 90), NOW), 'approximate');
    assert.strictEqual(classifyFix(at(0, 900), NOW), 'rejected');
  });
  test('a stale but accurate fix can only centre the map, never seed the pin', () => {
    assert.strictEqual(classifyFix(at(0, 10, 30_000), NOW), 'approximate');
    assert.strictEqual(classifyFix(at(0, 10, 10 * 60_000), NOW), 'rejected');
  });
  test('mocked, invalid and null-island fixes are rejected', () => {
    assert.strictEqual(classifyFix(at(0, 5, 0, { isMocked: true }), NOW), 'rejected');
    assert.strictEqual(classifyFix(at(0, 5, 0, { isMocked: true }), NOW, { allowMock: true }), 'verified');
    assert.strictEqual(classifyFix({ lat: NaN, lng: 1, accuracy: 5, timestamp: NOW }, NOW), 'rejected');
    assert.strictEqual(classifyFix({ lat: 0, lng: 0, accuracy: 5, timestamp: NOW }, NOW), 'rejected');
    assert.strictEqual(classifyFix(at(0, -1), NOW), 'rejected');
    assert.strictEqual(classifyFix(null, NOW), 'rejected');
  });
  test('approximate permission fixes are never better than approximate', () => {
    assert.strictEqual(classifyFix(at(0, 5), NOW, { precision: 'approximate' }), 'approximate');
    assert.strictEqual(classifyFix(at(0, 2000), NOW, { precision: 'approximate' }), 'approximate');
    assert.strictEqual(classifyFix(at(0, 5000), NOW, { precision: 'approximate' }), 'rejected');
  });
});

describe('jump detection', () => {
  test('small movement within combined accuracy is not a jump', () => {
    assert.strictEqual(isLocationJump(at(0, 15), at(0.0003, 15, -1000)), false); // ~33 m
  });
  test('hundreds of metres in one second with tight radii is a jump', () => {
    assert.strictEqual(isLocationJump(at(0, 10), at(0.004, 10, -1000)), true); // ~445 m in 1 s
  });
  test('large displacement explained by large radii is not a jump', () => {
    assert.strictEqual(isLocationJump(at(0, 200), at(0.004, 200, -1000)), false);
  });
  test('large displacement over enough time (driving) is not a jump', () => {
    assert.strictEqual(isLocationJump(at(0, 10, 60_000), at(0.004, 10)), false); // 445 m in 60 s
  });
});

describe('pickBestConsistentSample', () => {
  test('ignores a lone outlier even when its reported radius is best', () => {
    const samples = [at(0, 25, 3000), at(0.0001, 22, 2000), at(0.005, 4, 1000)];
    const best = pickBestConsistentSample(samples)!;
    assert.strictEqual(best.accuracy, 22);
  });
  test('single sample and empty list', () => {
    assert.strictEqual(pickBestConsistentSample([at(0, 30)])!.accuracy, 30);
    assert.strictEqual(pickBestConsistentSample([]), null);
  });
});

describe('canSettleImmediately', () => {
  test('first sample at target settles', () => {
    assert.strictEqual(canSettleImmediately(at(0, 10), null, 20), true);
  });
  test('sample worse than target does not settle', () => {
    assert.strictEqual(canSettleImmediately(at(0, 25), null, 20), false);
  });
  test('accurate sample that jumped from the previous one waits for corroboration', () => {
    assert.strictEqual(canSettleImmediately(at(0.004, 8), at(0, 30, 1000), 20), false);
  });
});

describe('pinShiftMeters', () => {
  test('rounded distance or null', () => {
    const d = pinShiftMeters({ lat: 10, lng: 20 }, { lat: 10.001, lng: 20 });
    assert.ok(d !== null && d > 100 && d < 120);
    assert.strictEqual(pinShiftMeters(null, { lat: 1, lng: 1 }), null);
  });
});
