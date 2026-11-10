import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { MessageBubbleItem } from '../../types/chat.types';
import { ReadReceipt } from './ReadReceipt';
import { ImageMessage } from './ImageMessage';
import { formatPKTTime } from '../../utils/timezone';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

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
  workerName: _workerName,
  workerAvatarUrl: _workerAvatarUrl,
  uploadProgress,
  onRetry,
  onLongPressText,
  onImagePress,
  ...restProps
}: MessageBubbleProps & Record<string, any>) {
  const styles = useThemedStyles(createStyles);
  const message = item?.message || (restProps as any)?.message;
  if (!message) return null;

  const isFirstInGroup = item?.isFirstInGroup ?? (restProps as any)?.isFirstInGroup ?? true;
  const isLastInGroup = item?.isLastInGroup ?? (restProps as any)?.isLastInGroup ?? true;
  const isOutgoing = item?.isOutgoing ?? (restProps as any)?.isMe ?? (restProps as any)?.isOutgoing ?? (message.sender_type === 'user' || message.sender_type === 'customer');
  const readReceiptStatus = item?.readReceiptStatus ?? (restProps as any)?.readReceiptStatus ?? 'sent';

  // Entrance animation: only for newly sent/received messages (<2s old); history never animates
  const isFresh = React.useMemo(() => {
    if (!message.created_at) return true;
    const age = Date.now() - new Date(message.created_at).getTime();
    return age < 2000 || message.status === 'sending';
  }, [message.created_at, message.status]);

  const translateY = useSharedValue(isFresh ? 8 : 0);
  const opacity = useSharedValue(isFresh ? 0 : 1);

  useEffect(() => {
    if (isFresh) {
      translateY.value = withTiming(0, { duration: 160 });
      opacity.value = withTiming(1, { duration: 160 });
    }
  }, [isFresh, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const timeString = formatPKTTime(message.created_at);
  const isFailed = readReceiptStatus === 'failed';
  const isImageMessage = message.type === 'image' || !!message.media_url;

  // Sender-side corners: the first bubble of a run is fully rounded, continuations are tighter and
  // the last bubble of a run carries the small "tail" corner.
  const topSide = isFirstInGroup ? BUBBLE_RADIUS : TIGHT_RADIUS;
  const bottomSide = isLastInGroup ? TAIL_RADIUS : TIGHT_RADIUS;
  const cornerStyle: ViewStyle = isOutgoing
    ? { borderTopRightRadius: topSide, borderBottomRightRadius: bottomSide }
    : { borderTopLeftRadius: topSide, borderBottomLeftRadius: bottomSide };

  const handleLongPress = () => {
    if (message.type === 'text' && message.content && onLongPressText) {
      onLongPressText(message.content);
    }
  };

  const meta = (
    <View style={styles.metaInline} pointerEvents="none">
      <Text style={[styles.timeText, isOutgoing ? styles.timeOutgoing : styles.timeIncoming]}>
        {timeString}
      </Text>
      {isOutgoing && (
        <View style={styles.receipt}>
          <ReadReceipt status={readReceiptStatus} />
        </View>
      )}
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.row,
        isOutgoing ? styles.rowOutgoing : styles.rowIncoming,
        isFirstInGroup ? styles.rowFirstInGroup : styles.rowContinuation,
        animatedStyle,
      ]}
    >
      <View style={[styles.bubbleContainer, isOutgoing ? styles.alignRight : styles.alignLeft]}>
        <Pressable
          onLongPress={handleLongPress}
          delayLongPress={280}
          style={[
            styles.bubble,
            isOutgoing ? styles.bubbleOutgoing : styles.bubbleIncoming,
            isImageMessage && styles.imageBubblePadding,
            isFailed && styles.bubbleFailed,
            cornerStyle,
          ]}
        >
          {isImageMessage ? (
            <View>
              <View style={styles.imageMessageContainer}>
                <ImageMessage
                  message={message}
                  progress={uploadProgress}
                  onRetry={onRetry}
                  onPress={onImagePress}
                  isOutgoing={isOutgoing}
                />
              </View>
              {message.content && message.content !== 'Photo' ? (
                <Text style={[styles.text, styles.captionText]}>{message.content}</Text>
              ) : null}
              <View style={styles.imageMetaWrap}>{meta}</View>
            </View>
          ) : (
            // Wrap layout: the time sits beside short text on one line and drops to its own
            // right-aligned line when the text needs the full width. Pure flex flow, so the time
            // can never overlap the text whatever the font, font scale or language.
            <View style={styles.textWrap}>
              <Text style={styles.text}>{message.content}</Text>
              <View style={styles.metaFlow}>{meta}</View>
            </View>
          )}
        </Pressable>

        {!isImageMessage && isFailed && (
          <Pressable
            style={styles.retryButton}
            onPress={() => onRetry && (message.temp_id || message.id) && onRetry(message.temp_id || message.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Message failed to send. Tap to retry."
          >
            <Text style={styles.retryText}>Not sent · Tap to retry</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
});

const BUBBLE_RADIUS = 16;
const TIGHT_RADIUS = 6;
const TAIL_RADIUS = 4;

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  rowFirstInGroup: {
    marginTop: 10,
  },
  rowContinuation: {
    marginTop: 2,
  },
  rowIncoming: {
    justifyContent: 'flex-start',
  },
  rowOutgoing: {
    justifyContent: 'flex-end',
  },
  bubbleContainer: {
    maxWidth: '80%',
  },
  alignLeft: {
    alignItems: 'flex-start',
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BUBBLE_RADIUS,
  },
  imageBubblePadding: {
    padding: 4,
  },
  bubbleIncoming: {
    backgroundColor: colors.bgCard,
  },
  bubbleOutgoing: {
    backgroundColor: colors.primaryBorderSubtle,
  },
  bubbleFailed: {
    borderWidth: 1,
    borderColor: colors.danger,
  },
  imageMessageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  captionText: {
    marginTop: 6,
    paddingHorizontal: 6,
  },
  imageMetaWrap: {
    alignSelf: 'flex-end',
    paddingHorizontal: 6,
    paddingTop: 2,
  },
  text: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 15,
    lineHeight: 21,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  textWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  metaFlow: {
    marginLeft: 10,
    paddingTop: 2,
  },
  metaInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receipt: {
    marginLeft: 3,
  },
  timeText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 14,
  },
  timeIncoming: {
    color: colors.textMuted,
  },
  timeOutgoing: {
    color: colors.textSecondary,
  },
  retryButton: {
    marginTop: 4,
    marginRight: 2,
  },
  retryText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    color: colors.danger,
  },
});
