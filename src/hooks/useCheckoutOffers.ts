import { useQuery } from '@tanstack/react-query';
import { offersApi } from '../services/api/offers.api';
import { quoteParamsHash } from '../utils/offers';
import type { BookingQuoteParams } from '../types/offers.types';

/**
 * The authoritative checkout price for THIS customer and the coupons they can use, from one request.
 *
 * - Keyed by the booking parameters (worker, services + quantities, time, place, urgency): any change
 *   refetches, anything else reuses the cache, so applying/removing a coupon makes no extra request.
 * - The returned pricing already includes the worker's automatic offer, so it is also the price to show
 *   after a coupon is removed (the server computed it; the app never does).
 */
export function useCheckoutOffers(params: BookingQuoteParams | null, enabled: boolean = true) {
  const hash = params ? quoteParamsHash(params) : null;

  const query = useQuery({
    queryKey: ['checkout-offers', hash],
    queryFn: ({ signal }) => offersApi.getCheckoutOffers(params as BookingQuoteParams, signal),
    enabled: enabled && params !== null,
    staleTime: 30_000,
    retry: 1,
  });

  return {
    offers: query.data,
    isLoading: query.isLoading,
    /** True while refetching for changed booking parameters (the shown price may be stale). */
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
  };
}
