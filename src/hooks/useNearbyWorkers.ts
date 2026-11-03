import { useQuery } from '@tanstack/react-query';
import { NearbyWorkersParams } from '../types';
import { useLocationStore } from '../store/location.store';
import { workerApi } from '../services/api/worker.api';
import { searchApi } from '../services/api/search.api';
import { FAISALABAD_CENTER } from '../config/serviceArea.config';
import { resolveWorkerDistance } from '../utils/locationUtils';

const MAX_ALLOWED_RADIUS = 20000; // Backend constraint: Radius cannot exceed 20,000 meters

export const useNearbyWorkers = (params?: Partial<NearbyWorkersParams>) => {
  const { locationMode, selectedAddress, currentLocation } = useLocationStore();

  const activeCoords =
    locationMode === 'address' &&
    selectedAddress &&
    !isNaN(Number(selectedAddress.lat)) &&
    !isNaN(Number(selectedAddress.lng))
      ? { lat: Number(selectedAddress.lat), lng: Number(selectedAddress.lng) }
      : currentLocation ?? FAISALABAD_CENTER;

  const lat = params?.lat ?? activeCoords?.lat;
  const lng = params?.lng ?? activeCoords?.lng;
  const radius = params?.radius ? Math.min(params.radius, MAX_ALLOWED_RADIUS) : 5000;

  const hasCoordinates = typeof lat === 'number' && typeof lng === 'number';

  const queryParams = {
    lat,
    lng,
    radius,
    limit: params?.limit || 8,
    category: params?.category,
    serviceId: params?.serviceId,
    minRating: params?.minRating,
  };

  const query = useQuery({
    queryKey: ['workers', 'nearby', queryParams],
    queryFn: async () => {
      if (__DEV__) {
        console.log('[DEBUG nearby-workers] 1. Requesting nearby workers with params:', queryParams);
      }

      let lastError: unknown = null;
      let anySucceeded = false;

      // Stage 1: Dedicated Geofenced Proximity API (/workers/nearby) - only when real GPS coords are available
      if (hasCoordinates) {
        try {
          const res = await workerApi.getNearbyWorkers({
            lat: lat!,
            lng: lng!,
            radius,
            limit: queryParams.limit,
            provider_type: 'INDIVIDUAL',
            ...(queryParams.category ? { category: queryParams.category } : {}),
            ...(queryParams.serviceId ? { serviceId: queryParams.serviceId } : {}),
            ...(queryParams.minRating !== undefined ? { minRating: queryParams.minRating } : {}),
          });
          anySucceeded = true;
          if (__DEV__) {
            console.log('[DEBUG nearby-workers] 1. Proximity API returned worker count:', res?.workers?.length || 0);
          }
          if (res && Array.isArray(res.workers) && res.workers.length > 0) {
            return res;
          }
        } catch (error) {
          lastError = error;
          console.warn('[useNearbyWorkers] Proximity API error:', error);
        }
      }

      // Stage 2: Fallback to Search API (/search/workers) with coordinates if proximity had no matches
      if (hasCoordinates) {
        try {
          const searchRes = await searchApi.searchWorkers({
            q: queryParams.category || '',
            lat: queryParams.lat,
            lng: queryParams.lng,
            radius: queryParams.radius,
            limit: queryParams.limit,
            provider_type: 'INDIVIDUAL',
          });
          anySucceeded = true;

          if (searchRes && Array.isArray(searchRes.workers) && searchRes.workers.length > 0) {
            if (__DEV__) {
              console.log('[DEBUG nearby-workers] 2. Geofenced Search returned worker count:', searchRes.workers.length);
            }
            return { workers: searchRes.workers, total: searchRes.total, page: 1, hasMore: searchRes.hasMore };
          }
        } catch (error) {
          lastError = error;
          console.warn('[useNearbyWorkers] Geofenced Search fallback error:', error);
        }
      }

      // Stage 3: Unbounded Platform-wide Discovery (for new/unseeded test regions)
      try {
        const fallbackRes = await searchApi.searchWorkers({
          q: queryParams.category || '',
          lat: queryParams.lat,
          lng: queryParams.lng,
          limit: queryParams.limit,
          category: queryParams.category,
          provider_type: 'INDIVIDUAL',
        });
        anySucceeded = true;

        if (fallbackRes && Array.isArray(fallbackRes.workers) && fallbackRes.workers.length > 0) {
          if (__DEV__) {
            console.log('[DEBUG nearby-workers] 3. Platform-wide discovery returned worker count:', fallbackRes.workers.length);
          }
          return { workers: fallbackRes.workers, total: fallbackRes.total, page: 1, hasMore: fallbackRes.hasMore };
        }
      } catch (error) {
        lastError = error;
        console.warn('[useNearbyWorkers] Platform-wide discovery error:', error);
      }

      if (__DEV__) {
        console.log('[DEBUG nearby-workers] 8. All stages complete. Final real data passed to UI: 0 workers in DB.');
      }

      // If all network attempts failed and no request succeeded, propagate the error
      if (!anySucceeded && lastError) {
        throw lastError;
      }

      return { workers: [] };
    },
    enabled: true,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    select: (data) => {
      const customerCoords = hasCoordinates ? { lat: lat!, lng: lng! } : null;
      return (data?.workers || [])
        // STRICT: Never allow companies to show in nearby workers section
        .filter((w) => w.providerType !== 'COMPANY' && !w.isCompany)
        .map((worker) => {
          const { distanceMeters, distanceLabel } = resolveWorkerDistance(worker, customerCoords);
          return {
            ...worker,
            distanceMeters: distanceMeters ?? worker.distanceMeters,
            distanceLabel: distanceLabel || worker.distanceLabel,
          };
        });
    },
  });

  return {
    workers: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
