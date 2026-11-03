import type { ConversationItem, SenderType, Message, ChatRoom } from '../types/chat.types.ts';
import { formatCategoryName } from './formatters.ts';

export interface WorkerProfileCacheItem {
  name: string;
  avatarUrl?: string | null;
  phone?: string | null;
  category?: string | null;
}

export interface BuildConversationsOptions {
  rooms: (ChatRoom | any)[];
  bookings: any[];
  getCachedMessages: (bookingOrRoomId: string) => Message[];
  readOverrides?: Record<string, boolean>;
  unreadStoreMap?: Record<string, number>;
  workerProfileCache?: Map<string, WorkerProfileCacheItem>;
}

/**
 * Checks whether a booking status represents an active / in-progress engagement
 */
export function isActiveBookingStatus(status?: string | null): boolean {
  if (!status) return false;
  const s = String(status).toUpperCase();
  return ['IN_PROGRESS', 'ACCEPTED', 'PENDING', 'ACTIVE'].includes(s);
}

/**
 * Ranks bookings so that:
 * 1. Active bookings (PENDING, ACCEPTED, IN_PROGRESS, ACTIVE) come first
 * 2. Newer bookings (by created_at or scheduled_at) come before older ones
 */
export function compareBookingsForPriority(a: any, b: any): number {
  const aActive = isActiveBookingStatus(a?.status);
  const bActive = isActiveBookingStatus(b?.status);

  if (aActive && !bActive) return -1;
  if (!aActive && bActive) return 1;

  const timeA = new Date(a?.created_at || a?.scheduled_at || a?.updated_at || 0).getTime();
  const timeB = new Date(b?.created_at || b?.scheduled_at || b?.updated_at || 0).getTime();
  return timeB - timeA;
}

/**
 * Groups bookings by worker_id, sorting each worker's bookings so that the
 * most relevant (active or newest) booking is at index 0.
 */
export function groupBookingsByWorker(bookings: any[]): Map<string, any[]> {
  const map = new Map<string, any[]>();
  if (!Array.isArray(bookings)) return map;

  for (const b of bookings) {
    const workerId =
      b?.worker_id ||
      b?.workerId ||
      b?.worker?.id ||
      b?.worker?._id ||
      b?.provider_id ||
      b?.assigned_worker_id;

    if (!workerId || typeof workerId !== 'string') continue;

    const existing = map.get(workerId) || [];
    existing.push(b);
    map.set(workerId, existing);
  }

  // Sort each worker's bookings by priority
  map.forEach((workerBookings) => {
    workerBookings.sort(compareBookingsForPriority);
  });

  return map;
}

/**
 * Finds the latest message across multiple message arrays and server preview metadata
 */
export function findLatestMessageMeta(
  messageArrays: Message[][],
  fallbackPreview?: string | null,
  fallbackTime?: string | null,
  fallbackSenderType?: SenderType | null
): {
  lastMessage: string;
  lastMessageAt: string;
  lastMessageSenderType: SenderType;
} {
  let newestMsg: Message | null = null;
  let newestTime = fallbackTime ? new Date(fallbackTime).getTime() : 0;

  for (const arr of messageArrays) {
    if (!Array.isArray(arr) || arr.length === 0) continue;
    for (const msg of arr) {
      if (!msg) continue;
      const msgTime = new Date(msg.created_at).getTime() || 0;
      if (msgTime >= newestTime) {
        newestTime = msgTime;
        newestMsg = msg;
      }
    }
  }

  if (newestMsg) {
    const content =
      newestMsg.content ||
      (newestMsg.type === 'image' ? 'Photo' : '') ||
      fallbackPreview ||
      '';
    return {
      lastMessage: content || 'Conversation active',
      lastMessageAt: newestMsg.created_at || fallbackTime || new Date().toISOString(),
      lastMessageSenderType: (newestMsg.sender_type as SenderType) || fallbackSenderType || 'worker',
    };
  }

  return {
    lastMessage: fallbackPreview || '',
    lastMessageAt: fallbackTime || new Date().toISOString(),
    lastMessageSenderType: (fallbackSenderType as SenderType) || 'worker',
  };
}

/**
 * Constructs a single canonical conversation item per unique customer-worker pair
 * or chat room, aggregating multiple bookings and message history.
 */
export function buildDeduplicatedConversations({
  rooms,
  bookings,
  getCachedMessages,
  readOverrides = {},
  unreadStoreMap = {},
  workerProfileCache = new Map(),
}: BuildConversationsOptions): ConversationItem[] {
  // 1. Map all bookings by ID
  const allBookingsMap = new Map<string, any>();
  if (Array.isArray(bookings)) {
    for (const b of bookings) {
      if (b?.id) allBookingsMap.set(b.id, b);
    }
  }

  // 2. Group bookings by worker_id (sorted with active/latest booking first)
  const bookingsByWorker = groupBookingsByWorker(bookings);

  // Map keyed by canonical conversation ID:
  // - If workerId is present: `worker_${workerId}`
  // - Else: `room_${roomId || bookingId}`
  const conversationMap = new Map<string, ConversationItem>();

  // 3. Process server rooms from chatApi.listRooms()
  if (Array.isArray(rooms)) {
    for (const room of rooms) {
      if (!room) continue;

      const rawRoomId = room.id || (room as any).room_id;
      const rawBookingId = room.booking_id || (room as any).bookingId;
      const associatedBooking = rawBookingId ? allBookingsMap.get(rawBookingId) : undefined;

      const workerId =
        room.counterparty_id ||
        room.worker_id ||
        (room as any).workerId ||
        associatedBooking?.worker_id;

      // Collect all bookings for this worker
      const workerBookings = workerId ? bookingsByWorker.get(workerId) || [] : [];
      const primaryBooking =
        workerBookings[0] ||
        associatedBooking ||
        (rawBookingId ? { id: rawBookingId } : undefined);

      const primaryBookingId = primaryBooking?.id || rawBookingId || rawRoomId;
      if (!primaryBookingId && !rawRoomId) continue;

      const allAssociatedBookingIds = Array.from(
        new Set(
          [
            ...(rawBookingId ? [rawBookingId] : []),
            ...workerBookings.map((b) => b.id),
          ].filter(Boolean)
        )
      );

      // Collect cached messages across room ID and all associated booking IDs
      const messageArrays: Message[][] = [];
      if (rawRoomId) {
        const roomMsgs = getCachedMessages(rawRoomId);
        if (roomMsgs.length > 0) messageArrays.push(roomMsgs);
      }
      for (const bId of allAssociatedBookingIds) {
        const bMsgs = getCachedMessages(bId);
        if (bMsgs.length > 0) messageArrays.push(bMsgs);
      }

      const meta = findLatestMessageMeta(
        messageArrays,
        room.last_message_preview,
        room.last_message_at,
        room.last_message_sender_type
      );

      // Strictly require message content or timestamp to qualify as a real conversation
      if (!meta.lastMessage && !room.last_message_at && messageArrays.length === 0) {
        continue;
      }

      const cachedWorker = workerId ? workerProfileCache.get(workerId) : null;
      const workerName =
        primaryBooking?.worker_name ||
        cachedWorker?.name ||
        'Assigned Professional';

      const workerAvatarUrl =
        primaryBooking?.worker_avatar_url ||
        cachedWorker?.avatarUrl ||
        undefined;

      const categoryName =
        primaryBooking?.category_name ||
        (primaryBooking?.category_id
          ? formatCategoryName(primaryBooking.category_id, 'Service', 'title')
          : '') ||
        cachedWorker?.category ||
        'Service Professional';

      // Unread count computation
      const isOverriddenRead =
        Boolean(readOverrides[primaryBookingId]) ||
        (rawRoomId ? Boolean(readOverrides[rawRoomId]) : false) ||
        (workerId ? Boolean(readOverrides[workerId]) : false) ||
        allAssociatedBookingIds.some((id) => Boolean(readOverrides[id]));

      let unreadCount = 0;
      if (!isOverriddenRead) {
        const storedUnreads = [
          unreadStoreMap[primaryBookingId] || 0,
          ...(rawRoomId ? [unreadStoreMap[rawRoomId] || 0] : []),
          ...allAssociatedBookingIds.map((id) => unreadStoreMap[id] || 0),
        ];
        const serverUnread =
          typeof (room as any).unread_count === 'number'
            ? Number((room as any).unread_count)
            : room.unread
            ? 1
            : 0;
        unreadCount = Math.max(serverUnread, ...storedUnreads);
      }

      // Canonical conversation key:
      // Worker ID guarantees exactly ONE row per customer-worker pair!
      const convKey = workerId ? `worker_${workerId}` : `room_${rawRoomId || primaryBookingId}`;
      const stableId = rawRoomId || (workerId ? `conv_${workerId}` : `room_${primaryBookingId}`);

      const candidateItem: ConversationItem = {
        id: stableId,
        bookingId: primaryBookingId,
        roomId: rawRoomId || undefined,
        workerId: workerId || undefined,
        workerName,
        workerAvatarUrl,
        workerPhone:
          primaryBooking?.worker_phone ||
          (primaryBooking as any)?.phone ||
          cachedWorker?.phone,
        categoryName,
        lastMessage: meta.lastMessage,
        lastMessageAt: meta.lastMessageAt,
        lastMessageSenderType: meta.lastMessageSenderType,
        unreadCount,
        isOnline: Boolean((room as any).is_online),
        bookingStatus: primaryBooking?.status || room.status || 'ACTIVE',
        allBookingIds: allAssociatedBookingIds,
      };

      if (conversationMap.has(convKey)) {
        // Merge with existing row (keep the newer message, max unread, merged booking IDs)
        const existing = conversationMap.get(convKey)!;
        const timeCand = new Date(candidateItem.lastMessageAt).getTime() || 0;
        const timeExist = new Date(existing.lastMessageAt).getTime() || 0;
        const useCandidateMessage = timeCand >= timeExist;

        const mergedBookingIds = Array.from(
          new Set([...(existing.allBookingIds || []), ...(candidateItem.allBookingIds || [])])
        );

        conversationMap.set(convKey, {
          ...existing,
          bookingId: isActiveBookingStatus(candidateItem.bookingStatus)
            ? candidateItem.bookingId
            : existing.bookingId,
          bookingStatus: isActiveBookingStatus(candidateItem.bookingStatus)
            ? candidateItem.bookingStatus
            : existing.bookingStatus,
          roomId: candidateItem.roomId || existing.roomId,
          workerName:
            existing.workerName !== 'Assigned Professional'
              ? existing.workerName
              : candidateItem.workerName,
          workerAvatarUrl: existing.workerAvatarUrl || candidateItem.workerAvatarUrl,
          workerPhone: existing.workerPhone || candidateItem.workerPhone,
          lastMessage: useCandidateMessage ? candidateItem.lastMessage : existing.lastMessage,
          lastMessageAt: useCandidateMessage ? candidateItem.lastMessageAt : existing.lastMessageAt,
          lastMessageSenderType: useCandidateMessage
            ? candidateItem.lastMessageSenderType
            : existing.lastMessageSenderType,
          unreadCount: Math.max(existing.unreadCount, candidateItem.unreadCount),
          isOnline: existing.isOnline || candidateItem.isOnline,
          allBookingIds: mergedBookingIds,
        });
      } else {
        conversationMap.set(convKey, candidateItem);
      }
    }
  }

  // 4. Process workers with local cached chat messages that might not be in server rooms
  bookingsByWorker.forEach((workerBookings, wId) => {
    const convKey = `worker_${wId}`;
    if (conversationMap.has(convKey)) {
      // Already deduplicated in map!
      return;
    }

    const allAssociatedBookingIds = workerBookings.map((b) => b.id);
    const messageArrays: Message[][] = [];

    for (const b of workerBookings) {
      const cached = getCachedMessages(b.id);
      if (cached && cached.length > 0) {
        messageArrays.push(cached);
      }
    }

    if (messageArrays.length === 0) {
      // No messages for this worker -> skip
      return;
    }

    const primaryBooking = workerBookings[0];
    const bId = primaryBooking.id;
    const cachedWorker = workerProfileCache.get(wId);

    const meta = findLatestMessageMeta(messageArrays, null, primaryBooking.created_at, 'user');
    const isOverriddenRead = allAssociatedBookingIds.some((id) => Boolean(readOverrides[id]));

    let unreadCount = 0;
    if (!isOverriddenRead) {
      const storedUnreads = allAssociatedBookingIds.map((id) => unreadStoreMap[id] || 0);
      unreadCount = Math.max(0, ...storedUnreads);
    }

    const workerName =
      primaryBooking.worker_name ||
      cachedWorker?.name ||
      'Assigned Professional';

    const workerAvatarUrl =
      primaryBooking.worker_avatar_url ||
      cachedWorker?.avatarUrl ||
      undefined;

    const categoryName =
      primaryBooking.category_name ||
      (primaryBooking.category_id
        ? formatCategoryName(primaryBooking.category_id, 'Service', 'title')
        : '') ||
      cachedWorker?.category ||
      'Service Professional';

    conversationMap.set(convKey, {
      id: `conv_${wId}`,
      bookingId: bId,
      workerId: wId,
      workerName,
      workerAvatarUrl,
      workerPhone: primaryBooking.worker_phone || cachedWorker?.phone,
      categoryName,
      lastMessage: meta.lastMessage,
      lastMessageAt: meta.lastMessageAt,
      lastMessageSenderType: meta.lastMessageSenderType,
      unreadCount,
      isOnline: false,
      bookingStatus: primaryBooking.status || 'PENDING',
      allBookingIds: allAssociatedBookingIds,
    });
  });

  // 5. Process orphaned bookings without worker_id (e.g. pending worker assignment)
  allBookingsMap.forEach((booking, bId) => {
    if (booking.worker_id) return; // Handled above in worker groups
    const convKey = `booking_${bId}`;
    if (conversationMap.has(convKey)) return;

    const cachedMsgs = getCachedMessages(bId);
    if (!cachedMsgs || cachedMsgs.length === 0) return;

    const meta = findLatestMessageMeta([cachedMsgs], null, booking.created_at, 'user');
    const isOverriddenRead = Boolean(readOverrides[bId]);
    const unreadCount = isOverriddenRead ? 0 : unreadStoreMap[bId] || 0;

    conversationMap.set(convKey, {
      id: `booking_${bId}`,
      bookingId: bId,
      workerName: 'Assigned Professional',
      categoryName: booking.category_name || 'Service Professional',
      lastMessage: meta.lastMessage,
      lastMessageAt: meta.lastMessageAt,
      lastMessageSenderType: meta.lastMessageSenderType,
      unreadCount,
      isOnline: false,
      bookingStatus: booking.status || 'PENDING',
      allBookingIds: [bId],
    });
  });

  const result = Array.from(conversationMap.values());

  // Sort: unread first, then newest message timestamps
  result.sort((a, b) => {
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (b.unreadCount > 0 && a.unreadCount === 0) return 1;

    const timeA = new Date(a.lastMessageAt).getTime() || 0;
    const timeB = new Date(b.lastMessageAt).getTime() || 0;
    if (timeA !== timeB) {
      return timeB - timeA;
    }

    const nameCmp = a.workerName.localeCompare(b.workerName);
    if (nameCmp !== 0) return nameCmp;
    return a.id.localeCompare(b.id);
  });

  return result;
}

/**
 * Merges a real-time incoming Socket.IO message into the conversations list.
 * Finds the matching conversation by roomId, workerId, primary bookingId, or
 * any associated bookingId, updating message content and unread status.
 *
 * Guarantees that incoming messages NEVER duplicate an existing conversation row.
 */
export function mergeIncomingMessageIntoConversations(
  conversations: ConversationItem[],
  data: any,
  currentUserId?: string
): { updated: ConversationItem[]; found: boolean } {
  if (!data || !Array.isArray(conversations)) {
    return { updated: conversations || [], found: false };
  }

  const msgBookingId = data?.booking_id || data?.bookingId;
  const msgRoomId = data?.room_id || data?.roomId;
  const msgSenderId = data?.sender_id || data?.senderId;
  const msgWorkerId = data?.worker_id || data?.workerId;

  if (!msgBookingId && !msgRoomId && !msgSenderId && !msgWorkerId) {
    return { updated: conversations, found: false };
  }

  const isFromOther =
    data?.sender_type === 'worker' ||
    (msgSenderId && currentUserId && msgSenderId !== currentUserId);

  const idx = conversations.findIndex((c) => {
    if (msgRoomId && (c.roomId === msgRoomId || c.id === msgRoomId)) return true;
    if (c.workerId) {
      if (msgWorkerId && c.workerId === msgWorkerId) return true;
      if (msgSenderId && isFromOther && c.workerId === msgSenderId) return true;
    }
    if (msgBookingId) {
      if (c.bookingId === msgBookingId || c.id === msgBookingId) return true;
      if (c.allBookingIds && c.allBookingIds.includes(msgBookingId)) return true;
    }
    return false;
  });

  if (idx < 0) {
    return { updated: conversations, found: false };
  }

  const target = conversations[idx];
  const newUnread = isFromOther ? target.unreadCount + 1 : target.unreadCount;
  const updatedItem: ConversationItem = {
    ...target,
    lastMessage: data.content || (data.type === 'image' ? 'Photo' : target.lastMessage),
    lastMessageAt: data.created_at || data.createdAt || new Date().toISOString(),
    lastMessageSenderType:
      data.sender_type || data.senderType || (isFromOther ? 'worker' : 'user'),
    unreadCount: newUnread,
    allBookingIds:
      msgBookingId && target.allBookingIds && !target.allBookingIds.includes(msgBookingId)
        ? [...target.allBookingIds, msgBookingId]
        : target.allBookingIds,
  };

  const next = [...conversations];
  next[idx] = updatedItem;

  // Re-sort to put the updated conversation at the top
  next.sort((a, b) => {
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (b.unreadCount > 0 && a.unreadCount === 0) return 1;

    const timeA = new Date(a.lastMessageAt).getTime() || 0;
    const timeB = new Date(b.lastMessageAt).getTime() || 0;
    if (timeA !== timeB) {
      return timeB - timeA;
    }

    return a.workerName.localeCompare(b.workerName);
  });

  return { updated: next, found: true };
}

/**
 * Defensive deduplication function that collapses any duplicate conversation
 * items in a list that share the same workerId or roomId.
 */
export function deduplicateConversationList(items: ConversationItem[]): ConversationItem[] {
  if (!Array.isArray(items) || items.length <= 1) return items || [];

  const map = new Map<string, ConversationItem>();

  for (const item of items) {
    const key = item.workerId ? `worker_${item.workerId}` : `room_${item.roomId || item.bookingId}`;

    if (!map.has(key)) {
      map.set(key, item);
      continue;
    }

    const existing = map.get(key)!;
    const timeA = new Date(item.lastMessageAt).getTime() || 0;
    const timeB = new Date(existing.lastMessageAt).getTime() || 0;
    const useItemMessage = timeA >= timeB;

    const mergedBookingIds = Array.from(
      new Set([...(existing.allBookingIds || []), ...(item.allBookingIds || []), item.bookingId, existing.bookingId])
    );

    const preferItemBooking = isActiveBookingStatus(item.bookingStatus) && !isActiveBookingStatus(existing.bookingStatus);

    map.set(key, {
      ...existing,
      id: existing.roomId || item.roomId || existing.id,
      roomId: existing.roomId || item.roomId,
      bookingId: preferItemBooking ? item.bookingId : existing.bookingId,
      bookingStatus: preferItemBooking ? item.bookingStatus : existing.bookingStatus,
      workerName:
        existing.workerName !== 'Assigned Professional'
          ? existing.workerName
          : item.workerName,
      workerAvatarUrl: existing.workerAvatarUrl || item.workerAvatarUrl,
      workerPhone: existing.workerPhone || item.workerPhone,
      categoryName: preferItemBooking ? item.categoryName : existing.categoryName,
      lastMessage: useItemMessage ? item.lastMessage : existing.lastMessage,
      lastMessageAt: useItemMessage ? item.lastMessageAt : existing.lastMessageAt,
      lastMessageSenderType: useItemMessage ? item.lastMessageSenderType : existing.lastMessageSenderType,
      unreadCount: Math.max(existing.unreadCount, item.unreadCount),
      isOnline: existing.isOnline || item.isOnline,
      allBookingIds: mergedBookingIds,
    });
  }

  return Array.from(map.values());
}
