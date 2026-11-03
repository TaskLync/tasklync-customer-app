import axios from 'axios';
import { apiClient } from './client';
import {
  AutocompleteSuggestion,
  PaginatedSearchResponse,
  SearchPaginationMeta,
  SearchResult,
  SearchSortOption,
  SearchSuggestion,
  SearchWorkersParams,
  TrendingTerm,
  TrendingWindow,
} from '../../types/search.types';
import { ApiResponse } from '../../types/api.types';
import {
  extractPaginationMeta,
  extractRawWorkerList,
  mapRawSearchDocument,
  mapRawWorkerNearby,
} from '../mappers/worker.mapper';

const CATEGORY_ID_REGEX = /^[A-Za-z0-9_-]{1,50}$/;
const MAX_PRICE = 10_000_000;
const MAX_RADIUS_METERS = 50_000;
const MAX_PAGE_NUMBER = 50;
const MAX_PAGE_SIZE = 20;
const VALID_SORTS: ReadonlySet<string> = new Set([
  'relevance',
  'rating',
  'price_low',
  'price_high',
  'distance',
]);

function isAbortError(error: any): boolean {
  return (
    axios.isCancel(error) ||
    error?.code === 'ERR_CANCELED' ||
    error?.name === 'CanceledError' ||
    error?.name === 'AbortError'
  );
}

/**
 * Sanitizes search parameters before sending to `GET /api/v1/search/workers`:
 * 1. Strips undefined, null, or empty strings.
 * 2. Geo Trio Rule: Ensures `lat`, `lng`, and `radius` are all present together (or all omitted).
 * 3. Distance Sort Rule: Falls back `sort` from `'distance'` to `'relevance'` if geo coordinates are incomplete.
 * 4. Price Range Rule: Clamps prices to 0..10,000,000 and ensures `min_price <= max_price`.
 * 5. Category Rule: Validates `category_id` against `^[A-Za-z0-9_-]{1,50}$`; folds free-text category names into `q`.
 * 6. Pagination Caps: Clamps `page` to 1..50 and `limit` to 1..20.
 */
export function sanitizeSearchParams(
  params: SearchWorkersParams
): Record<string, string | number> {
  const hasValidLat =
    typeof params.lat === 'number' &&
    Number.isFinite(params.lat) &&
    params.lat !== 0 &&
    params.lat >= -90 &&
    params.lat <= 90;

  const hasValidLng =
    typeof params.lng === 'number' &&
    Number.isFinite(params.lng) &&
    params.lng !== 0 &&
    params.lng >= -180 &&
    params.lng <= 180;

  const hasValidRadius =
    typeof params.radius === 'number' &&
    Number.isFinite(params.radius) &&
    params.radius > 0;

  const hasCompleteGeo = hasValidLat && hasValidLng && hasValidRadius;

  const requestedSort = params.sort ?? params.sortBy;
  const normalizedSort: SearchSortOption | undefined =
    requestedSort && VALID_SORTS.has(requestedSort)
      ? (requestedSort as SearchSortOption)
      : undefined;

  const effectiveSort: SearchSortOption | undefined =
    normalizedSort === 'distance' && !hasCompleteGeo ? 'relevance' : normalizedSort;

  const clean: Record<string, string | number> = {};

  let textQuery = params.q?.trim() || '';

  // Resolve category_id vs free-text category label
  const rawCategory = (params.category_id ?? params.category)?.trim();
  if (rawCategory) {
    const firstToken = rawCategory.split(',')[0]?.trim() || '';
    if (firstToken && CATEGORY_ID_REGEX.test(firstToken)) {
      clean.category_id = firstToken;
    } else if (firstToken && !textQuery) {
      // Free-text category name with spaces (e.g. "AC Repair") -> fold into full-text search `q`
      textQuery = firstToken;
    }
  }

  if (textQuery) {
    clean.q = textQuery.slice(0, 100);
  }

  if (params.city?.trim()) {
    clean.city = params.city.trim().slice(0, 100);
  }

  // Price range normalization (0..10,000,000, min_price <= max_price)
  const rawMinPrice = params.min_price ?? params.minRate;
  const rawMaxPrice = params.max_price ?? params.maxRate;

  let minPrice =
    typeof rawMinPrice === 'number' && Number.isFinite(rawMinPrice) && rawMinPrice > 0
      ? Math.min(Math.round(rawMinPrice), MAX_PRICE)
      : undefined;

  let maxPrice =
    typeof rawMaxPrice === 'number' && Number.isFinite(rawMaxPrice) && rawMaxPrice > 0
      ? Math.min(Math.round(rawMaxPrice), MAX_PRICE)
      : undefined;

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    const temp = minPrice;
    minPrice = maxPrice;
    maxPrice = temp;
  }

  if (minPrice !== undefined) {
    clean.min_price = minPrice;
  }
  if (maxPrice !== undefined) {
    clean.max_price = maxPrice;
  }

  // Minimum rating (0..5)
  const rawMinRating = params.min_rating ?? params.minRating;
  if (
    typeof rawMinRating === 'number' &&
    Number.isFinite(rawMinRating) &&
    rawMinRating > 0 &&
    rawMinRating <= 5
  ) {
    clean.min_rating = Number(rawMinRating.toFixed(2));
  }

  if (effectiveSort) {
    clean.sort = effectiveSort;
  }

  if (
    params.provider_type === 'INDIVIDUAL' ||
    params.provider_type === 'COMPANY'
  ) {
    clean.provider_type = params.provider_type;
  }

  if (hasCompleteGeo) {
    clean.lat = params.lat!;
    clean.lng = params.lng!;
    clean.radius = Math.max(1, Math.min(Math.round(params.radius!), MAX_RADIUS_METERS));
  }

  const rawPage =
    typeof params.page === 'number' && Number.isFinite(params.page)
      ? Math.round(params.page)
      : 1;
  clean.page = Math.max(1, Math.min(rawPage, MAX_PAGE_NUMBER));

  const rawLimit =
    typeof params.limit === 'number' && Number.isFinite(params.limit)
      ? Math.round(params.limit)
      : MAX_PAGE_SIZE;
  clean.limit = Math.max(1, Math.min(rawLimit, MAX_PAGE_SIZE));

  return clean;
}

/**
 * Search Service API Client (`search-service` v1.2.0)
 * Routed via API Gateway (`/api/v1/search/*`)
 */
export const searchApi = {
  /**
   * GET /api/v1/search/workers
   * Returns normalized `SearchResult` containing both `WorkerNearby[]` and raw `WorkerSearchDocument[]`.
   */
  searchWorkers: async (
    params: SearchWorkersParams,
    signal?: AbortSignal
  ): Promise<SearchResult> => {
    const queryParams = sanitizeSearchParams(params);
    const requestedPage = Number(queryParams.page) || 1;
    const requestedLimit = Number(queryParams.limit) || MAX_PAGE_SIZE;

    try {
      const response = await apiClient.get<ApiResponse<any>>('/search/workers', {
        params: queryParams,
        ...(signal ? { signal } : {}),
      });

      const rawWorkers = extractRawWorkerList(response.data);
      const extractedMeta = extractPaginationMeta(
        response.data,
        rawWorkers.length,
        requestedPage,
        requestedLimit
      );

      const documents = rawWorkers.map(mapRawSearchDocument);
      const transformedWorkers = rawWorkers.map(mapRawWorkerNearby);

      const meta: SearchPaginationMeta = {
        page: extractedMeta.page,
        limit: extractedMeta.limit,
        total: extractedMeta.total,
        total_pages: extractedMeta.totalPages,
        has_next: extractedMeta.hasMore,
      };

      return {
        workers: transformedWorkers,
        documents,
        total: meta.total,
        page: meta.page,
        limit: meta.limit,
        totalPages: meta.total_pages,
        hasMore: meta.has_next,
        meta,
      };
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      console.warn('[searchApi.searchWorkers] API error:', error);
      const emptyMeta: SearchPaginationMeta = {
        page: requestedPage,
        limit: requestedLimit,
        total: 0,
        total_pages: 0,
        has_next: false,
      };
      return {
        workers: [],
        documents: [],
        total: 0,
        page: requestedPage,
        limit: requestedLimit,
        totalPages: 0,
        hasMore: false,
        meta: emptyMeta,
      };
    }
  },

  /**
   * GET /api/v1/search/workers (Strict Specification Envelope)
   * Returns `{ success: true, data: WorkerSearchDocument[], meta: SearchPaginationMeta }`.
   */
  searchWorkersRaw: async (
    params: SearchWorkersParams,
    signal?: AbortSignal
  ): Promise<PaginatedSearchResponse> => {
    const res = await searchApi.searchWorkers(params, signal);
    return {
      success: true,
      data: res.documents,
      meta: res.meta,
    };
  },

  /**
   * GET /api/v1/search/autocomplete
   * Prefix autocomplete for categories (English & Urdu) and verified worker/business names.
   * Requires `q.trim().length >= 2`.
   */
  getAutocomplete: async (
    q: string,
    limit: number = 8,
    signal?: AbortSignal
  ): Promise<AutocompleteSuggestion[]> => {
    const trimmed = (q || '').trim();
    if (trimmed.length < 2) return [];

    try {
      const response = await apiClient.get<{
        success: boolean;
        data: any[];
      }>('/search/autocomplete', {
        params: {
          q: trimmed.slice(0, 50),
          limit: Math.max(1, Math.min(Math.round(limit), 15)),
        },
        ...(signal ? { signal } : {}),
      });

      const rawList = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? (response.data as any[])
        : [];

      return rawList
        .map((item: any): AutocompleteSuggestion | null => {
          if (!item) return null;
          const label = String(item.label || item.title || item.name || item.text || '').trim();
          if (!label) return null;

          const type: 'category' | 'worker' =
            item.type === 'worker' ? 'worker' : 'category';

          const suggestion: AutocompleteSuggestion = {
            type,
            label,
          };

          if (typeof item.label_ur === 'string' && item.label_ur.trim()) {
            suggestion.label_ur = item.label_ur.trim();
          }
          if (typeof item.category_id === 'string' && item.category_id.trim()) {
            suggestion.category_id = item.category_id.trim();
          } else if (type === 'category' && typeof item.id === 'string' && item.id.trim()) {
            suggestion.category_id = item.id.trim();
          }
          if (typeof item.worker_id === 'string' && item.worker_id.trim()) {
            suggestion.worker_id = item.worker_id.trim();
          } else if (type === 'worker' && typeof item.id === 'string' && item.id.trim()) {
            suggestion.worker_id = item.id.trim();
          }

          return suggestion;
        })
        .filter((s): s is AutocompleteSuggestion => s !== null);
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      console.warn('[searchApi.getAutocomplete] API failed:', error);
      return [];
    }
  },

  /**
   * Legacy alias for `getAutocomplete` returning `SearchSuggestion[]`.
   */
  getSuggestions: async (
    query: string,
    _lat?: number,
    _lng?: number,
    signal?: AbortSignal
  ): Promise<SearchSuggestion[]> => {
    const items = await searchApi.getAutocomplete(query, 8, signal);
    return items.map((item, idx) => ({
      id: item.category_id || item.worker_id || `${item.type}-${idx}`,
      type: item.type,
      label: item.label,
      ...(item.label_ur ? { label_ur: item.label_ur, subLabel: item.label_ur } : {}),
      ...(item.category_id ? { category_id: item.category_id } : {}),
      ...(item.worker_id ? { worker_id: item.worker_id } : {}),
    }));
  },

  /**
   * GET /api/v1/search/trending
   * Top trending normalized search terms over the requested window (`'24h'` | `'7d'`).
   */
  getTrending: async (
    window: TrendingWindow = '24h',
    limit: number = 10,
    signal?: AbortSignal
  ): Promise<TrendingTerm[]> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: any[];
      }>('/search/trending', {
        params: {
          window: window === '7d' ? '7d' : '24h',
          limit: Math.max(1, Math.min(Math.round(limit), 20)),
        },
        ...(signal ? { signal } : {}),
      });

      const rawList = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? (response.data as any[])
        : [];

      const parsed = rawList
        .map((item: any): TrendingTerm | null => {
          if (typeof item === 'string' && item.trim()) {
            return { term: item.trim(), search_count: 0 };
          }
          if (item && typeof item === 'object' && typeof item.term === 'string' && item.term.trim()) {
            return {
              term: item.term.trim(),
              search_count:
                typeof item.search_count === 'number' && Number.isFinite(item.search_count)
                  ? item.search_count
                  : 0,
            };
          }
          return null;
        })
        .filter((t): t is TrendingTerm => t !== null);

      return parsed;
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      return [];
    }
  },

  /**
   * Legacy alias returning trending search strings.
   */
  getPopularSearches: async (
    _lat?: number,
    _lng?: number,
    signal?: AbortSignal
  ): Promise<string[]> => {
    const terms = await searchApi.getTrending('24h', 8, signal);
    return terms.map((t) => t.term);
  },
};
