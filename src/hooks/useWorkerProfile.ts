import { useQuery, type QueryClient } from '@tanstack/react-query';
import { workerApi } from '../services/api/worker.api';
import { WorkerPublicProfile, WorkerSkill, WorkerServiceOffering } from '../types/worker.types';
import { WorkerReview } from '../types/review.types';
import { PaginatedResponse } from '../types/api.types';
import { localStorage } from '../services/storage/local.storage';

export const useWorkerSkills = (workerId?: string | null) => {
  const safeWorkerId = workerId || '';
  const query = useQuery<WorkerSkill[], Error>({
    queryKey: ['worker', safeWorkerId, 'skills'],
    queryFn: async () => {
      if (!safeWorkerId) return [];
      try {
        const res = await workerApi.getWorkerSkills(safeWorkerId);
        if (Array.isArray(res)) return res;
        return [];
      } catch (_err) {
        return [];
      }
    },
    enabled: !!safeWorkerId,
    staleTime: 300_000,
  });

  return {
    skills: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

export const useWorkerServiceOfferings = (workerId?: string | null) => {
  const safeWorkerId = workerId || '';
  const query = useQuery<WorkerServiceOffering[], Error>({
    queryKey: ['worker', safeWorkerId, 'services'],
    queryFn: async () => {
      if (!safeWorkerId) return [];
      try {
        const res = await workerApi.getWorkerServices(safeWorkerId);
        if (Array.isArray(res)) return res;
        return [];
      } catch (_err) {
        return [];
      }
    },
    enabled: !!safeWorkerId,
    staleTime: 300_000,
  });

  return {
    services: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

const fetchWorkerProfile = async (safeWorkerId: string): Promise<WorkerPublicProfile> => {
  if (!safeWorkerId) throw new Error('Worker profile not found');
  try {
    const result = await workerApi.getWorkerProfile(safeWorkerId);
    if (result) {
      localStorage.cacheWorkerProfile(safeWorkerId, result);
      return result;
    }
  } catch (err) {
    const cached = localStorage.getCachedWorkerProfile<WorkerPublicProfile>(safeWorkerId);
    if (cached?.data) return cached.data;
    throw err;
  }
  throw new Error('Worker profile not found');
};

/**
 * Warm the profile cache (same key/fetcher as useWorkerProfile) so the screen opens with data.
 * Respects staleTime, so a fresh cache entry means no network call. Fire-and-forget.
 */
export const prefetchWorkerProfile = (queryClient: QueryClient, workerId?: string | null) => {
  if (!workerId) return;
  void queryClient.prefetchQuery({
    queryKey: ['worker', workerId],
    queryFn: () => fetchWorkerProfile(workerId),
    staleTime: 5 * 60 * 1000,
  });
};

export const useWorkerProfile = (workerId?: string | null) => {
  const safeWorkerId = workerId || '';
  const profileQuery = useQuery<WorkerPublicProfile, Error>({
    queryKey: ['worker', safeWorkerId],
    queryFn: () => fetchWorkerProfile(safeWorkerId),
    initialData: () => {
      if (!safeWorkerId) return undefined;
      const cached = localStorage.getCachedWorkerProfile<WorkerPublicProfile>(safeWorkerId);
      return cached?.data;
    },
    initialDataUpdatedAt: () => {
      if (!safeWorkerId) return undefined;
      const cached = localStorage.getCachedWorkerProfile<WorkerPublicProfile>(safeWorkerId);
      return cached?.cachedAt;
    },
    enabled: !!safeWorkerId,
    staleTime: 5 * 60 * 1000,
  });

  const skillsQuery = useWorkerSkills(safeWorkerId);
  const servicesQuery = useWorkerServiceOfferings(safeWorkerId);

  // Fall back to profileQuery's serviceOfferings if sub-query services is empty
  const services =
    servicesQuery.services && servicesQuery.services.length > 0
      ? servicesQuery.services
      : profileQuery.data?.serviceOfferings && profileQuery.data.serviceOfferings.length > 0
      ? profileQuery.data.serviceOfferings
      : [];

  return {
    worker: profileQuery.data,
    dataUpdatedAt: profileQuery.dataUpdatedAt,
    skills: skillsQuery.skills.length > 0 ? skillsQuery.skills : (profileQuery.data?.skills || []),
    services,
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,
    error: profileQuery.error,
    refetch: () => {
      profileQuery.refetch();
      skillsQuery.refetch();
      servicesQuery.refetch();
    },
  };
};

export const useWorkerReviews = (workerId?: string | null, page: number = 1) => {
  const safeWorkerId = workerId || '';
  const query = useQuery<PaginatedResponse<WorkerReview>, Error>({
    queryKey: ['worker', safeWorkerId, 'reviews', page],
    queryFn: async () => {
      if (!safeWorkerId) {
        return {
          items: [],
          meta: {
            pagination: {
              total: 0,
              page,
              limit: 20,
              hasMore: false,
            },
          },
        } as any;
      }
      try {
        return await workerApi.getWorkerReviews(safeWorkerId, { page });
      } catch (err) {
        return {
          items: [],
          meta: {
            pagination: {
              total: 0,
              page,
              limit: 20,
              hasMore: false,
            },
          },
        } as any;
      }
    },
    enabled: !!safeWorkerId,
    staleTime: 300_000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
