import { test, describe } from 'node:test';
import assert from 'node:assert';
import { roundCoordForQuery } from '../../src/utils/locationUtils.ts';

describe('roundCoordForQuery', () => {
  test('collapses sub-100m GPS jitter into the same query coordinate', () => {
    assert.strictEqual(roundCoordForQuery(31.41871), roundCoordForQuery(31.41903));
    assert.strictEqual(roundCoordForQuery(73.07912), roundCoordForQuery(73.07941));
  });

  test('still distinguishes genuinely different positions (>~150m apart)', () => {
    assert.notStrictEqual(roundCoordForQuery(31.4187), roundCoordForQuery(31.4207));
  });

  test('rounds to 3 decimals', () => {
    assert.strictEqual(roundCoordForQuery(31.41876), 31.419);
    assert.strictEqual(roundCoordForQuery(-0.0004), -0);
  });
});
