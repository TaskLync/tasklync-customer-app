import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../services/api/notification.api';
import { useNotificationStore } from '../store/notification.store';
import { useAuthStore } from '../store/auth.store';

export const UNREAD_COUNT_QUERY_KEY = ['notifications', 'unread-count'] as const;

/**
 * useUnreadCount Hook
 *
 * Provides isolated, lightweight subscription to unread notification count.
 * Synchronizes TanStack Query cache with Zustand store for instant, flicker-free badge updates.
 */
export function useUnreadCount() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const storeUnreadCount = useNotificationStore((s) => s.unreadCount);
  const setStoreUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const decrementStoreUnread = useNotificationStore((s) => s.decrementUnread);
  const clearStoreUnread = useNotificationStore((s) => s.clearUnread);

  const query = useQuery({
    queryKey: UNREAD_COUNT_QUERY_KEY,
    queryFn: async () => {
      const count = await notificationApi.getUnreadCount();
      return count;
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
  });

  // Keep Zustand store in sync when query resolves with fresh data
  useEffect(() => {
    if (query.data !== undefined && typeof query.data === 'number') {
      setStoreUnreadCount(query.data);
    }
  }, [query.data, setStoreUnreadCount]);

  // Derived effective count: prefers store count if populated
  const unreadCount =
    typeof storeUnreadCount === 'number'
      ? storeUnreadCount
      : (query.data ?? 0);

  const setCount = (count: number) => {
    const validCount = Math.max(0, count);
    setStoreUnreadCount(validCount);
    queryClient.setQueryData<number>(UNREAD_COUNT_QUERY_KEY, validCount);
  };

  const decrement = () => {
    decrementStoreUnread();
    queryClient.setQueryData<number>(UNREAD_COUNT_QUERY_KEY, (old = 1) =>
      Math.max(0, old - 1)
    );
  };

  const clear = () => {
    clearStoreUnread();
    queryClient.setQueryData<number>(UNREAD_COUNT_QUERY_KEY, 0);
  };

  const invalidate = () => {
    return queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
  };

  return {
    unreadCount,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    setCount,
    decrement,
    clear,
    invalidate,
  };
}
