import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { CheckCheck } from 'lucide-react-native';
import { ConversationItem } from '../../types/chat.types';
import { fontFamily } from '../../design/typography';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface ConversationRowProps {
  item: ConversationItem;
  onPress: (item: ConversationItem) => void;
}

/** Layout constants shared with the skeleton and the inset separator. */
export const CONVERSATION_ROW = {
  gutter: 20,
  avatar: 52,
  avatarGap: 14,
  /** x where the text column starts: separators are inset to here. */
  textInset: 20 + 52 + 14,
} as const;

/**
 * Native inbox conventions:
 * < 1 min "Now" · today "9:48 PM" · yesterday "Yesterday" · < 7 days weekday "Tue" · older "Mar 4" (+ year).
 */
export function formatConversationTimestamp(dateString: string | null | undefined, now: Date = new Date()): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const diffMs = now.getTime() - date.getTime();
  if (diffMs >= 0 && diffMs < 60_000) return 'Now';

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  try {
    if (dayDiff <= 0) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    if (dayDiff === 1) return 'Yesterday';
    if (dayDiff < 7) return date.toLocaleDateString(undefined, { weekday: 'short' });
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
    });
  } catch {
    return '';
  }
}

export type StatusTone = 'live' | 'waiting' | 'done' | 'closed';

/**
 * Booking status → label + tone. Labels/mapping are unchanged from the previous design (CANCELLED
 * still reads "Rejected"); the tone only picks the grayscale mark drawn next to the label.
 */
export function getBookingStatusInfo(rawStatus: string | undefined): { label: string; tone: StatusTone } | null {
  if (!rawStatus) return null;
  const s = rawStatus.toUpperCase();
  switch (s) {
    case 'AVAILABLE':
      return null;
    case 'PENDING':
      return { label: 'Pending', tone: 'waiting' };
    case 'ACCEPTED':
      return { label: 'Accepted', tone: 'live' };
    case 'IN_PROGRESS':
    case 'ACTIVE':
      return { label: 'Active', tone: 'live' };
    case 'COMPLETED':
      return { label: 'Completed', tone: 'done' };
    case 'REJECTED':
    case 'CANCELLED':
      return { label: 'Rejected', tone: 'closed' };
    default:
      return {
        label: s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
        tone: 'done',
      };
  }
}

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : '';
  return (first + last).toUpperCase() || '?';
}

/** Shape carries the meaning (filled / ring / soft / dash), so status reads without colour. */
const StatusMark: React.FC<{ tone: StatusTone; styles: ReturnType<typeof createStyles> }> = ({ tone, styles }) => {
  const style =
    tone === 'live'
      ? styles.markLive
      : tone === 'waiting'
      ? styles.markWaiting
      : tone === 'done'
      ? styles.markDone
      : styles.markClosed;
  return <View style={style} />;
};

export const ConversationRow = React.memo(function ConversationRow({ item, onPress }: ConversationRowProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const name = item.workerName?.trim() || 'Service Professional';
  const timeLabel = formatConversationTimestamp(item.lastMessageAt);
  const isUnread = item.unreadCount > 0;
  const isOutgoing = item.lastMessageSenderType === 'user' || item.lastMessageSenderType === 'customer';
  const isTyping = Boolean((item as any).isTyping);
  const status = getBookingStatusInfo(item.bookingStatus);
  const category = item.categoryName || 'Service';
  const preview = item.lastMessage?.trim() || '';
  const showImage = Boolean(item.workerAvatarUrl) && !avatarFailed;

  const a11y = [
    name,
    item.isOnline ? 'online' : null,
    category,
    status?.label,
    isUnread ? `${item.unreadCount} unread` : null,
    isTyping ? 'typing' : preview ? `${isOutgoing ? 'You: ' : ''}${preview}` : null,
    timeLabel,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityHint="Opens the conversation"
    >
      <View style={styles.avatarWrap}>
        {showImage ? (
          <Image
            source={{ uri: item.workerAvatarUrl }}
            style={styles.avatar}
            resizeMode="cover"
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.initials} maxFontSizeMultiplier={1.1}>
              {initialsOf(name)}
            </Text>
          </View>
        )}
        {item.isOnline && <View style={styles.onlineDot} pointerEvents="none" />}
      </View>

      <View style={styles.body}>
        {/* Line 1 — who / when */}
        <View style={styles.line}>
          <Text style={[styles.name, isUnread && styles.nameUnread]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {name}
          </Text>
          {!!timeLabel && (
            <Text style={[styles.time, isUnread && styles.timeUnread]} maxFontSizeMultiplier={1.3}>
              {timeLabel}
            </Text>
          )}
        </View>

        {/* Line 2 — what was said */}
        <View style={[styles.line, styles.previewLine]}>
          <View style={styles.previewWrap}>
            {isOutgoing && !isTyping && !!preview && (
              <CheckCheck size={15} strokeWidth={2} color={colors.neutralInkSecondary} style={styles.receipt} />
            )}
            <Text
              style={[styles.preview, isUnread && styles.previewUnread, isTyping && styles.typing]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {isTyping ? 'typing…' : preview ? (isOutgoing ? `You: ${preview}` : preview) : 'No messages yet'}
            </Text>
          </View>
          {isUnread && (
            <View style={styles.unread}>
              <Text style={styles.unreadText} maxFontSizeMultiplier={1.2}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>

        {/* Line 3 — context */}
        <View style={styles.meta}>
          <Text style={styles.metaText} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {category}
          </Text>
          {status && (
            <>
              <View style={styles.metaSep} />
              <StatusMark tone={status.tone} styles={styles} />
              <Text
                style={[styles.metaText, styles.statusText, status.tone === 'live' && styles.statusLive]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {status.label}
              </Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
});

const MARK = 6;

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: CONVERSATION_ROW.gutter,
      paddingVertical: 14,
      backgroundColor: colors.neutralBg,
    },
    rowPressed: {
      backgroundColor: colors.neutralFill,
    },

    avatarWrap: {
      width: CONVERSATION_ROW.avatar,
      height: CONVERSATION_ROW.avatar,
      marginRight: CONVERSATION_ROW.avatarGap,
      marginTop: 1,
    },
    avatar: {
      width: CONVERSATION_ROW.avatar,
      height: CONVERSATION_ROW.avatar,
      borderRadius: CONVERSATION_ROW.avatar / 2,
      backgroundColor: colors.neutralFill,
    },
    avatarFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    initials: {
      fontFamily: fontFamily.jakarta.semiBold,
      fontSize: 17,
      letterSpacing: 0.3,
      color: colors.neutralInkSecondary,
      includeFontPadding: false,
    },
    onlineDot: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 13,
      height: 13,
      borderRadius: 6.5,
      backgroundColor: colors.neutralInk,
      borderWidth: 2.5,
      borderColor: colors.neutralBg,
    },

    body: {
      flex: 1,
      minWidth: 0,
    },
    line: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    name: {
      flex: 1,
      marginRight: 12,
      fontFamily: fontFamily.jakarta.semiBold,
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: -0.2,
      color: colors.neutralInk,
    },
    nameUnread: {
      fontFamily: fontFamily.jakarta.bold,
    },
    time: {
      fontFamily: fontFamily.inter.regular,
      fontSize: 12.5,
      color: colors.neutralInkSecondary,
      fontVariant: ['tabular-nums'],
    },
    timeUnread: {
      fontFamily: fontFamily.inter.semiBold,
      color: colors.neutralInk,
    },

    previewLine: {
      marginTop: 2,
    },
    previewWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 12,
      minWidth: 0,
    },
    receipt: {
      marginRight: 5,
    },
    preview: {
      flex: 1,
      fontFamily: fontFamily.jakarta.regular,
      fontSize: 14.5,
      lineHeight: 20,
      color: colors.neutralInkSecondary,
    },
    previewUnread: {
      fontFamily: fontFamily.jakarta.medium,
      color: colors.neutralInk,
    },
    typing: {
      fontFamily: fontFamily.jakarta.medium,
      fontStyle: 'italic',
      color: colors.neutralInk,
    },
    unread: {
      minWidth: 20,
      height: 20,
      paddingHorizontal: 6,
      borderRadius: 10,
      backgroundColor: colors.neutralInk,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unreadText: {
      fontFamily: fontFamily.inter.semiBold,
      fontSize: 11.5,
      color: colors.neutralOnInk,
      includeFontPadding: false,
      fontVariant: ['tabular-nums'],
    },

    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      minWidth: 0,
    },
    metaText: {
      flexShrink: 1,
      fontFamily: fontFamily.jakarta.regular,
      fontSize: 13,
      lineHeight: 17,
      color: colors.neutralInkSecondary,
    },
    metaSep: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      marginHorizontal: 8,
      backgroundColor: colors.neutralInkTertiary,
    },
    statusText: {
      flexShrink: 0,
      marginLeft: 6,
    },
    statusLive: {
      fontFamily: fontFamily.jakarta.medium,
      color: colors.neutralInk,
    },
    markLive: {
      width: MARK,
      height: MARK,
      borderRadius: MARK / 2,
      backgroundColor: colors.neutralInk,
    },
    markWaiting: {
      width: MARK + 1,
      height: MARK + 1,
      borderRadius: (MARK + 1) / 2,
      borderWidth: 1.5,
      borderColor: colors.neutralInkSecondary,
    },
    markDone: {
      width: MARK,
      height: MARK,
      borderRadius: MARK / 2,
      backgroundColor: colors.neutralInkTertiary,
    },
    markClosed: {
      width: MARK + 2,
      height: 1.5,
      borderRadius: 1,
      backgroundColor: colors.neutralInkSecondary,
    },
  });
