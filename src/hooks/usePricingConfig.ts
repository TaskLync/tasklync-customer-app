import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api/client';
import { unwrapEnvelope } from '../utils/offers';
import { toPublicPricingConfig } from '../utils/feeDisplay';

export type { PublicPricingConfig } from '../utils/feeDisplay';

export const PRICING_CONFIG_QUERY_KEY = ['pricing-config'] as const;

/**
 * The ACTIVE fee / tax settings, for labels only (cart, before the server has priced a booking).
 * Never used to compute an amount: every amount comes from the server's estimate, quote or booking.
 */
export function usePricingConfig() {
  return useQuery({
    queryKey: PRICING_CONFIG_QUERY_KEY,
    queryFn: async () => {
      const res = await apiClient.get('/bookings/pricing-config');
      return toPublicPricingConfig(unwrapEnvelope<any>(res.data));
    },
    // Matches the server's ~60s cache; an admin change shows up within about a minute.
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
