import type { FilterState, SearchSortOption, SearchWorkersParams } from '../types/search.types';
import type { WorkerNearby } from '../types/worker.types';

/**
 * Pure worker-search filter logic shared by the filter sheet, useSearch and the Explore chips.
 * No React / network here, so it is unit-tested directly.
 */

/** Price slider bounds (PKR). The ends mean "no limit": they are never sent to the API. */
export const PRICE_MIN = 100;
export const PRICE_MAX = 15_000;
export const PRICE_STEP = 100;
export const DEFAULT_RADIUS = 10_000;

/** Slider position → filter values (an end of the slider clears that bound). */
export function priceRangeToFilter([lo, hi]: [number, number]): Pick<FilterState, 'minRate' | 'maxRate'> {
  const min = Math.max(PRICE_MIN, Math.min(lo, hi));
  const max = Math.min(PRICE_MAX, Math.max(lo, hi));
  return {
    minRate: min <= PRICE_MIN ? 0 : min,
    maxRate: max >= PRICE_MAX ? 0 : max,
  };
}

/** Filter values → slider position (0 = unbounded = slider end). */
export function filterToPriceRange(f: Pick<FilterState, 'minRate' | 'maxRate'>): [number, number] {
  const lo = f.minRate > 0 ? Math.min(Math.max(f.minRate, PRICE_MIN), PRICE_MAX) : PRICE_MIN;
  const hi = f.maxRate > 0 ? Math.min(Math.max(f.maxRate, PRICE_MIN), PRICE_MAX) : PRICE_MAX;
  return [Math.min(lo, hi), Math.max(lo, hi)];
}

export const formatRs = (n: number) => `Rs ${Math.round(n).toLocaleString('en-US')}`;

/** "Rs 500 – Rs 5,000", "From Rs 500", "Up to Rs 5,000", or null when unbounded. */
export function describePriceRange(f: Pick<FilterState, 'minRate' | 'maxRate'>): string | null {
  if (f.minRate > 0 && f.maxRate > 0) return `${formatRs(f.minRate)} – ${formatRs(f.maxRate)}`;
  if (f.minRate > 0) return `From ${formatRs(f.minRate)}`;
  if (f.maxRate > 0) return `Up to ${formatRs(f.maxRate)}`;
  return null;
}

export const SORT_LABELS: Record<SearchSortOption, string> = {
  relevance: 'Recommended',
  distance: 'Nearest first',
  rating: 'Highest rated',
  price_low: 'Lowest price',
  price_high: 'Highest price',
};

export const formatDistance = (meters: number) => `${Math.round(meters / 1000)} km`;

/** Each filter group counts once (price is one filter however many bounds are set). */
export function countActiveFilters(f: FilterState, defaults: FilterState): number {
  let n = 0;
  const hasCategory = (x: FilterState) => Boolean(x.categoryId) || x.categories.length > 0;
  if (hasCategory(f) && (f.categoryId !== defaults.categoryId || f.categories.join() !== defaults.categories.join())) n++;
  if (f.minRating > 0) n++;
  if (f.minRate > 0 || f.maxRate > 0) n++;
  if (f.sortBy !== 'relevance') n++;
  if (f.available !== 'any') n++;
  if (f.provider_type && f.provider_type !== 'ALL' && f.provider_type !== 'ANY') n++;
  if ((f.radius ?? DEFAULT_RADIUS) !== (defaults.radius ?? DEFAULT_RADIUS)) n++;
  return n;
}

/** Stable comparison used to enable/disable Reset. */
export function filtersEqual(a: FilterState, b: FilterState): boolean {
  return (
    a.sortBy === b.sortBy &&
    (a.provider_type ?? 'ALL') === (b.provider_type ?? 'ALL') &&
    (a.categoryId ?? '') === (b.categoryId ?? '') &&
    a.categories.join('|') === b.categories.join('|') &&
    a.minRating === b.minRating &&
    a.available === b.available &&
    (a.radius ?? DEFAULT_RADIUS) === (b.radius ?? DEFAULT_RADIUS) &&
    a.minRate === b.minRate &&
    a.maxRate === b.maxRate
  );
}

/**
 * Applied filters + query → `GET /search/workers` params (search-service v1.2.0 contract).
 * - Unbounded price ends are omitted, never sent as 100 / 15,000.
 * - Geo trio is all-or-nothing; without a position, "Nearest first" falls back to relevance
 *   (the backend rejects sort=distance without geo).
 * - Availability has no backend parameter: it is applied by `applyClientSideFilters`.
 */
export function buildWorkerSearchParams(
  query: string,
  f: FilterState,
  coords: { lat: number; lng: number } | null,
  pageSize = 20
): Omit<SearchWorkersParams, 'page'> {
  const params: Omit<SearchWorkersParams, 'page'> = { limit: pageSize };
  const q = query.trim();
  if (q) params.q = q;

  if (f.categoryId) params.category_id = f.categoryId;
  else if (f.categories.length > 0) params.category = f.categories[0];

  if (f.minRate > 0) params.min_price = f.minRate;
  if (f.maxRate > 0) params.max_price = f.maxRate;
  if (params.min_price !== undefined && params.max_price !== undefined && params.min_price > params.max_price) {
    [params.min_price, params.max_price] = [params.max_price, params.min_price];
  }

  if (f.minRating > 0) params.min_rating = f.minRating;

  const hasGeo = Boolean(coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng));
  params.sort = f.sortBy === 'distance' && !hasGeo ? 'relevance' : f.sortBy;

  if (f.provider_type === 'INDIVIDUAL' || f.provider_type === 'COMPANY') params.provider_type = f.provider_type;

  if (hasGeo) {
    params.lat = coords!.lat;
    params.lng = coords!.lng;
    params.radius = f.radius || DEFAULT_RADIUS;
  }
  return params;
}

/**
 * Filters the backend cannot apply. "Available now" = not currently on a job (`is_busy`);
 * every search result is already an active, bookable worker.
 */
export function applyClientSideFilters(workers: WorkerNearby[], f: FilterState): WorkerNearby[] {
  if (f.available === 'now') return workers.filter((w) => !w.isBusy);
  return workers;
}

export const hasClientSideFilters = (f: FilterState) => f.available === 'now';
