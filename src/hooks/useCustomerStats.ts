import { useQuery } from '@tanstack/react-query';
import { bookingApi } from '../services/api/booking.api';
import { useAuthStore } from '../store/auth.store';

/** Query key for the signed-in customer's stats. Scoped by user id so one account never sees another's. */
export const customerStatsKey = (userId: string | undefined) => ['customer-stats', userId ?? 'anonymous'] as const;

/**
 * Completed bookings count for the signed-in customer, straight from booking-service
 * (COUNT of COMPLETED + AUTO_COMPLETED bookings). No placeholder number is ever returned:
 * `completedBookings` is undefined while loading or after an error.
 */
export function useCustomerStats() {
  const userId = useAuthStore((s) => s.user?.id);
  const isSignedIn = useAuthStore((s) => Boolean(s.accessToken));

  const query = useQuery({
    queryKey: customerStatsKey(userId),
    queryFn: () => bookingApi.getCustomerStats(),
    enabled: isSignedIn && Boolean(userId),
    staleTime: 30_000,
    retry: 1,
  });

  return {
    completedBookings: query.data?.completed_bookings,
    isLoading: query.isLoading,
    isError: query.isError && query.data === undefined,
    refetch: query.refetch,
  };
}
