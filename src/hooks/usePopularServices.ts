import { useQuery } from '@tanstack/react-query';
import { categoryApi } from '../services/api/category.api';

export interface PopularService {
  id: string;
  name: string;
  categoryName: string;
  duration: string;
  startingPrice: number;
  currency: string;
  iconName?: string | undefined;
  imageUrl?: any;
}

export const usePopularServices = () => {
  return useQuery({
    queryKey: ['popular-services'],
    queryFn: async (): Promise<PopularService[]> => {
      try {
        const categories = await categoryApi.getCategories();
        if (!Array.isArray(categories) || categories.length === 0) {
          return [];
        }

        // Fetch services from top 2 active categories
        const topCategories = categories.slice(0, 2);
        const servicesPromises = topCategories.map(async (cat) => {
          try {
            const services = await categoryApi.getCategoryServices(cat.id);
            return services.map((s) => ({
              id: s.id,
              name: s.name,
              categoryName: cat.name,
              duration: s.minDurationMins ? `${s.minDurationMins} min` : '60 min',
              startingPrice: s.basePrice || 500,
              currency: 'Rs',
              iconName: s.iconUrl || 'wrench',
            }));
          } catch {
            return [];
          }
        });

        const nested = await Promise.all(servicesPromises);
        const flattened = nested.flat();
        return flattened.slice(0, 4);
      } catch {
        return [];
      }
    },
    staleTime: 3600_000, // 1 hour
  });
};
