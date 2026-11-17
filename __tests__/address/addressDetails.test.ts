import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  composeAddressLine,
  deriveLocationSource,
  mapServerAddress,
  toAddressRequestBody,
  detailsFromAddress,
  cleanDetails,
  EMPTY_ADDRESS_DETAILS,
} from '../../src/utils/addressDetails.ts';
import { reconcileActiveAddress, toBookingAddress, resolveBookingLocation } from '../../src/utils/activeAddress.ts';

const ID = '11111111-1111-4111-8111-111111111111';

describe('composeAddressLine', () => {
  test('customer parts first, geocoder line after, no repeats', () => {
    const line = composeAddressLine(
      { house_unit: 'House 123', street: 'Street 5', block_phase: 'Block A', area: 'Madina Town' },
      'Madina Town, Faisalabad'
    );
    assert.strictEqual(line, 'House 123, Street 5, Block A, Madina Town, Faisalabad');
  });
  test('only geocoder text when the customer adds nothing', () => {
    assert.strictEqual(composeAddressLine(EMPTY_ADDRESS_DETAILS, 'Satiana Road, Faisalabad'), 'Satiana Road, Faisalabad');
  });
  test('works with no geocoder text at all (offline)', () => {
    assert.strictEqual(composeAddressLine({ house_unit: 'Shop 12', street: 'Commercial Market' }, ''), 'Shop 12, Commercial Market');
  });
  test('landmark and directions are never part of the address line', () => {
    const line = composeAddressLine({ ...EMPTY_ADDRESS_DETAILS, landmark: 'Near Allied Hospital', instructions: 'Blue gate' }, 'Area X');
    assert.strictEqual(line, 'Area X');
  });
});

describe('deriveLocationSource', () => {
  test('gps / search unmoved vs adjusted, manual pan', () => {
    assert.strictEqual(deriveLocationSource('gps', 4), 'gps_confirmed');
    assert.strictEqual(deriveLocationSource('gps', 60), 'pin_adjusted');
    assert.strictEqual(deriveLocationSource('search', 0), 'search');
    assert.strictEqual(deriveLocationSource('search', 40), 'pin_adjusted');
    assert.strictEqual(deriveLocationSource('map', null), 'manual');
  });
});

describe('mapServerAddress', () => {
  test('coerces string coordinates and keeps details + directions (LOC-004)', () => {
    const a = mapServerAddress({
      id: ID, label: 'Home', address_line: 'L', city: 'C', lat: '31.4', lng: '73.0', is_default: 1,
      house_unit: 'House 1', instructions: 'Blue gate', location_source: 'pin_adjusted', gps_accuracy_m: '12.5',
    })!;
    assert.strictEqual(a.lat, 31.4);
    assert.strictEqual(a.house_unit, 'House 1');
    assert.strictEqual(a.instructions, 'Blue gate');
    assert.strictEqual(a.notes, 'Blue gate');
    assert.strictEqual(a.gps_accuracy_m, 12.5);
    assert.strictEqual(a.is_default, true);
  });
  test('drops rows without an id or usable coordinates (never fabricates)', () => {
    assert.strictEqual(mapServerAddress({ label: 'x', lat: 31, lng: 73 }), null);
    assert.strictEqual(mapServerAddress({ id: ID, lat: 'abc', lng: 73 }), null);
    assert.strictEqual(mapServerAddress({ id: ID, lat: 0, lng: 0 }), null);
    assert.strictEqual(mapServerAddress(null), null);
  });
});

describe('toAddressRequestBody', () => {
  test('sends directions and details (old mutation dropped them) and maps notes alias', () => {
    const body = toAddressRequestBody({
      label: 'Home', address_line: 'L', lat: 31.4, lng: 73.0, notes: 'Flat 3B, blue gate', house_unit: 'Flat 3B', pin_shift_m: 12.7,
    });
    assert.strictEqual(body.instructions, 'Flat 3B, blue gate');
    assert.strictEqual(body.house_unit, 'Flat 3B');
    assert.strictEqual(body.pin_shift_m, 13);
    assert.ok(!('custom_label' in body));
    assert.ok(!('notes' in body));
  });
  test('undefined fields are not sent (PATCH stays partial)', () => {
    assert.deepStrictEqual(toAddressRequestBody({ instructions: 'x' }), { instructions: 'x' });
  });
});

describe('detailsFromAddress / cleanDetails', () => {
  test('round-trip for the edit form; blanks removed and limits applied', () => {
    const d = detailsFromAddress({ house_unit: 'H1', notes: 'old note' });
    assert.strictEqual(d.instructions, 'old note');
    const c = cleanDetails({ ...EMPTY_ADDRESS_DETAILS, street: '  Street   5 ', landmark: '  ', house_unit: 'x'.repeat(80) });
    assert.strictEqual(c.street, 'Street 5');
    assert.strictEqual(c.landmark, undefined);
    assert.strictEqual(c.house_unit!.length, 50);
  });
});

describe('reconcileActiveAddress (LOC-006/017)', () => {
  const saved = mapServerAddress({ id: ID, label: 'Home', address_line: 'New text', lat: 31.5, lng: 73.1 })!;
  test('deleted elsewhere → clear; still there → refresh with server copy; none → keep', () => {
    assert.deepStrictEqual(reconcileActiveAddress([], ID), { action: 'clear' });
    const r = reconcileActiveAddress([saved], ID);
    assert.strictEqual(r.action, 'refresh');
    assert.strictEqual(r.action === 'refresh' && r.address.address_line, 'New text');
    assert.deepStrictEqual(reconcileActiveAddress([saved], null), { action: 'keep' });
  });
  test('booking copy carries the saved coordinates and directions', () => {
    const b = toBookingAddress({ ...saved, instructions: 'Blue gate', house_unit: 'H1' });
    assert.strictEqual(b.latitude, 31.5);
    assert.strictEqual(b.instructions, 'Blue gate');
    assert.strictEqual(b.unit, 'H1');
  });
});

describe('resolveBookingLocation (LOC-007/016)', () => {
  test('uses the saved id with ITS coordinates', () => {
    assert.deepStrictEqual(resolveBookingLocation(ID, { id: ID, latitude: 31.4, longitude: 73.0 }), {
      ok: true, addressId: ID, lat: 31.4, lng: 73.0,
    });
  });
  test('never pairs a saved id with GPS: missing coordinates is an error, not a fallback', () => {
    assert.deepStrictEqual(resolveBookingLocation(ID, null), { ok: false, reason: 'NO_COORDINATES' });
  });
  test('placeholder / local ids and empty drafts are rejected', () => {
    assert.deepStrictEqual(resolveBookingLocation('addr-1700000000000', { id: 'addr-1700000000000', latitude: 31, longitude: 73 }), {
      ok: false, reason: 'UNSAVED_ADDRESS',
    });
    assert.deepStrictEqual(resolveBookingLocation(null, null), { ok: false, reason: 'NO_ADDRESS' });
    assert.deepStrictEqual(resolveBookingLocation(ID, { id: ID, latitude: 0, longitude: 0 }), { ok: false, reason: 'NO_COORDINATES' });
  });
});
