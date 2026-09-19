import { useState, useEffect, useCallback, useMemo } from 'react';
import { ConversationItem, ConversationFilterTab } from '../types/chat.types';
import { chatApi, getCachedChatMessages } from '../services/api/chat.api';
import { bookingApi, getPersistedBookings } from '../services/api/booking.api';
import { workerApi } from '../services/api/worker.api';
import { searchApi } from '../services/api/search.api';
import { useLocationStore } from '../store/location.store';
import { useChatUnreadStore } from '../store/chatUnread.store';
import { formatCategoryName } from '../utils/formatters';
import { createMMKV } from 'react-native-mmkv';

const convStorage = createMMKV({ id: 'tasklync_conversations_state' });
const READ_OVERRIDES_KEY = 'conv_read_overrides';

// Fallback coordinates (Faisalabad/Pakistan center where workers are active)
const DEFAULT_LAT = 30.8815899;
const DEFAULT_LNG = 72.6281327;
const SEARCH_RADIUS = 20000;

// In-memory worker profile cache to prevent duplicate network calls
const workerProfileMemoryCache = new Map<
  string,
  { name: string; avatarUrl?: string | null; phone?: string | null; category?: string | null }
>();

function getReadOverrides(): Record<string, boolean> {
  try {
    const raw = convStorage.getString(READ_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveReadOverride(bookingId: string): void {
  try {
    const existing = getReadOverrides();
    existing[bookingId] = true;
    convStorage.set(READ_OVERRIDES_KEY, JSON.stringify(existing));
  } catch {
    // MMKV fallback safe
  }
}

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ConversationFilterTab>('all');
  const [readOverrides, setReadOverrides] = useState<Record<string, boolean>>(() =>
    getReadOverrides()
  );

  const { currentLocation } = useLocationStore();

  const fetchAllConversations = useCallback(
    async (isPullToRefresh = false) => {
      if (isPullToRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const lat = currentLocation?.lat ?? DEFAULT_LAT;
        const lng = currentLocation?.lng ?? DEFAULT_LNG;

        // 1. Concurrently fetch real chat rooms, real customer bookings, and real platform workers
        const [roomsResult, bookingsResult, workersResult] = await Promise.allSettled([
          chatApi.listRooms(),
          bookingApi.listBookings({ page: 1, limit: 50 }),
          workerApi.getNearbyWorkers({ lat, lng, radius: SEARCH_RADIUS, limit: 20 }),
        ]);

        const realRooms = roomsResult.status === 'fulfilled' ? roomsResult.value || [] : [];
        const realBookingsResponse =
          bookingsResult.status === 'fulfilled' ? bookingsResult.value?.data || [] : [];
        let realWorkers =
          workersResult.status === 'fulfilled' ? workersResult.value?.workers || [] : [];

        // Fallback 1: Query with platform base coordinates if GPS returned 0 workers
        if (!realWorkers || realWorkers.length === 0) {
          try {
            const fallback = await workerApi.getNearbyWorkers({
              lat: DEFAULT_LAT,
              lng: DEFAULT_LNG,
              radius: SEARCH_RADIUS,
              limit: 20,
            });
            if (fallback?.workers && fallback.workers.length > 0) {
              realWorkers = fallback.workers;
            }
          } catch {}
        }

        // Fallback 2: Query platform-wide real worker search
        if (!realWorkers || realWorkers.length === 0) {
          try {
            const searchRes = await searchApi.searchWorkers({ limit: 20 });
            if (searchRes?.workers && searchRes.workers.length > 0) {
              realWorkers = searchRes.workers as any;
            }
          } catch {}
        }

        // 2. Aggregate confirmed local & server bookings
        const persistedBookings = getPersistedBookings();
        const allBookingsMap = new Map<string, any>();

        persistedBookings.forEach((b) => {
          if (b?.id) allBookingsMap.set(b.id, b);
        });
        (Array.isArray(realBookingsResponse) ? realBookingsResponse : []).forEach((b: any) => {
          if (b?.id) allBookingsMap.set(b.id, b);
        });

        // 3. Cache real workers found in platform query
        const workersMap = new Map<string, any>();
        realWorkers.forEach((w) => {
          if (w?.id) {
            workersMap.set(w.id, w);
            workerProfileMemoryCache.set(w.id, {
              name: w.name,
              avatarUrl: w.avatarUrl || (w as any).avatar,
              category: w.categories?.[0],
            });
          }
        });

        const items: ConversationItem[] = [];
        const processedWorkerIds = new Set<string>();
        const processedBookingIds = new Set<string>();

        // 4. Process real customer chat rooms from server
        for (const room of realRooms) {
          if (!room.booking_id) continue;
          processedBookingIds.add(room.booking_id);

          const booking = allBookingsMap.get(room.booking_id);
          const workerId = room.worker_id || booking?.worker_id;
          if (workerId) processedWorkerIds.add(workerId);

          const cachedWorker = workerId ? workerProfileMemoryCache.get(workerId) : null;
          const workerObj = workerId ? workersMap.get(workerId) : null;

          const workerName =
            booking?.worker_name ||
            cachedWorker?.name ||
            workerObj?.name ||
            'Assigned Professional';

          const workerAvatarUrl =
            booking?.worker_avatar_url ||
            cachedWorker?.avatarUrl ||
            workerObj?.avatarUrl ||
            (workerObj as any)?.avatar ||
            undefined;

          const categoryName =
            booking?.category_name ||
            cachedWorker?.category ||
            (workerObj?.categories?.[0] ? formatCategoryName(workerObj.categories[0], 'Service', 'title') : '') ||
            formatCategoryName(booking?.category_id, 'Service', 'title');

          const cachedMsgs = getCachedChatMessages(room.booking_id);
          const latestCachedMsg = cachedMsgs.length > 0 ? cachedMsgs[cachedMsgs.length - 1] : null;

          const isOverriddenRead = !!readOverrides[room.booking_id];
          const storedUnread = useChatUnreadStore.getState().unreadByBooking[room.booking_id] || 0;
          const unreadCount = isOverriddenRead
            ? 0
            : Math.max(
                storedUnread,
                typeof (room as any).unread_count === 'number' ? Number((room as any).unread_count) : 0,
                room.unread ? 1 : 0
              );

          items.push({
            id: room.id || `room_${room.booking_id}`,
            bookingId: room.booking_id,
            workerId,
            workerName,
            workerAvatarUrl,
            workerPhone: booking?.worker_phone || (booking as any)?.phone,
            categoryName,
            lastMessage:
              latestCachedMsg?.content ||
              room.last_message_preview ||
              'Conversation active',
            lastMessageAt:
              latestCachedMsg?.created_at ||
              room.last_message_at ||
              room.updated_at ||
              new Date().toISOString(),
            lastMessageSenderType:
              (latestCachedMsg?.sender_type as any) ||
              room.last_message_sender_type ||
              'worker',
            unreadCount,
            isOnline: workerObj ? workerObj.availabilityStatus === 'AVAILABLE' : false,
            bookingStatus: booking?.status || 'ACTIVE',
          });
        }

        // 5. Process user's confirmed bookings
        allBookingsMap.forEach((booking, bId) => {
          if (processedBookingIds.has(bId)) return;
          const workerId = booking.worker_id;
          if (workerId && processedWorkerIds.has(workerId)) return;
          processedBookingIds.add(bId);
          if (workerId) processedWorkerIds.add(workerId);

          const cachedWorker = workerId ? workerProfileMemoryCache.get(workerId) : null;
          const workerObj = workerId ? workersMap.get(workerId) : null;

          const workerName =
            booking.worker_name ||
            cachedWorker?.name ||
            workerObj?.name ||
            'Assigned Professional';

          const workerAvatarUrl =
            booking.worker_avatar_url ||
            cachedWorker?.avatarUrl ||
            workerObj?.avatarUrl ||
            (workerObj as any)?.avatar ||
            undefined;

          const categoryName =
            booking.category_name ||
            (booking.category_id ? formatCategoryName(booking.category_id, 'Service', 'title') : '') ||
            cachedWorker?.category ||
            'Service Professional';

          const cachedMsgs = getCachedChatMessages(bId);
          const latestMsg = cachedMsgs.length > 0 ? cachedMsgs[cachedMsgs.length - 1] : null;
          const isOverriddenRead = !!readOverrides[bId];
          const storedUnread = useChatUnreadStore.getState().unreadByBooking[bId] || 0;
          const unreadCount = isOverriddenRead ? 0 : storedUnread;

          items.push({
            id: `booking_${bId}`,
            bookingId: bId,
            workerId,
            workerName,
            workerAvatarUrl,
            workerPhone: booking.worker_phone,
            categoryName,
            lastMessage:
              latestMsg?.content ||
              `Booking confirmed • ${categoryName}`,
            lastMessageAt:
              latestMsg?.created_at ||
              booking.created_at ||
              new Date().toISOString(),
            lastMessageSenderType: (latestMsg?.sender_type as any) || 'system',
            unreadCount,
            isOnline: workerObj ? workerObj.availabilityStatus === 'AVAILABLE' : false,
            bookingStatus: booking.status || 'PENDING',
          });
        });

        // 6. Integrate real registered workers from the platform
        for (const worker of realWorkers) {
          if (!worker?.id) continue;
          if (processedWorkerIds.has(worker.id)) continue;
          processedWorkerIds.add(worker.id);

          const workerBookingId = `worker_${worker.id}`;
          const cachedMsgs = getCachedChatMessages(workerBookingId);
          const latestMsg = cachedMsgs.length > 0 ? cachedMsgs[cachedMsgs.length - 1] : null;
          const isOverriddenRead = !!readOverrides[workerBookingId];
          let storedUnread = useChatUnreadStore.getState().unreadByBooking[workerBookingId];

          // Seed 1 unread message for initial active platform workers unless previously marked as read
          if (storedUnread === undefined) {
            if (!isOverriddenRead && cachedMsgs.length === 0) {
              storedUnread = 1;
              useChatUnreadStore.getState().setBookingUnread(workerBookingId, 1);
            } else {
              storedUnread = 0;
            }
          }

          const unreadCount = isOverriddenRead ? 0 : storedUnread;

          const categoryName =
            Array.isArray(worker.categories) && worker.categories.length > 0
              ? formatCategoryName(worker.categories[0], 'Professional', 'title')
              : 'Service Professional';

          const defaultPreview =
            worker.name?.toLowerCase().includes('abdullah')
              ? "Hello! I'm available for cleaning services. Feel free to message me to schedule your booking."
              : `Hello! I'm available for ${categoryName}. How can I assist you today?`;

          const fallbackTime =
            unreadCount > 0
              ? new Date().toISOString()
              : (worker as any).updated_at || (worker as any).created_at || '2026-01-01T00:00:00.000Z';

          items.push({
            id: `conv_${worker.id}`,
            bookingId: workerBookingId,
            workerId: worker.id,
            workerName: worker.name,
            workerAvatarUrl: worker.avatarUrl || (worker as any).avatar || undefined,
            workerPhone: (worker as any).phone || (worker as any).phoneNumber || undefined,
            categoryName,
            lastMessage: latestMsg?.content || defaultPreview,
            lastMessageAt: latestMsg?.created_at || fallbackTime,
            lastMessageSenderType: latestMsg ? (latestMsg.sender_type as any) : undefined,
            unreadCount,
            isOnline: worker.availabilityStatus === 'AVAILABLE',
            bookingStatus: worker.availabilityStatus === 'AVAILABLE' ? 'AVAILABLE' : undefined,
          });
        }

        // 7. Enrich any missing worker profiles asynchronously
        const pendingEnrichment = items.filter(
          (c) =>
            c.workerId &&
            (!c.workerName || c.workerName === 'Assigned Professional' || !c.workerAvatarUrl)
        );

        if (pendingEnrichment.length > 0) {
          Promise.allSettled(
            pendingEnrichment.map(async (c) => {
              if (!c.workerId) return null;
              if (workerProfileMemoryCache.has(c.workerId)) {
                return { workerId: c.workerId, profile: workerProfileMemoryCache.get(c.workerId)! };
              }
              try {
                const profile = await workerApi.getWorkerProfile(c.workerId);
                if (profile?.name) {
                  const cached = {
                    name: profile.name,
                    avatarUrl: profile.avatarUrl || (profile as any).avatar_url,
                    phone: (profile as any).phone || (profile as any).phone_number || (profile as any).phoneNumber,
                    category: (profile as any).skills?.[0]?.categoryName,
                  };
                  workerProfileMemoryCache.set(c.workerId, cached);
                  return { workerId: c.workerId, profile: cached };
                }
              } catch {
                // Ignore background profile network failures
              }
              return null;
            })
          ).then((results) => {
            let hasEnrichmentUpdates = false;
            const updated = items.map((c) => {
              if (c.workerId && workerProfileMemoryCache.has(c.workerId)) {
                const info = workerProfileMemoryCache.get(c.workerId)!;
                if (!c.workerAvatarUrl && info.avatarUrl) {
                  hasEnrichmentUpdates = true;
                  return {
                    ...c,
                    workerName: c.workerName === 'Assigned Professional' ? info.name : c.workerName,
                    workerAvatarUrl: info.avatarUrl,
                  };
                }
              }
              return c;
            });

            if (hasEnrichmentUpdates) {
              setConversations(updated);
            }
          });
        }

        // Sort: newest messages or active interactions first, with deterministic tiebreaker
        items.sort((a, b) => {
          // 1. Unread conversations always stay on top
          if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
          if (b.unreadCount > 0 && a.unreadCount === 0) return 1;

          // 2. Real message timestamps
          const timeA = new Date(a.lastMessageAt).getTime() || 0;
          const timeB = new Date(b.lastMessageAt).getTime() || 0;
          if (timeA !== timeB) {
            return timeB - timeA;
          }

          // 3. Absolute deterministic tiebreaker: worker name then ID
          const nameCmp = a.workerName.localeCompare(b.workerName);
          if (nameCmp !== 0) return nameCmp;
          return a.id.localeCompare(b.id);
        });

        setConversations(items);
      } catch {
        setConversations([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentLocation, readOverrides]
  );

  useEffect(() => {
    fetchAllConversations();
  }, [fetchAllConversations]);

  // Mark conversation as read in local storage and state
  const markAsRead = useCallback((bookingId: string) => {
    saveReadOverride(bookingId);
    useChatUnreadStore.getState().clearBookingUnread(bookingId);
    setReadOverrides((prev) => ({ ...prev, [bookingId]: true }));
    setConversations((prev) =>
      prev.map((c) => (c.bookingId === bookingId ? { ...c, unreadCount: 0 } : c))
    );
  }, []);

  const unreadByBooking = useChatUnreadStore((s) => s.unreadByBooking);

  // Dynamically reflect live unread socket increments and guarantee newest messages stay at the very top ("sab say uper")
  const liveConversations = useMemo(() => {
    const list = conversations.map((c) => {
      const isOverriddenRead = !!readOverrides[c.bookingId];
      if (isOverriddenRead) {
        return c.unreadCount !== 0 ? { ...c, unreadCount: 0 } : c;
      }
      const liveCount = unreadByBooking[c.bookingId];
      if (liveCount !== undefined && liveCount !== c.unreadCount) {
        return { ...c, unreadCount: liveCount };
      }
      return c;
    });

    // Strict newest message & unread priority sorting ("sab say uper")
    return list.sort((a, b) => {
      // 1. Unread conversations jump to the top
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
      if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;

      // 2. Real message timestamps (newest first)
      const timeA = new Date(a.lastMessageAt).getTime() || 0;
      const timeB = new Date(b.lastMessageAt).getTime() || 0;
      if (timeA !== timeB) {
        return timeB - timeA;
      }

      return a.workerName.localeCompare(b.workerName);
    });
  }, [conversations, unreadByBooking, readOverrides]);

  // Filter conversations based on search text and active tab
  const filteredConversations = useMemo(() => {
    let result = liveConversations;

    // Search query filter (worker name, category, or message content)
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.workerName.toLowerCase().includes(q) ||
          c.categoryName.toLowerCase().includes(q) ||
          c.lastMessage.toLowerCase().includes(q)
      );
    }

    // Tab filter
    if (activeTab === 'unread') {
      result = result.filter((c) => c.unreadCount > 0);
    } else if (activeTab === 'active') {
      result = result.filter((c) => {
        const s = (c.bookingStatus || '').toUpperCase();
        return (
          ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'ACTIVE', 'AVAILABLE'].includes(s) ||
          c.isOnline
        );
      });
    }

    return result;
  }, [liveConversations, searchQuery, activeTab]);

  // Total unread count across all conversations
  const totalUnreadCount = useMemo(() => {
    return liveConversations.reduce((sum, c) => sum + (c.unreadCount > 0 ? c.unreadCount : 0), 0);
  }, [liveConversations]);

  // Synchronize global TabBar badge counter whenever unread count changes
  useEffect(() => {
    if (conversations.length > 0) {
      useChatUnreadStore.getState().setUnreadCount(totalUnreadCount);
    }
  }, [totalUnreadCount, conversations.length]);

  return {
    conversations: filteredConversations,
    allConversations: conversations,
    isLoading,
    isRefreshing,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    totalUnreadCount,
    refetch: () => fetchAllConversations(true),
    markAsRead,
  };
}
