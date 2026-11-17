import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { searchApi } from '../services/api/search.api';
import {
  AutocompleteSuggestion,
  DEFAULT_FILTERS,
  FilterState,
  SearchWorkersParams,
  TrendingTerm,
  TrendingWindow,
  WorkerSearchDocument,
} from '../types/search.types';
import { WorkerNearby } from '../types/worker.types';
import { useCustomerCoords } from './useCustomerCoords';
import { roundCoordForQuery } from '../utils/locationUtils';
import {
  applyClientSideFilters,
  buildWorkerSearchParams,
  countActiveFilters,
  hasClientSideFilters,
} from '../utils/searchFilters';

/** Client-side filters (availability) thin pages out: keep loading until a screenful is visible. */
const MIN_VISIBLE_RESULTS = 10;

/**
 * Reusable debounce hook
 * Default 250ms for autocomplete, 350ms for full-text search
 */
export function useDebouncedValue<T>(value: T, delayMs: number = 250): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/**
 * Infinite paginated worker & company search hook (`GET /api/v1/search/workers`)
 * - Caps pagination at page 50 (`MAX_PAGE_NUMBER`).
 * - Matches Search Service 60s Redis cache TTL (`staleTime: 60_000`).
 * - Employs `placeholderData: keepPreviousData` for smooth transitions.
 * - Passes `AbortSignal` for cancellation of in-flight requests.
 */
export function useInfiniteWorkerSearch(filters: Omit<SearchWorkersParams, 'page'>) {
  return useInfiniteQuery({
    queryKey: ['search', 'workers', filters],
    queryFn: ({ pageParam = 1, signal }) =>
      searchApi.searchWorkers(
        {
          ...filters,
          page: pageParam as number,
          limit: filters.limit ?? 20,
        },
        signal
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore && lastPage.page < 50) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

/**
 * Debounced autocomplete hook (`GET /api/v1/search/autocomplete`)
 * - Only fires when debounced query is >= 2 characters.
 * - Stale time: 5 minutes (matches backend 600s cache TTL).
 * - Forwards `AbortSignal` so outdated in-flight prefix requests are cancelled immediately.
 */
export function useSearchAutocomplete(rawQuery: string, limit: number = 8) {
  const debouncedQuery = useDebouncedValue(rawQuery.trim(), 250);

  return useQuery<AutocompleteSuggestion[]>({
    queryKey: ['search', 'autocomplete', debouncedQuery, limit],
    queryFn: ({ signal }) => searchApi.getAutocomplete(debouncedQuery, limit, signal),
    enabled: debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Trending search terms hook (`GET /api/v1/search/trending`)
 * - Retrieves popular searches over `'24h'` or `'7d'`.
 * - Stale time: 5 minutes (matches backend 300s cache TTL).
 */
export function useTrendingSearches(
  window: TrendingWindow = '24h',
  limit: number = 10
) {
  return useQuery<TrendingTerm[]>({
    queryKey: ['search', 'trending', window, limit],
    queryFn: ({ signal }) => searchApi.getTrending(window, limit, signal),
    staleTime: 5 * 60 * 1000,
  });
}

export interface UseSearchOptions {
  initialQuery?: string;
  initialFilters?: Partial<FilterState>;
  pageSize?: number;
  trendingWindow?: TrendingWindow;
  /**
   * Also load results before the customer searches (default listing: nearby professionals,
   * backend ranking). Off by default so screens that only edit filters make no request.
   */
  browseWhenIdle?: boolean;
}

/**
 * Main scalable search engine hook for customer application.
 * Manages query state, debouncing, filter synchronization, location resolution,
 * suggestions, trending terms, and infinite pagination.
 */
export const useSearch = (options: UseSearchOptions = {}) => {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState(options.initialQuery || '');
  const debouncedQuery = useDebouncedValue(query.trim(), 350);

  const [filters, setFilters] = useState<FilterState>(() => ({
    ...DEFAULT_FILTERS,
    ...options.initialFilters,
  }));

  // Customer position (selected address, else device fix). null = unknown: geo params are then omitted
  // (never a fixed city centre).
  const activeLocation = useCustomerCoords();
  const lat = activeLocation?.lat;
  const lng = activeLocation?.lng;

  const activeFilterCount = useMemo(() => countActiveFilters(filters, DEFAULT_FILTERS), [filters]);

  // Autocomplete suggestions (debounced 250ms, >= 2 chars)
  const {
    data: suggestions = [],
    isLoading: isSuggestionsLoading,
  } = useSearchAutocomplete(query, 8);

  // Trending search terms (24h window)
  const {
    data: trendingTerms = [],
    isLoading: isTrendingLoading,
  } = useTrendingSearches(options.trendingWindow ?? '24h', 8);

  // Structured params: the text query and the applied filters are combined, never merged into q.
  const searchParams = useMemo<Omit<SearchWorkersParams, 'page'>>(
    () =>
      buildWorkerSearchParams(
        // A single character is not a search yet (matches hasSearchIntent).
        debouncedQuery.length >= 2 ? debouncedQuery : '',
        filters,
        typeof lat === 'number' && typeof lng === 'number'
          ? { lat: roundCoordForQuery(lat), lng: roundCoordForQuery(lng) }
          : null,
        options.pageSize ?? 20
      ),
    [debouncedQuery, filters, lat, lng, options.pageSize]
  );

  const hasSearchIntent = debouncedQuery.length >= 2 || activeFilterCount > 0;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
    isPlaceholderData,
  } = useInfiniteQuery({
    queryKey: ['search', 'workers', searchParams],
    queryFn: ({ pageParam = 1, signal }) =>
      searchApi.searchWorkers({ ...searchParams, page: pageParam as number }, signal, { throwOnError: true }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore && lastPage.page < 50) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    enabled: hasSearchIntent || Boolean(options.browseWhenIdle),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });

  // Backend order and backend distance are used as received.
  const allWorkers = useMemo<WorkerNearby[]>(() => data?.pages.flatMap((page) => page.workers) ?? [], [data]);
  const workers = useMemo(() => applyClientSideFilters(allWorkers, filters), [allWorkers, filters]);
  const isClientFiltered = hasClientSideFilters(filters);

  // A client-side filter can leave a page (or the whole first screen) empty while the backend still
  // has more: fetch on until a screenful is visible or the results run out (page cap 50).
  useEffect(() => {
    if (!isClientFiltered || !hasNextPage || isFetchingNextPage || isLoading) return;
    if (workers.length < MIN_VISIBLE_RESULTS) void fetchNextPage();
  }, [isClientFiltered, hasNextPage, isFetchingNextPage, isLoading, workers.length, fetchNextPage]);

  const documents = useMemo<WorkerSearchDocument[]>(() => {
    return data?.pages.flatMap((page) => page.documents) ?? [];
  }, [data]);

  // With a client-side filter the backend total counts workers we hide, so it is not exact.
  const total = isClientFiltered ? workers.length : data?.pages[0]?.total ?? 0;
  const totalPages = data?.pages[0]?.totalPages ?? 0;

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setFilters(DEFAULT_FILTERS);
    queryClient.removeQueries({ queryKey: ['search', 'workers'] });
  }, [queryClient]);

  const handleSelectSuggestion = useCallback(
    (item: AutocompleteSuggestion) => {
      if (item.type === 'category') {
        if (item.category_id) {
          setFilters((prev) => ({
            ...prev,
            categoryId: item.category_id,
            categoryLabel: item.label,
            categories: [item.label],
          }));
        } else {
          setFilters((prev) => ({
            ...prev,
            categories: [item.label],
          }));
        }
        setQuery('');
      } else {
        setQuery(item.label);
      }
    },
    []
  );

  return {
    // Query state
    query,
    setQuery,
    debouncedQuery,
    clearSearch,

    // Suggestions & Trending
    suggestions,
    isSuggestionsLoading,
    handleSelectSuggestion,
    trendingTerms,
    isTrendingLoading,

    // Filters state
    filters,
    setFilters,
    resetFilters,
    activeFilterCount,

    // Results & Pagination
    workers,
    documents,
    total,
    /** true when total only counts the results loaded so far (more pages may match). */
    isTotalPartial: isClientFiltered && Boolean(hasNextPage),
    totalPages,
    isLoading: isLoading && (hasSearchIntent || Boolean(options.browseWhenIdle)),
    isLoadingMore: isFetchingNextPage,
    isRefetching,
    /** Showing the previous query's results while the new ones load. */
    isPlaceholderData,
    isError,
    error,
    hasMore: Boolean(hasNextPage),
    loadMore: fetchNextPage,
    refetch,
    hasSearchIntent,
  };
};
