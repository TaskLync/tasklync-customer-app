import { useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { workerApi } from '../services/api/worker.api';
import { searchApi } from '../services/api/search.api';
import { NearbyWorkersParams, WorkerNearby } from '../types';
import { useLocationStore } from '../store/location.store';
import { FAISALABAD_CENTER } from '../config/serviceArea.config';
import { resolveWorkerDistance } from '../utils/locationUtils';

const matchCategory = (catList: string[], targetCategory?: string): boolean => {
  if (!targetCategory) return true;
  const target = targetCategory.toLowerCase().replace(/_/g, ' ');
  return catList.some((c) => {
    const item = c.toLowerCase().replace(/_/g, ' ');
    return item.includes(target) || target.includes(item);
  });
};

export const useInfiniteWorkers = (params: Partial<Omit<NearbyWorkersParams, 'page'>> = {}) => {
  const queryClient = useQueryClient();
  const { locationMode, selectedAddress, currentLocation } = useLocationStore();

  const activeCoords =
    locationMode === 'address' &&
    selectedAddress &&
    !isNaN(Number(selectedAddress.lat)) &&
    !isNaN(Number(selectedAddress.lng))
      ? { lat: Number(selectedAddress.lat), lng: Number(selectedAddress.lng) }
      : currentLocation ?? FAISALABAD_CENTER;

  const effectiveLat = params.lat ?? activeCoords?.lat;
  const effectiveLng = params.lng ?? activeCoords?.lng;
  const hasCoordinates = typeof effectiveLat === 'number' && typeof effectiveLng === 'number';
  const customerCoords = hasCoordinates ? { lat: effectiveLat!, lng: effectiveLng! } : null;

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
    queryKey: ['workers', 'infinite', { ...params, lat: effectiveLat, lng: effectiveLng }],
    queryFn: async ({ pageParam = 1 }) => {
      let anySucceeded = false;
      let lastError: unknown = null;
      let discoveredWorkers: WorkerNearby[] = [];
      let totalCount = 0;
      let hasMore = false;

      // Strategy 1: Search API with customer coordinates & distance sorting (covers up to 50km)
      if (hasCoordinates) {
        try {
          const searchRes = await searchApi.searchWorkers({
            q: '',
            lat: effectiveLat,
            lng: effectiveLng,
            radius: Math.min(params.radius ?? 50000, 50000),
            category: params.category,
            minRating: params.minRating,
            maxRate: params.maxRate,
            sortBy: (params.sortBy as any) || 'distance',
            page: pageParam as number,
            limit: params.limit || 20,
            provider_type: 'INDIVIDUAL',
          });
          anySucceeded = true;
          if (searchRes && Array.isArray(searchRes.workers) && searchRes.workers.length > 0) {
            discoveredWorkers = searchRes.workers;
            totalCount = searchRes.total;
            hasMore = searchRes.hasMore;
          }
        } catch (searchErr) {
          lastError = searchErr;
          console.warn('[useInfiniteWorkers] Strategy 1 (Geofenced Search) error:', searchErr);
        }
      }

      // Strategy 2: Search API unbounded (platform-wide) if geo search returned empty
      if (discoveredWorkers.length === 0) {
        try {
          const searchRes = await searchApi.searchWorkers({
            q: '',
            lat: effectiveLat,
            lng: effectiveLng,
            category: params.category,
            minRating: params.minRating,
            maxRate: params.maxRate,
            sortBy: (params.sortBy as any) || (hasCoordinates ? 'distance' : 'relevance'),
            page: pageParam as number,
            limit: params.limit || 20,
            provider_type: 'INDIVIDUAL',
          });
          anySucceeded = true;
          if (searchRes && Array.isArray(searchRes.workers) && searchRes.workers.length > 0) {
            discoveredWorkers = searchRes.workers;
            totalCount = searchRes.total;
            hasMore = searchRes.hasMore;
          }
        } catch (searchErr) {
          lastError = searchErr;
          console.warn('[useInfiniteWorkers] Strategy 2 (Platform Search) error:', searchErr);
        }
      }

      // Strategy 3: Dedicated Proximity API fallback if search service returned 0
      if (discoveredWorkers.length === 0 && hasCoordinates) {
        try {
          const queryParams: NearbyWorkersParams & { provider_type?: 'INDIVIDUAL' } = {
            lat: effectiveLat!,
            lng: effectiveLng!,
            radius: params.radius ?? 20000,
            page: pageParam,
            provider_type: 'INDIVIDUAL',
          };
          if (params.category) queryParams.category = params.category;
          if (params.serviceId) queryParams.serviceId = params.serviceId;
          if (params.minRating !== undefined) queryParams.minRating = params.minRating;
          if (params.maxRate !== undefined) queryParams.maxRate = params.maxRate;
          if (params.limit !== undefined) queryParams.limit = params.limit;
          if (params.sortBy) queryParams.sortBy = params.sortBy;

          const res = await workerApi.getNearbyWorkers(queryParams as any);
          anySucceeded = true;
          if (res && Array.isArray(res.workers) && res.workers.length > 0) {
            discoveredWorkers = res.workers;
            totalCount = res.total;
            hasMore = res.hasMore;
          }
        } catch (err) {
          lastError = err;
          console.warn('[useInfiniteWorkers] Strategy 3 (Proximity API) error:', err);
        }
      }

      // If all network attempts failed, throw the error
      if (!anySucceeded && lastError) {
        throw lastError;
      }

      // Strictly exclude companies from individual worker collection
      let soloWorkers = discoveredWorkers.filter(
        (w) => w.providerType !== 'COMPANY' && !w.isCompany
      );

      if (params.category) {
        const matching = soloWorkers.filter((w) => matchCategory(w.categories, params.category));
        if (matching.length > 0) {
          soloWorkers = matching;
        }
      }

      // Guaranteed Superset: Reconcile with cached Nearby Workers on page 1
      if (pageParam === 1) {
        try {
          const cachedNearbyQueries = queryClient.getQueriesData<any>({ queryKey: ['workers', 'nearby'] });
          const seenIds = new Set(soloWorkers.map((w) => w.id));
          const extraNearbyWorkers: WorkerNearby[] = [];

          for (const [_, cachedData] of cachedNearbyQueries) {
            const list: WorkerNearby[] = Array.isArray(cachedData?.workers)
              ? cachedData.workers
              : Array.isArray(cachedData)
              ? cachedData
              : [];

            for (const worker of list) {
              if (
                worker &&
                worker.id &&
                !seenIds.has(worker.id) &&
                worker.providerType !== 'COMPANY' &&
                !worker.isCompany &&
                matchCategory(worker.categories || [], params.category)
              ) {
                seenIds.add(worker.id);
                extraNearbyWorkers.push(worker);
              }
            }
          }

          if (extraNearbyWorkers.length > 0) {
            soloWorkers = [...extraNearbyWorkers, ...soloWorkers];
            totalCount += extraNearbyWorkers.length;
          }
        } catch (cacheErr) {
          // Non-blocking cache reconciliation
        }
      }

      // Enrich with distance calculations
      const reconciled = soloWorkers.map((w) => {
        const { distanceMeters, distanceLabel } = resolveWorkerDistance(w, customerCoords);
        return {
          ...w,
          distanceMeters: distanceMeters ?? w.distanceMeters,
          distanceLabel: distanceLabel || w.distanceLabel,
        };
      });

      return {
        workers: reconciled,
        total: Math.max(totalCount, reconciled.length),
        page: pageParam,
        hasMore,
      };
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

