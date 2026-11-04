import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState } from 'react-native';
import { Message, MessageType, MessageRenderItem } from '../types/chat.types';
import { chatApi, saveCachedChatMessages, getCachedChatMessages } from '../services/api/chat.api';
import { chatSocket } from '../services/socket/chat.socket';
import { socketService } from '../services/socket/socket.service';
import { useSocketEvent } from './useSocketEvent';
import { useAuthStore } from '../store/auth.store';
import { groupMessagesForInvertedList } from '../utils/messageGrouping';
import { chatSoundService } from '../services/audio/chatSound.service';
import { useChatUnreadStore } from '../store/chatUnread.store';
import { sendWithRetry } from '../utils/messageSender';
import type { SendSignal, SendTransport } from '../utils/messageSender';
import type { SendMessageSocketPayload } from '../services/socket/chat.socket';

/** Retries run in the background and finish even if the screen is left. */
const sendTransport: SendTransport<SendMessageSocketPayload> = {
  emit: (payload) => chatSocket.sendMessageWithAck(payload),
  isConnected: () => chatSocket.isConnected(),
  waitForConnection: (ms) => chatSocket.waitForConnection(ms),
};

export function useChat(bookingId: string) {
  // Synchronous initial hydration from local MMKV cache (0ms instant render).
  // A message still "sending" in the cache was interrupted (app closed / killed mid-send). Nothing is sending it
  // now, so show it as failed: one tap retries it, and the retry reuses its temp_id so it cannot duplicate.
  const [messages, setMessages] = useState<Message[]>(() => {
    if (!bookingId) return [];
    return getCachedChatMessages(bookingId).map((m) => (m.status === 'sending' ? { ...m, status: 'failed' as const } : m));
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return bookingId ? getCachedChatMessages(bookingId).length === 0 : true;
  });

  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);
  const [nextCursor, setNextCursor] = useState<string | null | undefined>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isWorkerTyping, setIsWorkerTyping] = useState<boolean>(false);
  const [isWorkerOnline, setIsWorkerOnline] = useState<boolean>(false);
  const [isRoomClosed, setIsRoomClosed] = useState<boolean>(false);
  const [uploadProgressMap, setUploadProgressMap] = useState<Record<string, number>>({});

  const currentUserId = useAuthStore((s) => s.user?.id || 'current-user');
  const roomIdRef = useRef<string | undefined>(undefined);
  const pendingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localImageUrisRef = useRef<Map<string, string>>(new Map());
  /** One per message currently being sent. `settled` is flipped when the echo confirms it, which stops retries. */
  const sendSignalsRef = useRef<Map<string, SendSignal>>(new Map());

  // 1. Initial Load of message history with resilience retry
  useEffect(() => {
    chatSoundService.ensurePreloaded().catch(() => {});
  }, []);

  const loadHistory = useCallback(async (retryCount = 0) => {
    if (!bookingId) return;
    try {
      const res = await chatApi.getMessages(bookingId, null, 50);
      const serverMessages = res.messages || [];

      const foundRoomId = serverMessages.find((m) => m.room_id)?.room_id;
      if (foundRoomId) {
        roomIdRef.current = foundRoomId;
      }

      setMessages((prev) => {
        const serverIds = new Set(serverMessages.map((m) => m.id));
        const pendingOptimistic = prev.filter(
          (m) => m.status === 'sending' && !serverIds.has(m.id)
        );
        const merged = [...serverMessages, ...pendingOptimistic];
        saveCachedChatMessages(bookingId, merged, roomIdRef.current);
        return merged;
      });

      setNextCursor(res.next_cursor);
      setHasMore(res.has_more);
      setIsLoading(false);

      // Presence inference: If counterparty sent a message in the last 15 minutes, mark online
      const recentWorkerMsg = serverMessages
        .filter((m) => m.sender_type === 'worker' || (m.sender_id && m.sender_id !== currentUserId))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      if (recentWorkerMsg?.created_at) {
        const diffMs = Date.now() - new Date(recentWorkerMsg.created_at).getTime();
        if (diffMs < 15 * 60 * 1000) {
          setIsWorkerOnline(true);
        }
      }

      // Check room details for presence flag and persistent room ID
      chatApi
        .getRoomDetails(bookingId)
        .then((room) => {
          if (room) {
            if (room.id) {
              roomIdRef.current = room.id;
              if (room.id !== bookingId) {
                chatSocket.joinRoom(room.id);
              }
            }
            if (room.status === 'CLOSED') {
              setIsRoomClosed(true);
            }
            if (
              (room as any).is_online ||
              (room as any).worker_online ||
              (room as any).online ||
              (room as any).counterparty_online
            ) {
              setIsWorkerOnline(true);
            }
          }
        })
        .catch(() => {});
    } catch {
      if (retryCount < 2) {
        setTimeout(() => loadHistory(retryCount + 1), 1000 * (retryCount + 1));
      } else {
        setIsLoading(false);
      }
    }
  }, [bookingId, currentUserId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 2. Mark messages as read via REST PATCH only when app is in active foreground
  const markRead = useCallback(() => {
    if (!bookingId) return;
    if (AppState.currentState !== 'active') return;
    chatApi.markAsRead(bookingId);
    useChatUnreadStore.getState().clearBookingUnread(bookingId);
    if (roomIdRef.current) {
      useChatUnreadStore.getState().clearBookingUnread(roomIdRef.current);
    }
  }, [bookingId]);

  // 3. Socket Channel Lifecycle & Auto Re-join on Reconnection
  useEffect(() => {
    if (!bookingId) return;
    chatSocket.joinRoom(bookingId);
    if (roomIdRef.current && roomIdRef.current !== bookingId) {
      chatSocket.joinRoom(roomIdRef.current);
    }
    markRead();

    const unsubscribeConnect = socketService.on('connect', () => {
      chatSocket.joinRoom(bookingId);
      if (roomIdRef.current && roomIdRef.current !== bookingId) {
        chatSocket.joinRoom(roomIdRef.current);
      }
      loadHistory();
    });

    const heartbeatTimer = setInterval(() => {
      chatSocket.sendHeartbeat();
    }, 25000);

    return () => {
      clearInterval(heartbeatTimer);
      unsubscribeConnect();
      chatSocket.leaveRoom(bookingId);
      if (roomIdRef.current && roomIdRef.current !== bookingId) {
        chatSocket.leaveRoom(roomIdRef.current);
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      pendingTimeoutsRef.current.forEach((t) => clearTimeout(t));
      pendingTimeoutsRef.current.clear();
    };
  }, [bookingId, markRead, loadHistory]);

  // 4. Socket Event Listeners per CHAT_SERVICE_CUSTOMER_API_SPECIFICATION.md
  const handleIncomingMessage = useCallback(
    (data: any) => {
      if (!data) return;

      const incomingBookingId = data.booking_id || data.bookingId;
      const incomingRoomId = data.room_id || data.roomId;
      const isMatch =
        !incomingBookingId && !incomingRoomId
          ? true
          : incomingBookingId === bookingId ||
            (roomIdRef.current && (incomingRoomId === roomIdRef.current || incomingBookingId === roomIdRef.current));
      if (!isMatch) return;

      if (incomingRoomId && !roomIdRef.current) {
        roomIdRef.current = incomingRoomId;
      }

      const echoedTempId: string | undefined = data.tempId || data.temp_id;

      const incoming: Message = {
        id: data.id || data._id || `msg_${Date.now()}`,
        room_id: incomingRoomId || roomIdRef.current,
        booking_id: incomingBookingId || bookingId,
        sender_id: data.sender_id || data.senderId || 'worker',
        sender_type: data.sender_type || data.senderType || 'worker',
        content: data.content || '',
        type: data.type || 'text',
        media_url: data.media_url || data.mediaUrl || undefined,
        media_thumbnail_url: data.media_thumbnail_url || data.mediaThumbnailUrl || undefined,
        metadata: data.metadata || undefined,
        status: 'sent',
        read_by: Array.isArray(data.read_by) ? data.read_by : Array.isArray(data.readBy) ? data.readBy : [],
        created_at: data.created_at || data.createdAt || new Date().toISOString(),
        temp_id: echoedTempId,
      };

      setMessages((prev) => {
        let matchIndex = -1;

        // Tier 1: Match by explicit tempId
        if (echoedTempId) {
          matchIndex = prev.findIndex((m) => m.temp_id === echoedTempId || m.id === echoedTempId);
        }

        // Tier 2: fuzzy fallback, ONLY for a server that did not echo our tempId (older backends).
        // It used to be `content === content || type === type`, i.e. any pending message of the same type matched,
        // so with two messages in flight the echo of one could overwrite the bubble of the other.
        if (
          matchIndex === -1 &&
          !echoedTempId &&
          (incoming.sender_id === currentUserId || incoming.sender_type === 'user')
        ) {
          const incomingTime = new Date(incoming.created_at).getTime();
          matchIndex = prev.findIndex((m) => {
            if (m.status !== 'sending' && m.status !== 'failed') return false;
            const msgTime = new Date(m.created_at).getTime();
            return (
              m.type === incoming.type &&
              m.content === incoming.content &&
              Math.abs(incomingTime - msgTime) < 25000
            );
          });
        }

        if (matchIndex >= 0) {
          const matchedTempId = prev[matchIndex].temp_id || prev[matchIndex].id;
          // The echo confirms the message: stop any retry still in flight for it
          const signal = sendSignalsRef.current.get(matchedTempId);
          if (signal) signal.settled = true;
          const timeout = pendingTimeoutsRef.current.get(matchedTempId);
          if (timeout) {
            clearTimeout(timeout);
            pendingTimeoutsRef.current.delete(matchedTempId);
          }

          // Clean up progress entry
          setUploadProgressMap((p) => {
            const next = { ...p };
            delete next[matchedTempId];
            return next;
          });

          const updated = [...prev];
          // Preserve local image URI if remote CDN hasn't fully loaded to prevent flicker
          const localUri = localImageUrisRef.current.get(matchedTempId);
          updated[matchIndex] = {
            ...incoming,
            temp_id: matchedTempId,
            media_url: incoming.media_url || localUri || prev[matchIndex].media_url,
            status: 'sent',
          };
          saveCachedChatMessages(bookingId, updated, roomIdRef.current);
          return updated;
        }

        // Deduplication guard against repeated incoming server IDs
        if (prev.some((m) => m.id === incoming.id)) {
          return prev;
        }

        const updated = [...prev, incoming];
        saveCachedChatMessages(bookingId, updated, roomIdRef.current);
        return updated;
      });

      // Auto-mark as read and set worker presence online if message is from the worker/counterparty
      const isFromWorker =
        incoming.sender_type === 'worker' ||
        incoming.sender_id !== currentUserId;

      if (isFromWorker) {
        setIsWorkerOnline(true);
        // Play receive sound for incoming messages from the counterparty
        chatSoundService
          .playReceiveSound(incoming.id, incoming.sender_id, currentUserId)
          .catch(() => {});
        if (AppState.currentState === 'active') {
          markRead();
        }
      }
    },
    [bookingId, currentUserId, markRead]
  );

  useSocketEvent<any>('message_received', handleIncomingMessage);

  // Real-time Typing Listener with Watchdog Auto-Reset & Presence Refresh
  const handleTypingEvent = useCallback(
    (data: any) => {
      const incomingBookingId = data?.bookingId || data?.booking_id;
      const incomingRoomId = data?.roomId || data?.room_id;
      const isCurrentBooking =
        !incomingBookingId && !incomingRoomId
          ? true
          : incomingBookingId === bookingId ||
            (roomIdRef.current && (incomingRoomId === roomIdRef.current || incomingBookingId === roomIdRef.current));

      if (isCurrentBooking) {
        const isWorkerSender =
          data?.senderType === 'worker' ||
          data?.sender_type === 'worker' ||
          data?.userType === 'worker' ||
          data?.user_type === 'worker' ||
          (data?.userId && data?.userId !== currentUserId) ||
          (data?.user_id && data?.user_id !== currentUserId);

        if (isWorkerSender) {
          const isTyping = Boolean(data.isTyping ?? data.is_typing ?? true);
          setIsWorkerTyping(isTyping);
          setIsWorkerOnline(true); // Active counterparty typing guarantees online presence

          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          if (isTyping) {
            typingTimeoutRef.current = setTimeout(() => {
              setIsWorkerTyping(false);
            }, 4500);
          }
        }
      }
    },
    [bookingId, currentUserId]
  );

  useSocketEvent<any>('typing', handleTypingEvent);

  // Robust Multi-format Presence Listeners
  const isTargetRoom = useCallback(
    (data: any) => {
      if (!data) return true;
      const bId = data.bookingId || data.booking_id || data.roomId || data.room_id;
      return !bId || bId === bookingId || (roomIdRef.current && bId === roomIdRef.current);
    },
    [bookingId]
  );

  const isCounterparty = useCallback(
    (data: any) => {
      if (!data) return true;
      const uId = data.userId || data.user_id || data.senderId || data.sender_id || data.workerId || data.worker_id;
      const role = data.senderType || data.sender_type || data.userType || data.user_type || data.role;
      if (role === 'worker') return true;
      if (uId && uId === currentUserId) return false;
      return true;
    },
    [currentUserId]
  );

  const handlePresenceJoin = useCallback(
    (data: any) => {
      if (isTargetRoom(data) && isCounterparty(data)) {
        setIsWorkerOnline(true);
      }
    },
    [isTargetRoom, isCounterparty]
  );

  const handlePresenceLeave = useCallback(
    (data: any) => {
      if (isTargetRoom(data) && isCounterparty(data)) {
        setIsWorkerOnline(false);
      }
    },
    [isTargetRoom, isCounterparty]
  );

  const handlePresenceUpdate = useCallback(
    (data: any) => {
      if (isTargetRoom(data) && isCounterparty(data)) {
        const isOnline = Boolean(
          data?.isOnline ?? data?.is_online ?? data?.online ?? (data?.status === 'online')
        );
        setIsWorkerOnline(isOnline);
      }
    },
    [isTargetRoom, isCounterparty]
  );

  useSocketEvent<any>('user_joined', handlePresenceJoin);
  useSocketEvent<any>('worker_joined', handlePresenceJoin);
  useSocketEvent<any>('user_online', handlePresenceJoin);
  useSocketEvent<any>('worker_online', handlePresenceJoin);
  useSocketEvent<any>('presence', handlePresenceUpdate);
  useSocketEvent<any>('presence_update', handlePresenceUpdate);
  useSocketEvent<any>('user_left', handlePresenceLeave);
  useSocketEvent<any>('worker_left', handlePresenceLeave);
  useSocketEvent<any>('user_offline', handlePresenceLeave);
  useSocketEvent<any>('worker_offline', handlePresenceLeave);

  // Message Read Listener (Receipt from Counterparty indicates online)
  const handleMessageRead = useCallback(
    (data: any) => {
      const incomingBookingId = data?.bookingId || data?.booking_id;
      const incomingRoomId = data?.roomId || data?.room_id;
      const isMatch =
        !incomingBookingId && !incomingRoomId
          ? true
          : incomingBookingId === bookingId ||
            (roomIdRef.current && (incomingRoomId === roomIdRef.current || incomingBookingId === roomIdRef.current));
      if (!isMatch) return;

      const readerId = data.readBy || data.read_by || data.readerId || data.reader_id;

      if (readerId && readerId !== currentUserId) {
        setIsWorkerOnline(true);
      }

      setMessages((prev) => {
        const updated = prev.map((m) => {
          if (m.sender_type === 'user' || m.sender_type === 'customer' || m.sender_id === currentUserId) {
            const currentReadBy = m.read_by || [];
            const updatedReadBy =
              readerId && !currentReadBy.includes(readerId)
                ? [...currentReadBy, readerId]
                : currentReadBy;
            return {
              ...m,
              status: 'read' as const,
              read_by: updatedReadBy,
            };
          }
          return m;
        });
        saveCachedChatMessages(bookingId, updated, roomIdRef.current);
        return updated;
      });
    },
    [bookingId, currentUserId]
  );

  useSocketEvent<any>('message_read', handleMessageRead);

  // Room Closed Listener
  useSocketEvent<any>(
    'room_closed',
    useCallback(
      (data) => {
        const incomingBookingId = data?.bookingId || data?.booking_id;
        const incomingRoomId = data?.roomId || data?.room_id;
        const isMatch =
          !incomingBookingId && !incomingRoomId
            ? true
            : incomingBookingId === bookingId ||
              (roomIdRef.current && (incomingRoomId === roomIdRef.current || incomingBookingId === roomIdRef.current));
        if (isMatch) {
          setIsRoomClosed(true);
        }
      },
      [bookingId]
    )
  );

  const clearProgress = useCallback((tempId: string) => {
    setUploadProgressMap((p) => {
      if (!(tempId in p)) return p;
      const next = { ...p };
      delete next[tempId];
      return next;
    });
  }, []);

  const markFailed = useCallback((tempId: string) => {
    setMessages((prev) => {
      const next = prev.map((m) =>
        (m.id === tempId || m.temp_id === tempId) && m.status === 'sending' ? { ...m, status: 'failed' as const } : m
      );
      saveCachedChatMessages(bookingId, next, roomIdRef.current);
      return next;
    });
  }, [bookingId]);

  /**
   * Sends one message to completion. "sent" means the SERVER stored it (ack with its canonical id) or its echo
   * arrived; emitting on a socket never counts. Every attempt uses the same tempId, so the backend (one row per
   * sender + tempId) turns a retry after a lost ack / dropped socket into a no-op that returns the original.
   */
  const deliver = useCallback(
    async (tempId: string, payload: SendMessageSocketPayload) => {
      const signal: SendSignal = { settled: false, cancelled: false };
      sendSignalsRef.current.set(tempId, signal);
      try {
        const outcome = await sendWithRetry(payload, sendTransport, signal);
        clearProgress(tempId);
        if (outcome.status === 'sent' && outcome.message?.id) {
          const server = outcome.message;
          setMessages((prev) => {
            const mapped = prev.map((m) =>
              m.id === tempId || m.temp_id === tempId
                ? {
                    ...m,
                    id: server.id,
                    temp_id: tempId,
                    status: 'sent' as const,
                    created_at: server.createdAt ?? m.created_at,
                    room_id: server.roomId ?? m.room_id,
                  }
                : m
            );
            // The echo may have inserted the same server message already: keep one bubble per id
            const seen = new Set<string>();
            const next = mapped.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
            saveCachedChatMessages(bookingId, next, roomIdRef.current);
            return next;
          });
        } else if (outcome.status === 'failed') {
          markFailed(tempId);
        }
      } finally {
        sendSignalsRef.current.delete(tempId);
      }
    },
    [bookingId, clearProgress, markFailed]
  );

  // 5. Send Message (Non-blocking Async Upload & Immediate Local Preview)
  const sendMessage = useCallback(
    async (content: string, type: MessageType = 'text', mediaFileUri?: string) => {
      if (!content.trim() && !mediaFileUri) return;
      if (isRoomClosed) return;

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      if (mediaFileUri) {
        localImageUrisRef.current.set(tempId, mediaFileUri);
      }

      const optimisticMsg: Message = {
        id: tempId,
        temp_id: tempId,
        booking_id: bookingId,
        sender_id: currentUserId,
        sender_type: 'user',
        content: content.trim() || (type === 'image' ? 'Photo' : ''),
        type,
        media_url: mediaFileUri, // Immediate local preview
        status: 'sending',
        read_by: [],
        created_at: new Date().toISOString(),
      };

      // 1. Immediately append optimistic bubble
      setMessages((prev) => {
        const next = [...prev, optimisticMsg];
        saveCachedChatMessages(bookingId, next, roomIdRef.current);
        return next;
      });

      // Play send sound immediately
      chatSoundService.playSendSound().catch(() => {});

      // 2. Background dispatch: upload media if needed, then send with acknowledgement + retry
      (async () => {
        let cdnMediaUrl: string | undefined = undefined;
        if (type === 'image' && mediaFileUri) {
          try {
            setUploadProgressMap((p) => ({ ...p, [tempId]: 5 }));
            const uploadRes = await chatApi.uploadMedia(
              bookingId,
              mediaFileUri,
              'image/jpeg',
              (percent) => {
                setUploadProgressMap((p) => ({ ...p, [tempId]: percent }));
              }
            );
            cdnMediaUrl = uploadRes.media_url;
            setUploadProgressMap((p) => ({ ...p, [tempId]: 100 }));
          } catch {
            clearProgress(tempId);
            markFailed(tempId);
            return;
          }
        }

        await deliver(tempId, {
          bookingId,
          roomId: roomIdRef.current,
          type: type === 'system' ? 'text' : type,
          content: content.trim() || (type === 'image' ? 'Photo' : ''),
          mediaUrl: cdnMediaUrl,
          tempId,
        });
      })();
    },
    [bookingId, currentUserId, isRoomClosed, deliver, clearProgress, markFailed]
  );

  // 6. Retry Failed Message (Reuses cached local compressed URI)
  const retrySendMessage = useCallback(
    async (tempId: string) => {
      let msgToRetry: (typeof messages)[0] | undefined;

      setMessages((prev) => {
        const found = prev.find((m) => m.id === tempId || m.temp_id === tempId);
        if (!found) return prev;
        msgToRetry = found;
        return prev.map((m) =>
          m.id === tempId || m.temp_id === tempId ? { ...m, status: 'sending' as const } : m
        );
      });

      await Promise.resolve();
      if (!msgToRetry) return;

      const msg = msgToRetry;
      const localUri = localImageUrisRef.current.get(tempId) || msg.media_url;

      // Already being sent (a double tap on "retry"): do not start a second delivery loop
      if (sendSignalsRef.current.has(tempId)) return;

      (async () => {
        let cdnMediaUrl = msg.media_url;

        if (msg.type === 'image' && localUri && (!cdnMediaUrl || cdnMediaUrl.startsWith('file://'))) {
          try {
            setUploadProgressMap((p) => ({ ...p, [tempId]: 5 }));
            const uploadRes = await chatApi.uploadMedia(
              bookingId,
              localUri,
              'image/jpeg',
              (percent) => {
                setUploadProgressMap((p) => ({ ...p, [tempId]: percent }));
              }
            );
            cdnMediaUrl = uploadRes.media_url;
            setUploadProgressMap((p) => ({ ...p, [tempId]: 100 }));
          } catch {
            clearProgress(tempId);
            markFailed(tempId);
            return;
          }
        }

        // SAME tempId as the first attempt: the backend stores one row per (sender, tempId)
        await deliver(tempId, {
          bookingId,
          roomId: roomIdRef.current,
          type: msg.type === 'system' ? 'text' : msg.type,
          content: msg.content,
          mediaUrl: cdnMediaUrl,
          tempId,
        });
      })();
    },
    [bookingId, deliver, clearProgress, markFailed]
  );

  // 7. Load more history (Cursor-based Pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || isFetchingMore || !nextCursor) return;
    setIsFetchingMore(true);

    try {
      const res = await chatApi.getMessages(bookingId, nextCursor, 30);
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newUnique = (res.messages || []).filter((m) => !existingIds.has(m.id));
        const merged = [...newUnique, ...prev];
        saveCachedChatMessages(bookingId, merged, roomIdRef.current);
        return merged;
      });
      setNextCursor(res.next_cursor);
      setHasMore(res.has_more);
    } finally {
      setIsFetchingMore(false);
    }
  }, [bookingId, hasMore, isFetchingMore, nextCursor]);

  // 8. Transform into grouped inverted render items
  const renderItems: MessageRenderItem[] = useMemo(() => {
    return groupMessagesForInvertedList(messages, currentUserId);
  }, [messages, currentUserId]);

  return {
    messages,
    renderItems,
    isLoading,
    isFetchingMore,
    hasMore,
    isWorkerTyping,
    isWorkerOnline,
    isRoomClosed,
    uploadProgressMap,
    sendMessage,
    retrySendMessage,
    loadMore,
    markRead,
    refetch: loadHistory,
  };
}
