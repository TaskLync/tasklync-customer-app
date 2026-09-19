import { useQuery } from '@tanstack/react-query';
import { categoryApi } from '../services/api/category.api';
import { Category } from '../types';
import { localStorage } from '../services/storage/local.storage';

export const useCategories = () => {
  const query = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const data = await categoryApi.getCategories();
        if (Array.isArray(data) && data.length > 0) {
          localStorage.cacheCategories(data);
          return data;
        }
      } catch (err) {
        const cached = localStorage.getCachedCategories<Category[]>();
        if (cached?.data && cached.data.length > 0) {
          return cached.data;
        }
      }
      const cached = localStorage.getCachedCategories<Category[]>();
      return cached?.data || [];
    },
    initialData: () => {
      const cached = localStorage.getCachedCategories<Category[]>();
      return cached?.data;
    },
    staleTime: 3600_000, // 1 hour
    gcTime: 86400_000, // 24 hours
    refetchOnMount: false,
  });

  return {
    categories: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

export const useCategoryById = (id: string) => {
  const query = useQuery({
    queryKey: ['category', id],
    queryFn: async () => {
      return await categoryApi.getCategoryById(id);
    },
    staleTime: 3600_000,
    enabled: !!id,
  });

  return {
    category: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
};

export const useCategoryServices = (categoryId: string) => {
  const query = useQuery({
    queryKey: ['services', categoryId],
    queryFn: async () => {
      return await categoryApi.getCategoryServices(categoryId);
    },
    staleTime: 3600_000,
    enabled: !!categoryId,
  });

  return {
    services: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
};
