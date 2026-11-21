import { useState, useMemo, useCallback } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  InfiniteData,
} from '@tanstack/react-query';
import { notificationApi } from '../services/api/notification.api';
import {
  NotificationItem,
  NotificationFeedResponse,
  NotificationFilter,
} from '../types/notification.types';
import { groupNotificationsByDate } from '../utils/groupByDate';
import { useNotificationStore } from '../store/notification.store';
import { UNREAD_COUNT_QUERY_KEY } from './useUnreadCount';
import { showAlert } from '../components/feedback/AppAlert';

export const NOTIFICATIONS_QUERY_KEY = 'notifications';

export function useNotifications() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const decrementUnread = useNotificationStore((s) => s.decrementUnread);
  const clearUnread = useNotificationStore((s) => s.clearUnread);

  const isUnreadOnly = activeFilter === 'unread';

  // 1. Paginated Infinite Query
  const query = useInfiniteQuery<
    NotificationFeedResponse,
    Error,
    InfiniteData<NotificationFeedResponse>,
    [string, { filter: NotificationFilter }],
    string | null
  >({
    queryKey: [NOTIFICATIONS_QUERY_KEY, { filter: activeFilter }],
    queryFn: async ({ pageParam = null }) => {
      const res = await notificationApi.getNotifications(pageParam, 20, isUnreadOnly);

      // Hydrate unread count from Page 1 meta if present
      if (pageParam === null && typeof res.meta?.unread_count === 'number') {
        setUnreadCount(res.meta.unread_count);
        queryClient.setQueryData(UNREAD_COUNT_QUERY_KEY, res.meta.unread_count);
      }

      return res;
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => {
      if (lastPage.meta?.has_more && lastPage.meta?.next_cursor) {
        return lastPage.meta.next_cursor;
      }
      return null;
    },
    staleTime: 30_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
  });

  // 2. Flattened items from all cached pages
  const allItems = useMemo<NotificationItem[]>(() => {
    if (!query.data?.pages) return [];
    const flattened: NotificationItem[] = [];
    const seenIds = new Set<string>();

    for (const page of query.data.pages) {
      if (Array.isArray(page?.data)) {
        for (const item of page.data) {
          if (item && !seenIds.has(item.id)) {
            seenIds.add(item.id);
            flattened.push(item);
          }
        }
      }
    }
    return flattened;
  }, [query.data?.pages]);

  // 3. Grouped list with section header markers + sticky indices
  const { groupedItems, stickyHeaderIndices } = useMemo(() => {
    return groupNotificationsByDate(allItems);
  }, [allItems]);

  // 4. Manual pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        query.refetch(),
        queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [query, queryClient]);

  // 5. Mutation: Mark Single Notification Read (Optimistic with Rollback)
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const success = await notificationApi.markRead(id);
      if (!success) {
        throw new Error('Failed to mark notification as read');
      }
      return { id };
    },
    onMutate: async (id: string) => {
      // Cancel ongoing queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY] });

      // Snapshot previous infinite query cache across all filter variations
      const previousDataMap = new Map<string, InfiniteData<NotificationFeedResponse> | undefined>();
      const queryFilterKeys = [
        [NOTIFICATIONS_QUERY_KEY, { filter: 'all' as const }],
        [NOTIFICATIONS_QUERY_KEY, { filter: 'unread' as const }],
      ];

      for (const qk of queryFilterKeys) {
        const snap = queryClient.getQueryData<InfiniteData<NotificationFeedResponse>>(qk);
        previousDataMap.set(JSON.stringify(qk), snap);
      }

      const prevUnreadCount = useNotificationStore.getState().unreadCount;

      // 1. Optimistically update all matching queries in cache
      queryClient.setQueriesData<InfiniteData<NotificationFeedResponse>>(
        { queryKey: [NOTIFICATIONS_QUERY_KEY] },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              data: page.data.map((item) =>
                item.id === id ? { ...item, is_read: true } : item
              ),
            })),
          };
        }
      );

      // 2. Decrement unread counter optimistically
      decrementUnread();
      queryClient.setQueryData<number>(UNREAD_COUNT_QUERY_KEY, (old = 1) =>
        Math.max(0, old - 1)
      );

      return { previousDataMap, prevUnreadCount };
    },
    onError: (_err, _id, context) => {
      // Rollback cache to previous state on error
      if (context?.previousDataMap) {
        context.previousDataMap.forEach((data, keyStr) => {
          try {
            const queryKey = JSON.parse(keyStr);
            queryClient.setQueryData(queryKey, data);
          } catch {}
        });
      }
      if (context?.prevUnreadCount !== undefined) {
        setUnreadCount(context.prevUnreadCount);
        queryClient.setQueryData(UNREAD_COUNT_QUERY_KEY, context.prevUnreadCount);
      }
    },
    onSettled: () => {
      // Reconcile unread count
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
    },
  });

  // 6. Mutation: Mark All As Read. Confirm-first (not optimistic): the list and the unread count only change
  //    once the server has actually marked everything read; the header shows progress meanwhile.
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const count = await notificationApi.markAllRead();
      return count;
    },
    onSuccess: async () => {
      await queryClient.cancelQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY] });

      queryClient.setQueriesData<InfiniteData<NotificationFeedResponse>>(
        { queryKey: [NOTIFICATIONS_QUERY_KEY] },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              data: page.data.map((item) => ({ ...item, is_read: true })),
            })),
          };
        }
      );

      // Server confirmed: everything is read now.
      clearUnread();
      queryClient.setQueryData<number>(UNREAD_COUNT_QUERY_KEY, 0);
    },
    onError: () => {
      // Nothing was changed locally, so there is nothing to roll back; just tell the user.
      showAlert("Couldn't mark all as read", 'Please check your connection and try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
    },
  });

  // 7. Mutation: Delete Notification (Optimistic with Rollback)
  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const success = await notificationApi.deleteNotification(id);
      return { id, success };
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY] });

      const prevUnreadCount = useNotificationStore.getState().unreadCount;
      const targetItem = allItems.find((i) => i.id === id);
      const wasUnread = targetItem ? !targetItem.is_read : false;

      // Capture previous data for rollback
      const previousData = queryClient.getQueryData<InfiniteData<NotificationFeedResponse>>([
        NOTIFICATIONS_QUERY_KEY,
        { filter: activeFilter },
      ]);

      // Optimistically remove item from current query cache
      queryClient.setQueryData<InfiniteData<NotificationFeedResponse>>(
        [NOTIFICATIONS_QUERY_KEY, { filter: activeFilter }],
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              data: page.data.filter((item) => item.id !== id),
            })),
          };
        }
      );

      // Decrement unread count if deleted item was unread
      if (wasUnread) {
        decrementUnread();
        queryClient.setQueryData<number>(UNREAD_COUNT_QUERY_KEY, (old = 1) =>
          Math.max(0, old - 1)
        );
      }

      return { previousData, prevUnreadCount };
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          [NOTIFICATIONS_QUERY_KEY, { filter: activeFilter }],
          context.previousData
        );
      }
      if (context?.prevUnreadCount !== undefined) {
        setUnreadCount(context.prevUnreadCount);
        queryClient.setQueryData(UNREAD_COUNT_QUERY_KEY, context.prevUnreadCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
    },
  });

  const markRead = useCallback(
    (id: string) => {
      markReadMutation.mutate(id);
    },
    [markReadMutation]
  );

  const markAllRead = useCallback(() => {
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  const deleteNotification = useCallback(
    (id: string) => {
      deleteNotificationMutation.mutate(id);
    },
    [deleteNotificationMutation]
  );

  return {
    items: allItems,
    groupedList: groupedItems,
    stickyHeaderIndices,
    unreadCount,
    activeFilter,
    setActiveFilter,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    isError: query.isError,
    error: query.error,
    isRefreshing,
    hasNextPage: !!query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: handleRefresh,
    markRead,
    markAllRead,
    isMarkingAllRead: markAllReadMutation.isPending,
    deleteNotification,
  };
}
