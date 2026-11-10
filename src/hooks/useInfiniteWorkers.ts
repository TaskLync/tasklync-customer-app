import { useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { workerApi } from '../services/api/worker.api';
import { searchApi } from '../services/api/search.api';
import { NearbyWorkersParams } from '../types';
import type { SearchSortOption } from '../types/search.types';
import { useCustomerCoords } from './useCustomerCoords';
import { roundCoordForQuery } from '../utils/locationUtils';

const MAX_SEARCH_RADIUS = 50_000; // search-service MAX_SEARCH_RADIUS_METERS

/**
 * All Workers / category listings: GET /api/v1/search/workers (search-service ranking engine).
 *
 * Exactly ONE request per page. The backend order (rank_score, or the sort the customer explicitly
 * chose) is preserved: pages are appended in arrival order and nothing is re-sorted, prepended or
 * merged from other lists. See search-service/src/types/customer-discovery.contract.ts.
 */
export const useInfiniteWorkers = (params: Partial<Omit<NearbyWorkersParams, 'page'>> = {}) => {
  const queryClient = useQueryClient();
  // Same customer position as Nearby Workers. null = unknown (never a fixed city centre).
  const activeCoords = useCustomerCoords();

  const effectiveLat = params.lat ?? activeCoords?.lat;
  const effectiveLng = params.lng ?? activeCoords?.lng;
  const hasCoordinates = typeof effectiveLat === 'number' && typeof effectiveLng === 'number';

  const {
    data,
    isLoading,
    isFetchingNextPage,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: [
      'workers',
      'infinite',
      {
        ...params,
        // ~110 m rounding for the key only, so GPS jitter does not mint a new request
        lat: typeof effectiveLat === 'number' ? roundCoordForQuery(effectiveLat) : undefined,
        lng: typeof effectiveLng === 'number' ? roundCoordForQuery(effectiveLng) : undefined,
      },
    ],
    queryFn: async ({ pageParam = 1, signal }) => {
      const res = await searchApi.searchWorkers(
        {
          // lat + lng + radius are sent together or not at all (backend rule)
          ...(hasCoordinates
            ? {
                lat: effectiveLat!,
                lng: effectiveLng!,
                radius: Math.min(params.radius ?? MAX_SEARCH_RADIUS, MAX_SEARCH_RADIUS),
              }
            : {}),
          ...(params.category ? { category: params.category } : {}),
          ...(params.minRating !== undefined ? { minRating: params.minRating } : {}),
          ...(params.maxRate ? { maxRate: params.maxRate } : {}),
          // sort only when the customer explicitly picked one; otherwise the backend ranking applies
          ...(params.sortBy ? { sortBy: params.sortBy as SearchSortOption } : {}),
          page: pageParam as number,
          limit: params.limit || 20,
          provider_type: 'INDIVIDUAL',
        },
        signal
      );
      return { workers: res.workers, total: res.total, page: res.page, hasMore: res.hasMore };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: true,
    staleTime: 30_000,
  });

  const rawWorkers = data?.pages.flatMap((page) => page.workers) ?? [];
  // Strictly ensure only individual workers are exposed
  const workers = rawWorkers.filter((w) => w.providerType !== 'COMPANY' && !w.isCompany);
  const total = data?.pages[0]?.total ?? 0;
  const isEmpty = workers.length === 0 && !isLoading && !isError;

  useEffect(() => {
    if (workers.length > 0) {
      const top5Workers = workers.slice(0, 5);
      top5Workers.forEach((worker) => {
        queryClient.prefetchQuery({
          queryKey: ['worker', worker.id],
          queryFn: async () => {
            try {
              return await workerApi.getWorkerProfile(worker.id);
            } catch (err) {
              return null;
            }
          },
          staleTime: 5 * 60 * 1000,
        });
      });
    }
  }, [workers, queryClient]);

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return {
    workers,
    total,
    isLoading,
    isLoadingMore: isFetchingNextPage,
    isError,
    error,
    hasNextPage,
    loadMore,
    refetch,
    isEmpty,
  };
};

