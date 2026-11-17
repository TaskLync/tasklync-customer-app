import { test, describe } from 'node:test';
import assert from 'node:assert';
import { DEFAULT_FILTERS, type FilterState } from '../../src/types/search.types.ts';
import {
  PRICE_MAX,
  PRICE_MIN,
  applyClientSideFilters,
  buildWorkerSearchParams,
  countActiveFilters,
  describePriceRange,
  filterToPriceRange,
  filtersEqual,
  priceRangeToFilter,
} from '../../src/utils/searchFilters.ts';

const F = (patch: Partial<FilterState> = {}): FilterState => ({ ...DEFAULT_FILTERS, categories: [], ...patch });
const HERE = { lat: 31.418, lng: 73.079 };

describe('buildWorkerSearchParams: each filter alone', () => {
  test('defaults send only the query, relevance sort and the geo trio', () => {
    const p = buildWorkerSearchParams('plumber', F(), HERE);
    assert.deepStrictEqual(p, { limit: 20, q: 'plumber', sort: 'relevance', lat: HERE.lat, lng: HERE.lng, radius: 10000 });
  });

  test('provider type', () => {
    assert.strictEqual(buildWorkerSearchParams('', F({ provider_type: 'INDIVIDUAL' }), HERE).provider_type, 'INDIVIDUAL');
    assert.strictEqual(buildWorkerSearchParams('', F({ provider_type: 'COMPANY' }), HERE).provider_type, 'COMPANY');
    assert.strictEqual(buildWorkerSearchParams('', F({ provider_type: 'ALL' }), HERE).provider_type, undefined);
  });

  test('category id wins over a free-text label', () => {
    const p = buildWorkerSearchParams('', F({ categoryId: 'electrician', categories: ['Electrician'] }), HERE);
    assert.strictEqual(p.category_id, 'electrician');
    assert.strictEqual(p.category, undefined);
  });

  test('minimum rating', () => {
    assert.strictEqual(buildWorkerSearchParams('', F({ minRating: 4 }), HERE).min_rating, 4);
    assert.strictEqual(buildWorkerSearchParams('', F({ minRating: 0 }), HERE).min_rating, undefined);
  });

  test('distance sets the radius', () => {
    assert.strictEqual(buildWorkerSearchParams('', F({ radius: 25000 }), HERE).radius, 25000);
  });

  test('price bounds; open ends are not sent', () => {
    const p = buildWorkerSearchParams('', F({ minRate: 500, maxRate: 5000 }), HERE);
    assert.strictEqual(p.min_price, 500);
    assert.strictEqual(p.max_price, 5000);
    const open = buildWorkerSearchParams('', F(), HERE);
    assert.strictEqual(open.min_price, undefined);
    assert.strictEqual(open.max_price, undefined);
  });

  test('every sort option is passed through', () => {
    for (const s of ['relevance', 'rating', 'price_low', 'price_high', 'distance'] as const) {
      assert.strictEqual(buildWorkerSearchParams('', F({ sortBy: s }), HERE).sort, s);
    }
  });

  test('availability is never sent (the API has no such parameter)', () => {
    const p = buildWorkerSearchParams('', F({ available: 'now' }), HERE) as Record<string, unknown>;
    assert.strictEqual(p.available, undefined);
  });

  test('no city parameter exists any more', () => {
    const p = buildWorkerSearchParams('', F(), HERE) as Record<string, unknown>;
    assert.strictEqual(p.city, undefined);
  });
});

describe('buildWorkerSearchParams: without a position', () => {
  test('geo trio is omitted entirely and distance sort falls back to relevance', () => {
    const p = buildWorkerSearchParams('', F({ sortBy: 'distance', radius: 5000 }), null);
    assert.strictEqual(p.lat, undefined);
    assert.strictEqual(p.lng, undefined);
    assert.strictEqual(p.radius, undefined);
    assert.strictEqual(p.sort, 'relevance');
  });
});

describe('buildWorkerSearchParams: combined filters + query', () => {
  test('the documented example keeps the text query separate from structured filters', () => {
    const f = F({
      provider_type: 'INDIVIDUAL',
      categoryId: 'electrician',
      categoryLabel: 'Electrician',
      categories: ['Electrician'],
      minRating: 4,
      available: 'now',
      radius: 10000,
      minRate: 500,
      maxRate: 5000,
    });
    const p = buildWorkerSearchParams('  wiring  ', f, HERE);
    assert.deepStrictEqual(p, {
      limit: 20,
      q: 'wiring',
      category_id: 'electrician',
      min_price: 500,
      max_price: 5000,
      min_rating: 4,
      sort: 'relevance',
      provider_type: 'INDIVIDUAL',
      lat: HERE.lat,
      lng: HERE.lng,
      radius: 10000,
    });
  });

  test('an inverted price range is swapped, never sent invalid', () => {
    const p = buildWorkerSearchParams('', F({ minRate: 9000, maxRate: 2000 }), HERE);
    assert.strictEqual(p.min_price, 2000);
    assert.strictEqual(p.max_price, 9000);
  });
});

describe('price slider mapping', () => {
  test('slider ends mean "no limit"', () => {
    assert.deepStrictEqual(priceRangeToFilter([PRICE_MIN, PRICE_MAX]), { minRate: 0, maxRate: 0 });
    assert.deepStrictEqual(priceRangeToFilter([500, PRICE_MAX]), { minRate: 500, maxRate: 0 });
    assert.deepStrictEqual(priceRangeToFilter([PRICE_MIN, 5000]), { minRate: 0, maxRate: 5000 });
  });

  test('round-trips filter ↔ slider', () => {
    assert.deepStrictEqual(filterToPriceRange({ minRate: 0, maxRate: 0 }), [PRICE_MIN, PRICE_MAX]);
    assert.deepStrictEqual(filterToPriceRange({ minRate: 500, maxRate: 5000 }), [500, 5000]);
    assert.deepStrictEqual(priceRangeToFilter(filterToPriceRange({ minRate: 500, maxRate: 5000 })), { minRate: 500, maxRate: 5000 });
  });

  test('labels', () => {
    assert.strictEqual(describePriceRange({ minRate: 0, maxRate: 0 }), null);
    assert.strictEqual(describePriceRange({ minRate: 500, maxRate: 5000 }), 'Rs 500 – Rs 5,000');
    assert.strictEqual(describePriceRange({ minRate: 500, maxRate: 0 }), 'From Rs 500');
    assert.strictEqual(describePriceRange({ minRate: 0, maxRate: 5000 }), 'Up to Rs 5,000');
  });
});

describe('active filter count and reset', () => {
  test('defaults count zero; price counts once', () => {
    assert.strictEqual(countActiveFilters(F(), DEFAULT_FILTERS), 0);
    assert.strictEqual(countActiveFilters(F({ minRate: 500, maxRate: 5000 }), DEFAULT_FILTERS), 1);
  });

  test('every filter group counts', () => {
    const f = F({
      provider_type: 'COMPANY',
      categoryId: 'ac-repair',
      categories: ['AC Repair'],
      minRating: 3,
      available: 'now',
      radius: 5000,
      minRate: 200,
      sortBy: 'rating',
    });
    assert.strictEqual(countActiveFilters(f, DEFAULT_FILTERS), 7);
  });

  test('a screen-level base category is not counted as a user filter', () => {
    const base = F({ categories: ['plumber'] });
    assert.strictEqual(countActiveFilters(base, base), 0);
  });

  test('reset → defaults is equal to defaults (Reset disabled, search back to unfiltered)', () => {
    const changed = F({ minRating: 4, available: 'now' });
    assert.strictEqual(filtersEqual(changed, DEFAULT_FILTERS), false);
    assert.strictEqual(filtersEqual(F(), DEFAULT_FILTERS), true);
    assert.strictEqual(countActiveFilters(F(), DEFAULT_FILTERS), 0);
  });
});

describe('client-side availability filter', () => {
  const workers = [
    { id: 'a', isBusy: false },
    { id: 'b', isBusy: true },
    { id: 'c' },
  ] as any[];

  test('"Available now" hides workers on a job', () => {
    assert.deepStrictEqual(
      applyClientSideFilters(workers, F({ available: 'now' })).map((w) => w.id),
      ['a', 'c']
    );
  });

  test('"Any time" keeps everyone', () => {
    assert.strictEqual(applyClientSideFilters(workers, F()).length, 3);
  });
});
