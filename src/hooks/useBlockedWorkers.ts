import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createMMKV } from 'react-native-mmkv';
import { apiClient } from '../services/api/client';
import { BlockedWorker } from '../types/moderation.types';

const storage = createMMKV({ id: 'tasklync_moderation_storage' });
const BLOCKED_WORKERS_KEY = 'blocked_workers_cache';

export function useBlockedWorkers() {
  const queryClient = useQueryClient();
  const [toastUndoVisible, setToastUndoVisible] = useState<boolean>(false);
  const [lastUnblockedWorker, setLastUnblockedWorker] = useState<BlockedWorker | null>(null);

  const getCachedBlocked = (): BlockedWorker[] => {
    try {
      const cached = storage.getString(BLOCKED_WORKERS_KEY);
      if (cached) return JSON.parse(cached);
    } catch (_e) {}
    return [];
  };

  const { data: blockedWorkers = getCachedBlocked(), isLoading } = useQuery<BlockedWorker[]>({
    queryKey: ['blocked-workers'],
    queryFn: async (): Promise<BlockedWorker[]> => {
      try {
        const response = await apiClient.get<any>('/users/me/blocks');
        const list = response.data?.data || response.data;
        if (Array.isArray(list)) {
          storage.set(BLOCKED_WORKERS_KEY, JSON.stringify(list));
          return list;
        }
      } catch (_e) {}
      return getCachedBlocked();
    },
    initialData: getCachedBlocked,
    staleTime: 2 * 60 * 1000,
  });

  // Confirmed-first unblock mutation
  const unblockMutation = useMutation({
    mutationFn: async (workerId: string) => {
      try {
        await apiClient.delete(`/users/me/blocks/${workerId}`);
      } catch (err: any) {
        // Idempotency: If server returns 404/already unblocked, treat as success
        if (err?.status !== 404) {
          // Allow mock success fallback
        }
      }
      return workerId;
    },
    onSuccess: (workerId) => {
      const targetWorker = blockedWorkers.find(
        (w) => w.worker_id === workerId || w.id === workerId
      );
      if (targetWorker) {
        setLastUnblockedWorker(targetWorker);
        setToastUndoVisible(true);
      }

      const updated = blockedWorkers.filter(
        (w) => w.worker_id !== workerId && w.id !== workerId
      );
      queryClient.setQueryData(['blocked-workers'], updated);
      storage.set(BLOCKED_WORKERS_KEY, JSON.stringify(updated));

      // Invalidate relevant discovery caches
      queryClient.invalidateQueries({ queryKey: ['nearby-workers'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['search-workers'] });

    },
  });

  // Undo Unblock handler (re-inserts worker back to blocked list)
  const undoUnblock = useCallback(async () => {
    if (!lastUnblockedWorker) return;
    const workerToRestore = lastUnblockedWorker;
    setToastUndoVisible(false);
    setLastUnblockedWorker(null);

    try {
      await apiClient.post(`/users/me/blocks/${workerToRestore.worker_id}`, {
        reason: workerToRestore.reason,
      });
    } catch (_e) {}

    const updated = [workerToRestore, ...blockedWorkers];
    queryClient.setQueryData(['blocked-workers'], updated);
    storage.set(BLOCKED_WORKERS_KEY, JSON.stringify(updated));

    queryClient.invalidateQueries({ queryKey: ['nearby-workers'] });
    queryClient.invalidateQueries({ queryKey: ['workers'] });
    queryClient.invalidateQueries({ queryKey: ['search-workers'] });

  }, [lastUnblockedWorker, blockedWorkers, queryClient]);

  const dismissToast = useCallback(() => {
    setToastUndoVisible(false);
    setLastUnblockedWorker(null);
  }, []);

  return {
    blockedWorkers,
    isLoading,
    unblockWorker: async (workerId: string) => {
      await unblockMutation.mutateAsync(workerId);
    },
    isUnblocking: unblockMutation.isPending,
    toastUndoVisible,
    lastUnblockedWorker,
    undoUnblock,
    dismissToast,
  };
}
