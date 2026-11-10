import { useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Linking,
  TouchableOpacity,
  AppState,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { CheckCircle2, ChevronRight } from 'lucide-react-native';

import { useChat } from '../../../src/hooks/useChat';
import { useTypingIndicator } from '../../../src/hooks/useTypingIndicator';
import { useChatAutoScroll } from '../../../src/hooks/useChatAutoScroll';
import { useCustomRequestDetail } from '../../../src/hooks/custom-requests/useCustomRequestDetail';
import { useWorkerProfile } from '../../../src/hooks/useWorkerProfile';
import { chatApi } from '../../../src/services/api/chat.api';
import { MessageRenderItem } from '../../../src/types/chat.types';
import { CustomRequestStatus } from '../../../src/types/customRequest.types';
import {
  ChatHeader,
  ChatInput,
  MessageBubble,
  MessageTimestamp,
  SystemMessage,
  TypingIndicator,
  ChatSkeleton,
  LoadingOlder,
  EmptyConversation,
  NewMessagesBanner,
  MessageContextMenu,
  MessageContextMenuRef,
} from '../../../src/components/chat';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../src/theme/useAppTheme';
import { showAlert } from '../../../src/components/feedback/AppAlert';

export default function RequestClarificationChatScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const params = useLocalSearchParams<{
    requestId: string;
    workerName?: string;
    workerAvatar?: string;
    workerPhone?: string;
    categoryName?: string;
  }>();
  const requestId = typeof params.requestId === 'string' ? params.requestId : '';

  const flatListRef = useRef<FlatList<MessageRenderItem>>(null);
  const contextMenuRef = useRef<MessageContextMenuRef>(null);

  // Load custom request details (worker name, active quote, status)
  const { request, activeQuote } = useCustomRequestDetail(requestId);
  const { worker } = useWorkerProfile(request?.worker_id);

  // Initialize pre-booking chat room on mount
  useEffect(() => {
    if (requestId) {
      chatApi.createRequestRoom(requestId).catch(() => {});
    }
  }, [requestId]);

  const {
    messages,
    renderItems,
    isLoading,
    isFetchingMore,
    isWorkerTyping,
    isWorkerOnline,
    uploadProgressMap,
    sendMessage,
    retrySendMessage,
    loadMore,
    markRead,
  } = useChat(requestId);

  const effectiveWorkerOnline = isWorkerOnline || worker?.availabilityStatus === 'AVAILABLE';

  const { notifyTyping, stopTypingImmediately } = useTypingIndicator(requestId);
  const {
    isAtBottom,
    handleScroll,
    unreadCount: unreadScrolledCount,
    scrollToBottom: handleScrollToBottom,
  } = useChatAutoScroll({ messages, isLoading, listRef: flatListRef });

  // Mark all messages as read when screen is focused and app is active
  useFocusEffect(
    useCallback(() => {
      if (AppState.currentState === 'active') {
        markRead();
      }
    }, [markRead])
  );

  const resolvedWorkerName = useMemo(() => {
    return (
      params.workerName?.trim() ||
      request?.provider_name?.trim() ||
      request?.worker_name?.trim() ||
      worker?.name?.trim() ||
      'Assigned Professional'
    );
  }, [params.workerName, request?.provider_name, request?.worker_name, worker?.name]);

  const resolvedWorkerAvatar = useMemo(() => {
    return (
      params.workerAvatar ||
      request?.worker_avatar ||
      worker?.avatarUrl ||
      undefined
    );
  }, [params.workerAvatar, request?.worker_avatar, worker?.avatarUrl]);

  const resolvedWorkerPhone = useMemo(() => {
    return (
      params.workerPhone ||
      request?.worker_phone ||
      worker?.phone ||
      undefined
    );
  }, [params.workerPhone, request?.worker_phone, worker?.phone]);

  const resolvedCategoryName = useMemo(() => {
    return (
      params.categoryName ||
      request?.category_name ||
      request?.category_id ||
      'Clarification Chat'
    );
  }, [params.categoryName, request?.category_name, request?.category_id]);

  const handleCallPress = useCallback(() => {
    if (resolvedWorkerPhone) {
      const cleanPhone = resolvedWorkerPhone.replace(/[^\d+]/g, '');
      Linking.openURL(`tel:${cleanPhone}`).catch(() => {
        showAlert('Unable to place call', 'Could not open phone dialer on this device.');
      });
    } else {
      showAlert('Phone Call', 'Professional contact number is available once a quote is confirmed.');
    }
  }, [resolvedWorkerPhone]);

  const handleSend = useCallback(
    (text: string, type: 'text' | 'image' = 'text', mediaUrl?: string) => {
      sendMessage(text, type, mediaUrl);
      stopTypingImmediately();
    },
    [sendMessage, stopTypingImmediately]
  );

  const handleLongPressText = useCallback((content: string) => {
    contextMenuRef.current?.showMenu(content);
  }, []);

  const renderItem = useCallback(
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
    [resolvedWorkerName, resolvedWorkerAvatar, retrySendMessage, uploadProgressMap, handleLongPressText]
  );

  const hasQuote = request?.status === CustomRequestStatus.QUOTE_SENT || !!activeQuote;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Fixed Chat Header with Dynamic Online Presence & Worker Details */}
      <ChatHeader
        workerName={resolvedWorkerName}
        workerAvatarUrl={resolvedWorkerAvatar}
        categoryName={resolvedCategoryName}
        isOnline={effectiveWorkerOnline || isWorkerTyping}
        workerPhone={resolvedWorkerPhone}
        onCallPress={handleCallPress}
      />

      {/* Quote Banner Alert if worker issued a quote */}
      {hasQuote && (
        <TouchableOpacity
          style={styles.quoteReadyBanner}
          onPress={() => router.push(`/custom-request/${requestId}/quote` as any)}
          activeOpacity={0.8}
        >
          <View style={styles.quoteBannerLeft}>
            <CheckCircle2 size={18} color={colors.textGreen} />
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.quoteBannerTitle}>Formal Quote Ready</Text>
              <Text style={styles.quoteBannerSubtitle}>
                {activeQuote ? `PKR ${activeQuote.total_price.toLocaleString()} • Tap to review scope` : 'Tap to review'}
              </Text>
            </View>
          </View>
          <View style={styles.quoteBannerAction}>
            <Text style={styles.quoteBannerActionText}>Review Quote</Text>
            <ChevronRight size={14} color={colors.textGreen} />
          </View>
        </TouchableOpacity>
      )}

      {/* Main Conversation Container with Inverted FlatList */}
      <View style={styles.flex}>
        {isLoading ? (
          <ChatSkeleton />
        ) : (
          <FlatList
            ref={flatListRef}
            style={styles.flex}
            data={renderItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            inverted
            contentContainerStyle={styles.listContent}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={isFetchingMore ? <LoadingOlder /> : null}
            ListEmptyComponent={<EmptyConversation />}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
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

      {/* Real-time Typing Indicator (above input bar) */}
      {isWorkerTyping && <TypingIndicator />}

      {/* Bottom Message Input Bar */}
      <ChatInput
        onSend={handleSend}
        onTyping={notifyTyping}
        onStopTyping={stopTypingImmediately}
        disabled={isLoading}
      />

      {/* Native-style Long-Press Copy Context Menu & Global Toast */}
      <MessageContextMenu ref={contextMenuRef} onRetry={retrySendMessage} />
    </KeyboardAvoidingView>
  );
}

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.gray100,
  },
  flex: {
    flex: 1,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 8,
    flexGrow: 1,
  },
  quoteReadyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryBorderSubtle,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryBorder,
  },
  quoteBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  quoteBannerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
    color: colors.textGreen,
  },
  quoteBannerSubtitle: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 11,
    color: colors.textGreenDark,
  },
  quoteBannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  quoteBannerActionText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11,
    color: colors.textGreen,
    marginRight: 2,
  },
});
