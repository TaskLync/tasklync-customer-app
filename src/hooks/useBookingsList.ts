import { useState, useEffect, useCallback } from 'react';
import { BookingDetails, BookingStatus } from '../types/booking.types';
import { bookingApi, isGenericWorkerName } from '../services/api/booking.api';
import { workerApi } from '../services/api/worker.api';
import { formatCategoryName } from '../utils/formatters';

export type TabType = 'ACTIVE' | 'PAST' | 'CANCELLED';

const ACTIVE_STATUSES: BookingStatus[] = ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED_BY_WORKER'];
const PAST_STATUSES: BookingStatus[] = ['COMPLETED', 'AUTO_COMPLETED', 'RESOLVED', 'REFUNDED'];
const CANCELLED_STATUSES: BookingStatus[] = ['CANCELLED', 'REJECTED', 'DISPUTED'];

// In-memory worker profile cache across list renders
const workerProfileCache = new Map<string, { name: string; avatarUrl?: string | null | undefined }>();

export function useBookingsList(activeTab: TabType) {
  const [allBookings, setAllBookings] = useState<BookingDetails[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      // Fetch real customer bookings from backend API / persistent cache
      const response = await bookingApi.listBookings({ page: 1, limit: 50 });
      const rawData = response?.data || [];
      const bookingsList = (Array.isArray(rawData) ? rawData : []).filter(
        (b) => b && b.id && typeof b.id === 'string' && !b.id.startsWith('b-') && !b.id.startsWith('TL-')
      );

      // Initial pass: ensure category names and worker names are formatted
      const normalizedBookings: BookingDetails[] = bookingsList.map((b) => {
        const cached = workerProfileCache.get(b.worker_id);
        const resolvedName = (b.worker_name && !isGenericWorkerName(b.worker_name) ? b.worker_name : cached?.name) || b.worker_name;
        const resolvedAvatar = b.worker_avatar_url || cached?.avatarUrl || undefined;

        return {
          ...b,
          category_name: b.category_name || formatCategoryName(b.category_id, 'Service', 'title'),
          worker_name: resolvedName,
          worker_avatar_url: resolvedAvatar,
        };
      });

      setAllBookings(normalizedBookings);

      // Secondary pass: Asynchronously enrich any missing or generic worker names from worker service
      const missingWorkers = normalizedBookings.filter(
        (b) => (!b.worker_name || isGenericWorkerName(b.worker_name) || !b.worker_avatar_url) && b.worker_id && b.worker_id.includes('-')
      );

      if (missingWorkers.length > 0) {
        Promise.allSettled(
          missingWorkers.map(async (b) => {
            if (workerProfileCache.has(b.worker_id)) {
              return { workerId: b.worker_id, profile: workerProfileCache.get(b.worker_id)! };
            }
            try {
              const profile = await workerApi.getWorkerProfile(b.worker_id);
              if (profile?.name && !isGenericWorkerName(profile.name)) {
                const info = { name: profile.name, avatarUrl: profile.avatarUrl };
                workerProfileCache.set(b.worker_id, info);
                return { workerId: b.worker_id, profile: info };
              }
            } catch {
              // Ignore network failures for background profile lookup
            }
            return null;
          })
        ).then((results) => {
          let hasUpdates = false;
          const updatedBookings: BookingDetails[] = normalizedBookings.map((b) => {
            if (b.worker_id && workerProfileCache.has(b.worker_id)) {
              const cached = workerProfileCache.get(b.worker_id)!;
              if (b.worker_name !== cached.name || (!b.worker_avatar_url && cached.avatarUrl)) {
                hasUpdates = true;
                return {
                  ...b,
                  worker_name: cached.name,
                  worker_avatar_url: (b.worker_avatar_url || cached.avatarUrl) || undefined,
                };
              }
            }
            return b;
          });

          if (hasUpdates) {
            setAllBookings(updatedBookings);
          }
        });
      }
    } catch (_err) {
      setIsError(true);
      setAllBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Filter bookings strictly based on real status groups
  const filteredBookings = allBookings.filter((b) => {
    if (activeTab === 'ACTIVE') {
      return ACTIVE_STATUSES.includes(b.status);
    }
    if (activeTab === 'PAST') {
      return PAST_STATUSES.includes(b.status);
    }
    if (activeTab === 'CANCELLED') {
      return CANCELLED_STATUSES.includes(b.status);
    }
    return false;
  });

  return {
    bookings: filteredBookings,
    isLoading,
    isError,
    refetch: fetchBookings,
  };
}
