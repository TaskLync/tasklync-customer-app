import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { NotificationItem as NotificationItemType } from '../../types/notification.types';
import { NotificationIcon } from './NotificationIcon';
import { formatRelativeTime } from '../../utils/groupByDate';
import { fontFamily } from '../../design';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface NotificationItemProps {
  item: NotificationItemType;
  onPress: (item: NotificationItemType) => void;
}

/** Row geometry, shared with the divider inset and the loading skeleton. */
export const NOTIFICATION_ROW = {
  paddingH: 20,
  icon: 40,
  gap: 12,
} as const;

/**
 * Notification row (list layout, no card):
 *   [icon]  Title ............................ 2h
 *           Description (up to 3 lines)
 * Unread = small green dot at the left edge + semibold title. Read rows keep full contrast, only lighter weight.
 */
export const NotificationItem: React.FC<NotificationItemProps> = React.memo(function NotificationItem({ item, onPress }) {
  const styles = useThemedStyles(createStyles);
  const handlePress = useCallback(() => onPress(item), [item, onPress]);

  const isUnread = !item.is_read;
  const time = formatRelativeTime(item.created_at);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${isUnread ? 'Unread. ' : ''}${item.title}. ${item.body}. ${time}`}
    >
      {isUnread ? <View style={styles.unreadDot} /> : null}

      <NotificationIcon category={item.category} templateKey={item.template_key} size={18} containerSize={NOTIFICATION_ROW.icon} />

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, isUnread ? styles.titleUnread : styles.titleRead]}
            numberOfLines={2}
            maxFontSizeMultiplier={1.3}
          >
            {item.title}
          </Text>
          <Text style={styles.time} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {time}
          </Text>
        </View>
        {item.body ? (
          <Text style={styles.body} numberOfLines={3} maxFontSizeMultiplier={1.3}>
            {item.body}
          </Text>
        ) : null}
      </View>

      <View style={styles.divider} />
    </Pressable>
  );
});

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: NOTIFICATION_ROW.paddingH,
    paddingVertical: 14,
    backgroundColor: colors.bgCard,
  },
  rowPressed: {
    backgroundColor: colors.bgHover,
  },
  unreadDot: {
    position: 'absolute',
    left: 7,
    top: 30,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primaryDark,
  },
  content: {
    flex: 1,
    minWidth: 0,
    marginLeft: NOTIFICATION_ROW.gap,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  titleUnread: {
    fontFamily: fontFamily.jakarta.semiBold,
  },
  titleRead: {
    fontFamily: fontFamily.jakarta.medium,
  },
  time: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    lineHeight: 20,
    color: colors.textMuted,
    flexShrink: 0,
  },
  body: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: 3,
  },
  // Hairline under the text column only (aligned with the title), Apple-style.
  divider: {
    position: 'absolute',
    left: NOTIFICATION_ROW.paddingH + NOTIFICATION_ROW.icon + NOTIFICATION_ROW.gap,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
