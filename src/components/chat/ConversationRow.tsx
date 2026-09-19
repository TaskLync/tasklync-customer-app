import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { CheckCheck } from 'lucide-react-native';
import { ConversationItem } from '../../types/chat.types';
import { fontFamily } from '../../design/typography';

interface ConversationRowProps {
  item: ConversationItem;
  onPress: (item: ConversationItem) => void;
}

/**
 * Format timestamps according to native mobile inbox conventions:
 * - < 1 min: "Just now"
 * - today: "9:48 PM"
 * - yesterday: "Yesterday"
 * - < 7 days: "Xd ago"
 * - older: "MMM d"
 */
function formatConversationTimestamp(dateString: string | null | undefined): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';

    const isSameDay =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isSameDay) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) return 'Yesterday';

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    const isCurrentYear = date.getFullYear() === now.getFullYear();
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      ...(isCurrentYear ? {} : { year: 'numeric' }),
    });
  } catch {
    return '';
  }
}

/**
 * Format status as subtle inline secondary metadata without bulky badge blocks
 */
function getBookingStatusInfo(rawStatus?: string): { label: string; color: string } | null {
  if (!rawStatus) return null;
  const s = rawStatus.toUpperCase();
  if (s === 'AVAILABLE') return null;

  switch (s) {
    case 'PENDING':
      return { label: 'Pending', color: '#D97706' }; // soft amber
    case 'ACCEPTED':
      return { label: 'Accepted', color: '#16A34A' }; // Tasklync green
    case 'IN_PROGRESS':
    case 'ACTIVE':
      return { label: 'Active', color: '#16A34A' }; // Tasklync green
    case 'COMPLETED':
      return { label: 'Completed', color: '#64748B' }; // muted slate
    case 'REJECTED':
    case 'CANCELLED':
      return { label: 'Rejected', color: '#DC2626' }; // muted red
    default: {
      const formatted = s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
      return { label: formatted, color: '#64748B' };
    }
  }
}

export const ConversationRow = React.memo(function ConversationRow({
  item,
  onPress,
}: ConversationRowProps) {
  const handlePress = () => {
    onPress(item);
  };

  const trimmedName = item.workerName ? item.workerName.trim() : 'Service Professional';
  const initial = trimmedName.charAt(0).toUpperCase();
  const timeLabel = formatConversationTimestamp(item.lastMessageAt);
  const isUnread = item.unreadCount > 0;
  const isOutgoing =
    item.lastMessageSenderType === 'user' || item.lastMessageSenderType === 'customer';
  const isTyping = (item as any).isTyping;
  const statusInfo = getBookingStatusInfo(item.bookingStatus);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Conversation with ${trimmedName}. ${item.categoryName || ''}. ${isUnread ? `${item.unreadCount} unread` : ''}`}
    >
      {/* Left: Perfectly circular avatar with attached online status dot */}
      <View style={styles.avatarContainer}>
        {item.workerAvatarUrl ? (
          <Image
            source={{ uri: item.workerAvatarUrl }}
            style={styles.avatar}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}

        {item.isOnline && (
          <View style={styles.onlineDotWrapper} pointerEvents="none">
            <View style={styles.onlineDot} />
          </View>
        )}
      </View>

      {/* Center & Right Content */}
      <View style={styles.contentWrap}>
        {/* Row 1: Worker Name + Timestamp */}
        <View style={styles.topRow}>
          <Text
            style={[styles.workerName, isUnread && styles.workerNameUnread]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            {trimmedName}
          </Text>

          <Text
            style={[styles.timestamp, isUnread && styles.timestampUnread]}
            maxFontSizeMultiplier={1.2}
          >
            {timeLabel}
          </Text>
        </View>

        {/* Row 2: Secondary Metadata (Category · Status) */}
        <View style={styles.metaRow}>
          <Text style={styles.categoryText} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {item.categoryName || 'Service'}
          </Text>
          {statusInfo && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text
                style={[styles.statusText, { color: statusInfo.color }]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
              >
                {statusInfo.label}
              </Text>
            </>
          )}
        </View>

        {/* Row 3: Message preview & Unread indicator */}
        <View style={styles.bottomRow}>
          <View style={styles.previewWrapper}>
            {isOutgoing && !isTyping && (
              <CheckCheck size={14} color="#94A3B8" style={styles.outgoingIcon} />
            )}
            <Text
              style={[
                styles.messagePreview,
                isUnread && styles.messagePreviewUnread,
                isTyping && styles.typingPreview,
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
            >
              {isTyping ? (
                'Typing...'
              ) : (
                <>
                  {isOutgoing ? <Text style={styles.youPrefix}>You: </Text> : null}
                  {item.lastMessage}
                </>
              )}
            </Text>
          </View>

          {isUnread && (
            item.unreadCount > 1 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            ) : (
              <View style={styles.unreadDot} />
            )
          )}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  rowPressed: {
    backgroundColor: '#F8FAFC',
  },
  avatarContainer: {
    position: 'relative',
    width: 50,
    height: 50,
    marginRight: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F1F5F9',
  },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 18,
    color: '#0F172A',
  },
  onlineDotWrapper: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16A34A',
  },
  contentWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  workerName: {
    flex: 1,
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: '#0F172A',
    marginRight: 8,
  },
  workerNameUnread: {
    fontFamily: fontFamily.jakarta.bold,
    color: '#0F172A',
  },
  timestamp: {
    fontFamily: fontFamily.inter.regular,
    fontSize: 12,
    color: '#94A3B8',
  },
  timestampUnread: {
    fontFamily: fontFamily.inter.semiBold,
    color: '#16A34A',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 5,
  },
  categoryText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 13,
    lineHeight: 17,
    color: '#64748B',
  },
  metaDot: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '700',
  },
  statusText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 12.5,
    lineHeight: 17,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  outgoingIcon: {
    marginRight: 4,
  },
  messagePreview: {
    flex: 1,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 14,
    lineHeight: 19,
    color: '#64748B',
  },
  messagePreviewUnread: {
    fontFamily: fontFamily.jakarta.medium,
    color: '#0F172A',
  },
  typingPreview: {
    fontFamily: fontFamily.jakarta.medium,
    color: '#16A34A',
  },
  youPrefix: {
    fontFamily: fontFamily.jakarta.medium,
    color: '#94A3B8',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
    marginLeft: 6,
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: 6,
  },
  unreadBadgeText: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 10.5,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
});
