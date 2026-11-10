import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { offersApi } from '../services/api/offers.api';
import type { PublicWorkerOffer } from '../types/offers.types';
import { isOfferLive } from '../utils/offers';

/** Short TTL: offers start and end at any time, and the endpoint is rate limited (60/min). */
const OFFERS_STALE_MS = 60_000;

/**
 * A worker's active automatic offers (public endpoint, no conditions, not per-user).
 * Errors are deliberately silent: the section simply stays hidden, and a refetch
 * (pull-to-refresh / re-entering the screen) retries.
 */
export function useWorkerOffers(workerId?: string | null) {
  const safeId = workerId || '';
  const query = useQuery<PublicWorkerOffer[], Error>({
    queryKey: ['worker-offers', safeId],
    queryFn: ({ signal }) => offersApi.getWorkerOffers(safeId, signal),
    enabled: Boolean(safeId),
    staleTime: OFFERS_STALE_MS,
    retry: 1,
  });

  // Cached data can outlive an offer; never show one that has ended.
  const offers = useMemo(
    () => (query.data ?? []).filter((o) => isOfferLive(o.ends_at)),
    [query.data]
  );

  return {
    offers,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
