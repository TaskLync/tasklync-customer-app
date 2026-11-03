import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ConversationItem, ConversationFilterTab } from '../types/chat.types';
import { chatApi, getCachedChatMessages } from '../services/api/chat.api';
import { bookingApi, getPersistedBookings } from '../services/api/booking.api';
import { workerApi } from '../services/api/worker.api';
import { useChatUnreadStore } from '../store/chatUnread.store';
import { useAuthStore } from '../store/auth.store';
import { socketService } from '../services/socket/socket.service';
import {
  buildDeduplicatedConversations,
  mergeIncomingMessageIntoConversations,
  deduplicateConversationList,
  WorkerProfileCacheItem,
} from '../utils/conversationDeduplication';
import { createMMKV } from 'react-native-mmkv';

const convStorage = createMMKV({ id: 'tasklync_conversations_state' });
const READ_OVERRIDES_KEY = 'conv_read_overrides';

// In-memory worker profile cache to prevent duplicate network calls
const workerProfileMemoryCache = new Map<string, WorkerProfileCacheItem>();

function getReadOverrides(): Record<string, boolean> {
  try {
    const raw = convStorage.getString(READ_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveReadOverride(identifier: string): void {
  try {
    const existing = getReadOverrides();
    existing[identifier] = true;
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

  const isMountedRef = useRef<boolean>(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchAllConversations = useCallback(
    async (isPullToRefresh = false) => {
      if (isPullToRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        // 1. Fetch real rooms where messages exist, and user's bookings for metadata enrichment
        const [roomsResult, bookingsResult] = await Promise.allSettled([
          chatApi.listRooms(),
          bookingApi.listBookings({ page: 1, limit: 50 }),
        ]);

        const realRooms = roomsResult.status === 'fulfilled' ? roomsResult.value || [] : [];
        const realBookingsResponse =
          bookingsResult.status === 'fulfilled' ? bookingsResult.value?.data || [] : [];

        // 2. Aggregate confirmed local & server bookings strictly as a metadata lookup list
        const persistedBookings = getPersistedBookings();
        const allBookings = [
          ...persistedBookings,
          ...(Array.isArray(realBookingsResponse) ? realBookingsResponse : []),
        ];

        // 3. Build canonical deduplicated conversations (one row per customer-worker pair)
        const unreadStoreMap = useChatUnreadStore.getState().unreadByBooking;
        const items = buildDeduplicatedConversations({
          rooms: realRooms,
          bookings: allBookings,
          getCachedMessages: getCachedChatMessages,
          readOverrides,
          unreadStoreMap,
          workerProfileCache: workerProfileMemoryCache,
        });

        // 4. Enrich any missing worker profiles asynchronously
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
                  const cached: WorkerProfileCacheItem = {
                    name: profile.name,
                    avatarUrl: profile.avatarUrl || (profile as any).avatar_url,
                    phone:
                      (profile as any).phone ||
                      (profile as any).phone_number ||
                      (profile as any).phoneNumber,
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
          ).then((_results) => {
            if (!isMountedRef.current) return;
            let hasEnrichmentUpdates = false;
            setConversations((prev) => {
              const updated = prev.map((c) => {
                if (c.workerId && workerProfileMemoryCache.has(c.workerId)) {
                  const info = workerProfileMemoryCache.get(c.workerId)!;
                  if (!c.workerAvatarUrl && info.avatarUrl) {
                    hasEnrichmentUpdates = true;
                    return {
                      ...c,
                      workerName:
                        c.workerName === 'Assigned Professional' ? info.name : c.workerName,
                      workerAvatarUrl: info.avatarUrl,
                      workerPhone: c.workerPhone || info.phone || undefined,
                    };
                  }
                }
                return c;
              });
              return hasEnrichmentUpdates ? deduplicateConversationList(updated) : prev;
            });
          });
        }

        // 5. Synchronize unread store with valid conversation unread counts
        const validUnreads: Record<string, number> = {};
        for (const it of items) {
          if (it.unreadCount > 0) {
            validUnreads[it.bookingId] = it.unreadCount;
            if (it.roomId) {
              validUnreads[it.roomId] = it.unreadCount;
            }
          }
        }
        useChatUnreadStore.getState().syncUnreads(validUnreads);

        if (isMountedRef.current) {
          setConversations(items);
        }
      } catch {
        if (isMountedRef.current) {
          setConversations([]);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [readOverrides]
  );

  useEffect(() => {
    fetchAllConversations();
  }, [fetchAllConversations]);

  // Real-time socket message reception with deduplication guarantee
  useEffect(() => {
    const handleIncoming = (data: any) => {
      const currentUserId = useAuthStore.getState().user?.id;
      setConversations((prev) => {
        const { updated, found } = mergeIncomingMessageIntoConversations(
          prev,
          data,
          currentUserId
        );
        if (found) {
          return updated;
        } else {
          // If conversation wasn't found in current state, refetch to discover new thread
          fetchAllConversations(false);
          return prev;
        }
      });
    };

    const unsub1 = socketService.on('message_received', handleIncoming);
    const unsub2 = socketService.on('chat:message_received', handleIncoming);
    const unsub3 = socketService.on('new_message', handleIncoming);

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [fetchAllConversations]);

  // Mark conversation as read in local storage, store, and state
  const markAsRead = useCallback((itemOrBookingId: string | ConversationItem) => {
    const idsToClear: string[] = [];
    let targetBookingId = '';

    if (typeof itemOrBookingId === 'string') {
      targetBookingId = itemOrBookingId;
      idsToClear.push(itemOrBookingId);
    } else {
      targetBookingId = itemOrBookingId.bookingId;
      idsToClear.push(itemOrBookingId.bookingId);
      if (itemOrBookingId.roomId) {
        idsToClear.push(itemOrBookingId.roomId);
      }
      if (itemOrBookingId.workerId) {
        idsToClear.push(itemOrBookingId.workerId);
      }
      if (itemOrBookingId.allBookingIds) {
        idsToClear.push(...itemOrBookingId.allBookingIds);
      }
    }

    idsToClear.forEach((id) => {
      saveReadOverride(id);
      useChatUnreadStore.getState().clearBookingUnread(id);
    });

    setReadOverrides((prev) => {
      const next = { ...prev };
      idsToClear.forEach((id) => {
        next[id] = true;
      });
      return next;
    });

    setConversations((prev) =>
      prev.map((c) => {
        const matches =
          (typeof itemOrBookingId !== 'string' &&
            ((c.workerId && c.workerId === itemOrBookingId.workerId) ||
              (c.roomId && c.roomId === itemOrBookingId.roomId) ||
              c.id === itemOrBookingId.id)) ||
          idsToClear.includes(c.bookingId) ||
          (c.allBookingIds && c.allBookingIds.some((id) => idsToClear.includes(id)));
        return matches ? { ...c, unreadCount: 0 } : c;
      })
    );

    if (targetBookingId) {
      chatApi.markAsRead(targetBookingId);
    }
  }, []);

  const unreadByBooking = useChatUnreadStore((s) => s.unreadByBooking);

  // Dynamically reflect live unread socket increments and guarantee newest messages stay at the very top
  const liveConversations = useMemo(() => {
    const list = conversations.map((c) => {
      const isOverriddenRead =
        Boolean(readOverrides[c.bookingId]) ||
        (c.roomId ? Boolean(readOverrides[c.roomId]) : false) ||
        (c.workerId ? Boolean(readOverrides[c.workerId]) : false) ||
        (c.allBookingIds ? c.allBookingIds.some((id) => Boolean(readOverrides[id])) : false);

      if (isOverriddenRead) {
        return c.unreadCount !== 0 ? { ...c, unreadCount: 0 } : c;
      }

      const candidateCounts = [
        unreadByBooking[c.bookingId],
        ...(c.roomId ? [unreadByBooking[c.roomId]] : []),
        ...(c.allBookingIds ? c.allBookingIds.map((id) => unreadByBooking[id]) : []),
      ].filter((n): n is number => typeof n === 'number');

      const maxLiveCount = candidateCounts.length > 0 ? Math.max(...candidateCounts) : undefined;

      if (maxLiveCount !== undefined && maxLiveCount !== c.unreadCount) {
        return { ...c, unreadCount: maxLiveCount };
      }
      return c;
    });

    return list.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
      if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;

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
          ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'ACTIVE'].includes(s) ||
          c.isOnline
        );
      });
    }

    return result;
  }, [liveConversations, searchQuery, activeTab]);

  // Total unread count across all real conversations
  const totalUnreadCount = useMemo(() => {
    return liveConversations.reduce((sum, c) => sum + (c.unreadCount > 0 ? c.unreadCount : 0), 0);
  }, [liveConversations]);

  // Synchronize global TabBar badge counter whenever unread count changes (including when 0)
  useEffect(() => {
    useChatUnreadStore.getState().setUnreadCount(totalUnreadCount);
  }, [totalUnreadCount]);

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
