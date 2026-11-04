import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseGoogleReverseGeocode } from '../../src/utils/geocodeParse.ts';

const comp = (long_name: string, ...types: string[]) => ({ long_name, short_name: long_name, types });

describe('parseGoogleReverseGeocode', () => {
  test('keeps area text, drops trailing country, reads locality', () => {
    const r = parseGoogleReverseGeocode(
      {
        status: 'OK',
        results: [
          {
            formatted_address: 'House 5, Street 3, Peoples Colony, Faisalabad, Pakistan',
            types: ['street_address'],
            address_components: [comp('Faisalabad', 'locality'), comp('Pakistan', 'country')],
          },
        ],
      },
      31.41,
      73.08
    );
    assert.ok(r);
    assert.strictEqual(r.address_line, 'House 5, Street 3, Peoples Colony, Faisalabad');
    assert.strictEqual(r.city, 'Faisalabad');
    assert.strictEqual(r.lat, 31.41);
  });

  test('skips plus-code-only results and uses the next readable one', () => {
    const r = parseGoogleReverseGeocode(
      {
        status: 'OK',
        results: [
          { formatted_address: 'VQ2R+8H Faisalabad, Pakistan', types: ['plus_code'], address_components: [] },
          { formatted_address: 'Jaranwala Road, Faisalabad, Pakistan', types: ['route'], address_components: [comp('Faisalabad', 'locality'), comp('Pakistan', 'country')] },
        ],
      },
      31.4,
      73.1
    );
    assert.strictEqual(r?.address_line, 'Jaranwala Road, Faisalabad');
  });

  test('does not invent a city when none is present', () => {
    const r = parseGoogleReverseGeocode(
      { status: 'OK', results: [{ formatted_address: 'Some Road, Pakistan', types: ['route'], address_components: [comp('Pakistan', 'country')] }] },
      31,
      73
    );
    assert.strictEqual(r?.city, '');
  });

  test('returns null for ZERO_RESULTS / malformed bodies', () => {
    assert.strictEqual(parseGoogleReverseGeocode({ status: 'ZERO_RESULTS', results: [] }, 1, 1), null);
    assert.strictEqual(parseGoogleReverseGeocode(null, 1, 1), null);
  });
});
