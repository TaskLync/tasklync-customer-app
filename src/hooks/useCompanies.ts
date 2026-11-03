import { useQuery } from '@tanstack/react-query';
import { WorkerNearby } from '../types/worker.types';
import { workerApi } from '../services/api/worker.api';
import { useLocationStore } from '../store/location.store';
import { FAISALABAD_CENTER } from '../config/serviceArea.config';
import { localStorage } from '../services/storage/local.storage';
import { resolveWorkerDistance } from '../utils/locationUtils';

export interface UseCompaniesParams {
  limit?: number;
  lat?: number;
  lng?: number;
  category?: string;
  page?: number;
}

const CACHE_COMPANIES_KEY = 'cache_companies_list';

export const useCompanies = (params?: UseCompaniesParams) => {
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

  const queryParams = {
    lat,
    lng,
    limit: params?.limit || 12,
    page: params?.page || 1,
    category: params?.category,
  };

  const query = useQuery({
    queryKey: ['companies', queryParams],
    queryFn: async (): Promise<{ companies: WorkerNearby[]; total: number }> => {
      try {
        const apiParams: { page?: number; limit?: number; lat?: number; lng?: number; category?: string } = {
          page: queryParams.page,
          limit: queryParams.limit,
        };
        if (queryParams.lat !== undefined) apiParams.lat = queryParams.lat;
        if (queryParams.lng !== undefined) apiParams.lng = queryParams.lng;
        if (queryParams.category !== undefined) apiParams.category = queryParams.category;

        const res = await workerApi.getCompanies(apiParams);
        const validCompanies = (res?.companies || []).filter(
          (c) => c.providerType === 'COMPANY' || c.isCompany === true
        );

        if (validCompanies.length > 0) {
          localStorage.setGeneric(CACHE_COMPANIES_KEY, validCompanies);
        }

        return {
          companies: validCompanies,
          total: res?.total || validCompanies.length,
        };
      } catch (err) {
        console.warn('[useCompanies] Error fetching real companies from backend:', err);
        const cached = localStorage.getGeneric<WorkerNearby[]>(CACHE_COMPANIES_KEY);
        if (cached?.data && cached.data.length > 0) {
          return {
            companies: cached.data,
            total: cached.data.length,
          };
        }
        // No cache to fall back on: let React Query mark the query as errored (and retry).
        throw err;
      }
    },
    initialData: () => {
      const cached = localStorage.getGeneric<WorkerNearby[]>(CACHE_COMPANIES_KEY);
      if (cached?.data && cached.data.length > 0) {
        return {
          companies: cached.data,
          total: cached.data.length,
        };
      }
      return undefined;
    },
    // Cached data is treated as stale by its real age so it is refreshed on mount.
    initialDataUpdatedAt: () => localStorage.getGeneric<WorkerNearby[]>(CACHE_COMPANIES_KEY)?.cachedAt,
    retry: 2,
    // Empty results are re-checked quickly; populated results stay fresh for 5 minutes.
    staleTime: (q) => ((q.state.data?.companies?.length ?? 0) > 0 ? 1000 * 60 * 5 : 1000 * 15),
    gcTime: 1000 * 60 * 30, // 30 minutes in memory
  });

  const customerCoords = activeCoords ? { lat: activeCoords.lat, lng: activeCoords.lng } : null;

  const verifiedCompanies = (query.data?.companies ?? [])
    .filter((c) => c.providerType === 'COMPANY' || c.isCompany === true)
    .map((company) => {
      const { distanceMeters, distanceLabel } = resolveWorkerDistance(company, customerCoords);
      return {
        ...company,
        distanceMeters: distanceMeters ?? company.distanceMeters,
        distanceLabel: distanceLabel || company.distanceLabel,
      };
    });

  return {
    companies: verifiedCompanies,
    total: verifiedCompanies.length > 0 ? (query.data?.total ?? verifiedCompanies.length) : 0,
    isLoading: query.isLoading && !query.data,
    isFetching: query.isFetching,
    isError: query.isError && verifiedCompanies.length === 0,
    error: query.error,
    refetch: query.refetch,
    isEmpty: !query.isLoading && !query.isError && verifiedCompanies.length === 0,
  };
};
