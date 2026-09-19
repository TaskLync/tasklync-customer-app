import { useQuery } from '@tanstack/react-query';
import { workerApi } from '../services/api/worker.api';
import { WorkerPublicProfile, WorkerSkill, WorkerServiceOffering } from '../types/worker.types';
import { WorkerReview } from '../types/review.types';
import { PaginatedResponse } from '../types/api.types';
import { localStorage } from '../services/storage/local.storage';

export const useWorkerSkills = (workerId: string) => {
  const query = useQuery<WorkerSkill[], Error>({
    queryKey: ['worker', workerId, 'skills'],
    queryFn: async () => {
      try {
        const res = await workerApi.getWorkerSkills(workerId);
        if (Array.isArray(res)) return res;
        return [];
      } catch (_err) {
        return [];
      }
    },
    enabled: !!workerId,
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

export const useWorkerServiceOfferings = (workerId: string) => {
  const query = useQuery<WorkerServiceOffering[], Error>({
    queryKey: ['worker', workerId, 'services'],
    queryFn: async () => {
      try {
        const res = await workerApi.getWorkerServices(workerId);
        if (Array.isArray(res)) return res;
        return [];
      } catch (_err) {
        return [];
      }
    },
    enabled: !!workerId,
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

export const useWorkerProfile = (workerId: string) => {
  const profileQuery = useQuery<WorkerPublicProfile, Error>({
    queryKey: ['worker', workerId],
    queryFn: async () => {
      try {
        const result = await workerApi.getWorkerProfile(workerId);
        if (result) {
          localStorage.cacheWorkerProfile(workerId, result);
          return result;
        }
      } catch (err) {
        const cached = localStorage.getCachedWorkerProfile<WorkerPublicProfile>(workerId);
        if (cached?.data) return cached.data;
        throw err;
      }
      throw new Error('Worker profile not found');
    },
    initialData: () => {
      const cached = localStorage.getCachedWorkerProfile<WorkerPublicProfile>(workerId);
      return cached?.data;
    },
    initialDataUpdatedAt: () => {
      const cached = localStorage.getCachedWorkerProfile<WorkerPublicProfile>(workerId);
      return cached?.cachedAt;
    },
    enabled: !!workerId,
    staleTime: 5 * 60 * 1000,
  });

  const skillsQuery = useWorkerSkills(workerId);
  const servicesQuery = useWorkerServiceOfferings(workerId);

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

export const useWorkerReviews = (workerId: string, page: number = 1) => {
  const query = useQuery<PaginatedResponse<WorkerReview>, Error>({
    queryKey: ['worker', workerId, 'reviews', page],
    queryFn: async () => {
      try {
        return await workerApi.getWorkerReviews(workerId, { page });
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
    enabled: !!workerId,
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
