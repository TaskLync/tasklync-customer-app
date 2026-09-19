import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
  AppState,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useChat } from '../../../src/hooks/useChat';
import { useTypingIndicator } from '../../../src/hooks/useTypingIndicator';
import { useScrollPosition } from '../../../src/hooks/useScrollPosition';
import { bookingApi, getPersistedBookings } from '../../../src/services/api/booking.api';
import { workerApi } from '../../../src/services/api/worker.api';
import { BookingDetails } from '../../../src/types/booking.types';
import { MessageRenderItem } from '../../../src/types/chat.types';
import {
  ChatHeader,
  ChatInput,
  MessageBubble,
  MessageTimestamp,
  SystemMessage,
  TypingIndicator,
  ChatSkeleton,
  NewMessagesBanner,
  ArchivedBanner,
  MessageContextMenu,
  MessageContextMenuRef,
} from '../../../src/components/chat';
import { colors } from '../../../src/design/colors';

export default function BookingChatScreen() {
  const params = useLocalSearchParams<{
    id: string;
    workerName?: string;
    workerAvatar?: string;
    workerAvatarUrl?: string;
    workerPhone?: string;
    categoryName?: string;
    workerId?: string;
  }>();
  const bookingId = typeof params.id === 'string' ? params.id : '';

  const flatListRef = useRef<FlatList<MessageRenderItem>>(null);
  const contextMenuRef = useRef<MessageContextMenuRef>(null);

  // Synchronous initial hydration from local persisted MMKV storage (zero layout shift)
  const [booking, setBooking] = useState<BookingDetails | null>(() => {
    if (!bookingId) return null;
    return getPersistedBookings().find((b) => b.id === bookingId) || null;
  });

  const {
    messages,
    renderItems,
    isLoading,
    isWorkerTyping,
    isWorkerOnline,
    isRoomClosed,
    uploadProgressMap,
    sendMessage,
    retrySendMessage,
    loadMore,
    markRead,
  } = useChat(bookingId);

  const { notifyTyping, stopTypingImmediately } = useTypingIndicator(bookingId);
  const { isAtBottom, handleScroll, isAtBottomRef } = useScrollPosition({ bottomThreshold: 45 });

  // Unread messages arrived while user is scrolled up in history
  const [unreadScrolledCount, setUnreadScrolledCount] = useState<number>(0);
  const prevMessagesCountRef = useRef<number>(messages.length);

  // Track incoming messages for NewMessagesBanner logic
  useEffect(() => {
    const prevCount = prevMessagesCountRef.current;
    const currentCount = messages.length;
    prevMessagesCountRef.current = currentCount;

    if (currentCount > prevCount && !isLoading) {
      const newestMsg = messages[messages.length - 1];
      const isOutgoing =
        newestMsg?.sender_type === 'user' || newestMsg?.sender_type === 'customer';

      if (isOutgoing || isAtBottomRef.current) {
        // User sent message or is already at bottom -> auto scroll
        setUnreadScrolledCount(0);
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      } else {
        // User is scrolled up in history reading previous messages -> show banner count
        const newIncomingCount = currentCount - prevCount;
        setUnreadScrolledCount((prev) => prev + newIncomingCount);
      }
    }
  }, [messages, isLoading, isAtBottomRef]);

  // When user manually scrolls down to bottom, auto-dismiss new messages banner
  useEffect(() => {
    if (isAtBottom && unreadScrolledCount > 0) {
      setUnreadScrolledCount(0);
    }
  }, [isAtBottom, unreadScrolledCount]);

  // Fetch full booking details for header metadata (worker name, avatar, phone, category)
  useEffect(() => {
    if (!bookingId) return;
    bookingApi
      .getBookingDetails(bookingId)
      .then((b) => {
        if (b) setBooking(b);
      })
      .catch(() => {});
  }, [bookingId]);

  // Scalable fallback: If worker_id exists but worker_name is missing, fetch worker public profile
  useEffect(() => {
    const workerId = booking?.worker_id || params.workerId;
    if (workerId && !booking?.worker_name && !params.workerName) {
      workerApi
        .getWorkerProfile(workerId)
        .then((profile) => {
          if (profile?.name) {
            setBooking((prev) =>
              prev
                ? {
                    ...prev,
                    worker_name: profile.name,
                    worker_avatar_url: profile.avatarUrl || (profile as any).avatar_url || prev.worker_avatar_url,
                    worker_phone: (profile as any).phone_number || (profile as any).phone || prev.worker_phone,
                  }
                : null
            );
          }
        })
        .catch(() => {});
    }
  }, [booking?.worker_id, booking?.worker_name, params.workerId, params.workerName]);

  // Mark all messages as read when screen is focused and app is active
  useFocusEffect(
    useCallback(() => {
      if (AppState.currentState === 'active') {
        markRead();
      }
    }, [markRead])
  );

  const handleSend = useCallback(
    (text: string, type: 'text' | 'image' = 'text', mediaUrl?: string) => {
      sendMessage(text, type, mediaUrl);
    },
    [sendMessage]
  );

  const handleScrollToBottom = useCallback(() => {
    setUnreadScrolledCount(0);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleLongPressText = useCallback((content: string) => {
    contextMenuRef.current?.showMenu(content);
  }, []);

  // Terminal / Archived State Check: COMPLETED, CANCELLED, DISPUTED
  const isArchived = useMemo(() => {
    if (isRoomClosed) return true;
    const status = (booking?.status || '').toUpperCase();
    return ['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(status);
  }, [isRoomClosed, booking?.status]);

  // Robust, scalable worker information resolution
  const resolvedWorkerName = useMemo(() => {
    if (params.workerName && params.workerName.trim().length > 0) {
      return params.workerName.trim();
    }
    if (booking?.worker_name && booking.worker_name.trim().length > 0) {
      return booking.worker_name.trim();
    }
    const cat = booking?.category_name || params.categoryName;
    if (cat && cat.trim().length > 0) {
      const cleanCategory = cat.replace(/s$/i, '').trim();
      return `Assigned ${cleanCategory}`;
    }
    return 'Assigned Professional';
  }, [params.workerName, params.categoryName, booking?.worker_name, booking?.category_name]);

  const resolvedWorkerAvatar =
    params.workerAvatarUrl ||
    params.workerAvatar ||
    booking?.worker_avatar_url ||
    undefined;

  const resolvedWorkerPhone =
    params.workerPhone ||
    booking?.worker_phone ||
    undefined;

  const resolvedCategoryName =
    booking?.category_name ||
    params.categoryName ||
    undefined;

  const handleCallPress = useCallback(() => {
    if (!resolvedWorkerPhone) {
      Alert.alert('Contact Unavailable', 'Direct phone calling is not available for this booking.');
      return;
    }
    const cleanPhone = resolvedWorkerPhone.replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Unable to place call', 'Could not open phone dialer on this device.');
    });
  }, [resolvedWorkerPhone]);

  const renderMessageItem = useCallback(
    ({ item }: { item: MessageRenderItem }) => {
      switch (item.type) {
        case 'date_divider':
          return <MessageTimestamp label={item.label} />;

        case 'system':
          return <SystemMessage content={item.content} />;

        case 'message': {
          const msgId = item.message.temp_id || item.message.id;
          const progress = uploadProgressMap[msgId];
          return (
            <MessageBubble
              item={item}
              workerName={resolvedWorkerName}
              workerAvatarUrl={resolvedWorkerAvatar}
              uploadProgress={progress}
              onRetry={retrySendMessage}
              onLongPressText={handleLongPressText}
            />
          );
        }

        default:
          return null;
      }
    },
    [
      resolvedWorkerName,
      resolvedWorkerAvatar,
      uploadProgressMap,
      retrySendMessage,
      handleLongPressText,
    ]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Fixed Chat Header with Dynamic Online Presence & Worker Details */}
      <ChatHeader
        workerName={resolvedWorkerName}
        workerAvatarUrl={resolvedWorkerAvatar}
        categoryName={resolvedCategoryName}
        isOnline={isWorkerOnline || isWorkerTyping}
        workerPhone={resolvedWorkerPhone}
        onCallPress={handleCallPress}
      />

      {/* Main Conversation Container with Inverted FlatList */}
      <View style={styles.flex}>
        {isLoading ? (
          <ChatSkeleton />
        ) : (
          <FlatList
            ref={flatListRef}
            data={renderItems}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            inverted
            contentContainerStyle={styles.listContent}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            maxToRenderPerBatch={15}
            updateCellsBatchingPeriod={50}
            windowSize={11}
            removeClippedSubviews={Platform.OS === 'android'}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          />
        )}

        {/* New Messages Pill Banner (Position-aware overlay above bottom bar) */}
        <NewMessagesBanner
          count={unreadScrolledCount}
          visible={unreadScrolledCount > 0 && !isAtBottom}
          onPress={handleScrollToBottom}
        />
      </View>

      {/* Real-time Typing Indicator (above input/archived bar) */}
      {isWorkerTyping && <TypingIndicator />}

      {/* Positional Consistency: Replace ChatInput with ArchivedBanner when terminal */}
      {isArchived ? (
        <ArchivedBanner status={booking?.status || 'COMPLETED'} />
      ) : (
        <ChatInput
          onSend={handleSend}
          onTyping={notifyTyping}
          onStopTyping={stopTypingImmediately}
          disabled={isLoading || isArchived}
        />
      )}

      {/* Native-style Long-Press Copy Context Menu & Global Toast */}
      <MessageContextMenu ref={contextMenuRef} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  flex: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 12,
  },
});
