import { useQuery } from '@tanstack/react-query';
import { NearbyWorkersParams } from '../types';
import { useCustomerCoords } from './useCustomerCoords';
import { workerApi } from '../services/api/worker.api';
import { roundCoordForQuery, rememberWorkerCoords } from '../utils/locationUtils';

const MAX_ALLOWED_RADIUS = 20000; // Backend constraint: Radius cannot exceed 20,000 meters

export const useNearbyWorkers = (params?: Partial<NearbyWorkersParams>) => {
  // Same customer position as every other worker list. null = unknown (never a fixed city centre).
  const activeCoords = useCustomerCoords();

  const lat = params?.lat ?? activeCoords?.lat;
  const lng = params?.lng ?? activeCoords?.lng;
  const radius = params?.radius ? Math.min(params.radius, MAX_ALLOWED_RADIUS) : 5000;

  const hasCoordinates = typeof lat === 'number' && typeof lng === 'number';

  const queryParams = {
    // Rounded (~110 m) ONLY for the query key so GPS jitter does not mint a new request each fix.
    // The requests below carry the exact coordinates so server-side distances are not skewed.
    lat: typeof lat === 'number' ? roundCoordForQuery(lat) : lat,
    lng: typeof lng === 'number' ? roundCoordForQuery(lng) : lng,
    radius,
    limit: params?.limit || 8,
    category: params?.category,
    serviceId: params?.serviceId,
    minRating: params?.minRating,
  };

  // Home "Nearby Workers": GET /api/v1/workers/nearby (worker-service). The backend orders by distance,
  // then rating. One request; no fallback to other lists (an empty nearby result is a real result), and
  // nothing is requested until the customer's position is known.
  const query = useQuery({
    queryKey: ['workers', 'nearby', queryParams],
    queryFn: async () => {
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
      // Share these live coordinates with every other worker list (same worker => same distance).
      res?.workers?.forEach(rememberWorkerCoords);
      return res;
    },
    enabled: hasCoordinates,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    // Backend order is preserved (no sort). Distance shown is the backend's own value.
    select: (data) => data?.workers ?? [],
  });

  return {
    workers: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
