import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parsePlaceComponents, dedupePredictions } from '../../src/utils/placeParse.ts';

/** Synthetic component lists in Google's specific → general order. */
const newShape = [
  { longText: '12', types: ['street_number'] },
  { longText: 'Road A', types: ['route'] },
  { longText: 'Area X', types: ['sublocality_level_1', 'sublocality', 'political'] },
  { longText: 'Town T', types: ['locality', 'political'] },
  { longText: 'District D', types: ['administrative_area_level_2', 'political'] },
  { longText: 'Land', types: ['country', 'political'] },
];

describe('parsePlaceComponents', () => {
  test('city is the locality even though the district is listed after it (LOC-026)', () => {
    const c = parsePlaceComponents(newShape);
    assert.strictEqual(c.city, 'Town T');
    assert.strictEqual(c.area, 'Area X');
    assert.strictEqual(c.streetNumber, '12');
    assert.strictEqual(c.route, 'Road A');
    assert.strictEqual(c.country, 'Land');
    assert.strictEqual(c.postalCode, '');
  });
  test('falls back to tehsil, then district, when there is no locality', () => {
    const noLocality = newShape.filter((x) => !x.types.includes('locality'));
    assert.strictEqual(parsePlaceComponents(noLocality).city, 'District D');
    const withTehsil = [...noLocality, { longText: 'Tehsil H', types: ['administrative_area_level_3'] }];
    assert.strictEqual(parsePlaceComponents(withTehsil).city, 'Tehsil H');
  });
  test('legacy long_name shape and garbage input', () => {
    assert.strictEqual(parsePlaceComponents([{ long_name: 'Town T', types: ['locality'] }]).city, 'Town T');
    assert.deepStrictEqual(parsePlaceComponents(null).city, '');
  });
});

describe('dedupePredictions', () => {
  test('drops duplicate ids and case-insensitive duplicate texts, keeps order, caps', () => {
    const out = dedupePredictions(
      [
        { place_id: 'a', description: 'Madina Town, Faisalabad' },
        { place_id: 'a', description: 'Other' },
        { place_id: 'b', description: 'madina town, faisalabad' },
        { place_id: 'c', description: 'C' },
        { place_id: '', description: 'no id' },
        { place_id: 'd', description: 'D' },
      ],
      2
    );
    assert.deepStrictEqual(out.map((p) => p.place_id), ['a', 'c']);
  });
});
