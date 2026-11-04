import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  googleCandidates,
  nominatimCandidates,
  selectBestAddress,
  haversineM,
} from '../../src/utils/addressSelect.ts';

/**
 * These are LOGIC tests of normalisation + selection using provider-shaped inputs with neutral
 * placeholder values. They do not claim anything about real-world geocoding accuracy — that is
 * covered by scripts/live-geocode-check.js against the real providers.
 */
const LAT = 10;
const LNG = 20;
const comp = (long_name: string, ...types: string[]) => ({ long_name, short_name: long_name, types });
const near = (dLat = 0) => ({ lat: LAT + dLat, lng: LNG });

describe('addressSelect', () => {
  test('named place within range outranks a street result', () => {
    const google = {
      status: 'OK',
      results: [
        {
          types: ['route'],
          formatted_address: 'Road A, Town T',
          geometry: { location: near(0.0002) },
          address_components: [comp('Road A', 'route'), comp('Town T', 'locality'), comp('Land', 'country')],
        },
      ],
    };
    const osm = {
      lat: String(LAT),
      lon: String(LNG),
      name: 'Alpha Clinic',
      addresstype: 'amenity',
      address: { amenity: 'Alpha Clinic', road: 'Road A', suburb: 'Block 1', city: 'Town T', country: 'Land' },
    };
    const best = selectBestAddress(
      [...googleCandidates(google, LAT, LNG), ...nominatimCandidates(osm, LAT, LNG)],
      LAT,
      LNG
    );
    assert.ok(best);
    assert.strictEqual(best.source, 'osm');
    assert.strictEqual(best.tier, 'place');
    assert.strictEqual(best.result.address_line, 'Alpha Clinic, Road A, Block 1, Town T');
  });

  test('house + street beats bare street; coordinates stay the requested ones', () => {
    const google = {
      status: 'OK',
      results: [
        {
          types: ['street_address'],
          formatted_address: '12 Road A, Town T',
          geometry: { location: near(0.00003) },
          address_components: [comp('12', 'street_number'), comp('Road A', 'route'), comp('Town T', 'locality')],
        },
      ],
    };
    const best = selectBestAddress(googleCandidates(google, LAT, LNG), LAT, LNG);
    assert.ok(best);
    assert.strictEqual(best.tier, 'house');
    assert.strictEqual(best.result.address_line, '12 Road A, Town T');
    assert.strictEqual(best.result.lat, LAT);
    assert.strictEqual(best.result.lng, LNG);
  });

  test('a named place far from the point is demoted to the street, not shown as the place', () => {
    const osm = {
      lat: String(LAT + 0.01), // ~1.1 km away
      lon: String(LNG),
      name: 'Far Mall',
      addresstype: 'shop',
      address: { shop: 'Far Mall', road: 'Road A', city: 'Town T' },
    };
    const best = selectBestAddress(nominatimCandidates(osm, LAT, LNG), LAT, LNG);
    assert.ok(best);
    assert.ok(!best.result.address_line.includes('Far Mall'));
  });

  test('plus-code-only Google results are ignored; with nothing else the answer is null', () => {
    const google = {
      status: 'OK',
      results: [{ types: ['plus_code'], formatted_address: '8FVC9G8F+6X', geometry: { location: near() }, address_components: [] }],
    };
    assert.strictEqual(googleCandidates(google, LAT, LNG).length, 0);
    assert.strictEqual(selectBestAddress([], LAT, LNG), null);
  });

  test('a plus code is never used as a name/segment', () => {
    const google = {
      status: 'OK',
      results: [
        {
          types: ['route'],
          formatted_address: '8FVC9G8F+6X Road A, Town T',
          geometry: { location: near() },
          address_components: [comp('Road A', 'route'), comp('Town T', 'locality')],
        },
      ],
    };
    const best = selectBestAddress(googleCandidates(google, LAT, LNG), LAT, LNG);
    assert.ok(best);
    assert.ok(!/\+/.test(best.result.address_line));
  });

  test('street without building name: street + area + city only, nothing invented', () => {
    const osm = {
      lat: String(LAT),
      lon: String(LNG),
      name: 'Road A',
      addresstype: 'road',
      address: { road: 'Road A', suburb: 'Block 1', city: 'Town T', country: 'Land' },
    };
    const best = selectBestAddress(nominatimCandidates(osm, LAT, LNG), LAT, LNG);
    assert.ok(best);
    assert.strictEqual(best.tier, 'street');
    assert.strictEqual(best.result.address_line, 'Road A, Block 1, Town T');
  });

  test('incomplete data degrades to the best real component (city only)', () => {
    const osm = { lat: String(LAT), lon: String(LNG), addresstype: 'city', name: 'Town T', address: { city: 'Town T', country: 'Land' } };
    const best = selectBestAddress(nominatimCandidates(osm, LAT, LNG), LAT, LNG);
    assert.ok(best);
    assert.strictEqual(best.tier, 'city');
    assert.strictEqual(best.result.address_line, 'Town T');
  });

  test('error / empty provider bodies yield no candidates', () => {
    assert.strictEqual(nominatimCandidates({ error: 'Unable to geocode' }, LAT, LNG).length, 0);
    assert.strictEqual(nominatimCandidates(null, LAT, LNG).length, 0);
    assert.strictEqual(googleCandidates({ status: 'ZERO_RESULTS', results: [] }, LAT, LNG).length, 0);
    assert.strictEqual(googleCandidates({ status: 'REQUEST_DENIED' }, LAT, LNG).length, 0);
  });

  test('haversine sanity: ~111 km per degree of latitude', () => {
    const d = haversineM(0, 0, 1, 0);
    assert.ok(d > 110000 && d < 112500);
  });
});
