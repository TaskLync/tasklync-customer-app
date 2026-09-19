import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { MessageBubbleItem } from '../../types/chat.types';
import { ReadReceipt } from './ReadReceipt';
import { ImageMessage } from './ImageMessage';
import { formatPKTTime } from '../../utils/timezone';

interface MessageBubbleProps {
  item: MessageBubbleItem;
  workerName?: string | undefined;
  workerAvatarUrl?: string | undefined;
  uploadProgress?: number;
  onRetry?: (tempId: string) => void;
  onLongPressText?: (content: string) => void;
  onImagePress?: (uri: string) => void;
}

export const MessageBubble = React.memo(function MessageBubble({
  item,
  workerName,
  workerAvatarUrl,
  uploadProgress,
  onRetry,
  onLongPressText,
  onImagePress,
}: MessageBubbleProps) {
  const { message, isFirstInGroup, isLastInGroup, showAvatar, isOutgoing, readReceiptStatus } = item;

  const trimmedWorkerName = workerName ? workerName.trim() : '';
  const avatarInitial = trimmedWorkerName.length > 0 ? trimmedWorkerName.charAt(0).toUpperCase() : 'W';

  // Entrance animation: Only run spring for newly sent/received messages (<2s old)
  const isFresh = React.useMemo(() => {
    if (!message.created_at) return true;
    const age = Date.now() - new Date(message.created_at).getTime();
    return age < 2000 || message.status === 'sending';
  }, [message.created_at, message.status]);

  const translateY = useSharedValue(isFresh ? 12 : 0);
  const opacity = useSharedValue(isFresh ? 0 : 1);

  useEffect(() => {
    if (isFresh) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 220, mass: 0.8 });
      opacity.value = withTiming(1, { duration: 180 });
    }
  }, [isFresh, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const timeString = formatPKTTime(message.created_at);
  const isFailed = readReceiptStatus === 'failed';
  const isImageMessage = message.type === 'image' || !!message.media_url;

  const bubbleCustomStyle: (ViewStyle | false | undefined)[] = [
    styles.bubble,
    isOutgoing ? styles.bubbleOutgoing : styles.bubbleIncoming,
    isImageMessage && styles.imageBubblePadding,
  ];

  if (!isFirstInGroup) {
    bubbleCustomStyle.push(isOutgoing ? styles.bubbleTightTopRight : styles.bubbleTightTopLeft);
  }
  if (!isLastInGroup) {
    bubbleCustomStyle.push(isOutgoing ? styles.bubbleTightBottomRight : styles.bubbleTightBottomLeft);
  }

  const handleLongPress = () => {
    if (message.type === 'text' && message.content && onLongPressText) {
      onLongPressText(message.content);
    }
  };

  return (
    <Animated.View
      style={[
        styles.row,
        isOutgoing ? styles.rowOutgoing : styles.rowIncoming,
        isFirstInGroup ? styles.rowFirstInGroup : undefined,
        animatedStyle,
      ]}
    >
      {/* Incoming Avatar */}
      {!isOutgoing && (
        <View style={styles.avatarColumn}>
          {showAvatar ? (
            workerAvatarUrl ? (
              <Image source={{ uri: workerAvatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{avatarInitial}</Text>
              </View>
            )
          ) : (
            <View style={styles.avatarSpacer} />
          )}
        </View>
      )}

      {/* Bubble + Metadata Container */}
      <View style={[styles.bubbleContainer, isOutgoing ? styles.alignRight : styles.alignLeft]}>
        {/* Bubble (Tappable/Long-pressable for text) */}
        <Pressable
          onLongPress={handleLongPress}
          delayLongPress={280}
          style={bubbleCustomStyle}
        >
          {isImageMessage ? (
            <View style={styles.imageMessageContainer}>
              <ImageMessage
                message={message}
                progress={uploadProgress}
                onRetry={onRetry}
                onPress={onImagePress}
                isOutgoing={isOutgoing}
              />
              {message.content && message.content !== 'Photo' ? (
                <Text
                  style={[
                    styles.text,
                    isOutgoing ? styles.textOutgoing : styles.textIncoming,
                    styles.captionText,
                  ]}
                >
                  {message.content}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={[styles.text, isOutgoing ? styles.textOutgoing : styles.textIncoming]}>
              {message.content}
            </Text>
          )}

          {/* Time & Read Receipt Inside/Beside Bubble */}
          <View style={styles.metaRow}>
            <Text style={[styles.timeText, isOutgoing ? styles.timeOutgoing : styles.timeIncoming]}>
              {timeString}
            </Text>
            {isOutgoing && <ReadReceipt status={readReceiptStatus} color="#6B7280" />}
          </View>
        </Pressable>

        {/* Text Failed Retry Affordance (Image retry is centered inside ImageMessage) */}
        {!isImageMessage && isFailed && (
          <Pressable
            style={styles.retryButton}
            onPress={() => onRetry && (message.temp_id || message.id) && onRetry(message.temp_id || message.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.retryText}>Failed to send. Tap to retry.</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 2,
  },
  rowFirstInGroup: {
    marginTop: 8,
  },
  rowIncoming: {
    justifyContent: 'flex-start',
  },
  rowOutgoing: {
    justifyContent: 'flex-end',
  },
  avatarColumn: {
    width: 32,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#6B7280',
  },
  avatarSpacer: {
    width: 28,
    height: 28,
  },
  bubbleContainer: {
    maxWidth: '82%',
  },
  alignLeft: {
    alignItems: 'flex-start',
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 7,
    borderRadius: 18,
  },
  imageBubblePadding: {
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 6,
  },
  bubbleIncoming: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleOutgoing: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderBottomRightRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleTightTopLeft: {
    borderTopLeftRadius: 6,
  },
  bubbleTightBottomLeft: {
    borderBottomLeftRadius: 6,
  },
  bubbleTightTopRight: {
    borderTopRightRadius: 6,
  },
  bubbleTightBottomRight: {
    borderBottomRightRadius: 6,
  },
  imageMessageContainer: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  captionText: {
    marginTop: 6,
    paddingHorizontal: 6,
  },
  text: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 15,
    lineHeight: 21,
  },
  textIncoming: {
    color: '#111827',
  },
  textOutgoing: {
    color: '#111827',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
    paddingHorizontal: 2,
    alignSelf: 'flex-end',
  },
  timeText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
  },
  timeIncoming: {
    color: '#9CA3AF',
  },
  timeOutgoing: {
    color: '#6B7280',
  },
  retryButton: {
    marginTop: 4,
  },
  retryText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    color: '#EF4444',
  },
});
