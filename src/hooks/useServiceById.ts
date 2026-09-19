import { useQuery } from '@tanstack/react-query';
import { categoryApi } from '../services/api/category.api';
import { Service } from '../types/category.types';

export const useServiceById = (serviceId: string) => {
  const { data, isLoading, isError, refetch } = useQuery<Service, Error>({
    queryKey: ['service', serviceId],
    queryFn: async () => {
      return await categoryApi.getServiceById(serviceId);
    },
    staleTime: 3600_000, // 1 hour stale time as services change rarely
    enabled: Boolean(serviceId),
  });

  return {
    service: data,
    isLoading,
    isError,
    refetch,
  };
};
