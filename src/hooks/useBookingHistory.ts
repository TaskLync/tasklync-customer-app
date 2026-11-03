import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api/client';
import { BookingHistoryItem } from '../components/booking/BookingHistoryCard';
import { getPersistedBookings } from '../services/api/booking.api';

export interface BookingHistoryPage {
  bookings: BookingHistoryItem[];
  nextCursor?: string | null;
  hasMore: boolean;
  totalCount: number;
}

export function useBookingHistory(year: number | 'all' = 'all', category: string | 'all' = 'all') {
  return useInfiniteQuery<BookingHistoryPage>({
    queryKey: ['booking-history', { year, category }],
    queryFn: async ({ pageParam }): Promise<BookingHistoryPage> => {
      try {
        const response = await apiClient.get<any>('/bookings/history', {
          params: {
            cursor: pageParam || undefined,
            year: year !== 'all' ? year : undefined,
            category: category !== 'all' ? category : undefined,
            limit: 20,
          },
        });

        const data = response.data?.data || response.data;
        if (data && Array.isArray(data.bookings)) {
          const validBookings = data.bookings.filter(
            (b: any) => b && b.id && !b.id.startsWith('b-') && !b.id.startsWith('TL-')
          );
          return {
            bookings: validBookings,
            nextCursor: data.next_cursor || null,
            hasMore: Boolean(data.has_more),
            totalCount: data.total_count || validBookings.length,
          };
        }
      } catch (_err) {
        // Fallback to real persisted bookings only
      }

      // Offline / fallback: Real completed/past bookings from persistent storage only
      const persisted = getPersistedBookings().filter(
        (b) => b.status === 'COMPLETED' || b.status === 'CANCELLED' || b.status === 'RESOLVED'
      );

      let filtered: BookingHistoryItem[] = persisted.map((b) => ({
        id: b.id,
        booking_number: `TL-${b.id.slice(-6).toUpperCase()}`,
        worker_id: b.worker_id,
        worker_name: (b.is_company || b.provider_type === 'COMPANY')
          ? (b.provider_name || b.worker_name || 'Verified Agency')
          : (b.worker_name || 'Assigned Professional'),
        category: b.category_name || b.category_id,
        service_title: b.description || 'Service Appointment',
        status: b.status as any,
        total_amount: b.estimated_total,
        created_at: b.created_at,
      }));

      if (year !== 'all') {
        filtered = filtered.filter((b) => {
          const bYear = new Date(b.created_at).getFullYear();
          return bYear === year;
        });
      }
      if (category !== 'all') {
        filtered = filtered.filter((b) =>
          b.category.toLowerCase().includes(category.toLowerCase())
        );
      }

      return {
        bookings: filtered,
        nextCursor: null,
        hasMore: false,
        totalCount: filtered.length,
      };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}
