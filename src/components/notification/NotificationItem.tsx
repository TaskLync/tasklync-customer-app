import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { NotificationItem as NotificationItemType } from '../../types/notification.types';
import { NotificationIcon } from './NotificationIcon';
import { formatRelativeTime } from '../../utils/groupByDate';
import { colors, palette, fontFamily, radius, shadows } from '../../design';

export interface NotificationItemProps {
  item: NotificationItemType;
  onPress: (item: NotificationItemType) => void;
}

/**
 * NotificationItem Component
 *
 * Minimalist, production-grade notification card:
 * - Neutral white card surface with subtle 1px border
 * - Top-aligned 38px category icon
 * - Natural wrapping titles (up to 2 lines) and readable descriptions (up to 3 lines)
 * - Muted relative timestamp aligned to the top-right
 * - Small 7px green unread indicator dot positioned beside the title (unread only)
 * - Understated visual distinction between read and unread states
 */
export const NotificationItem: React.FC<NotificationItemProps> = React.memo(
  function NotificationItem({ item, onPress }) {
    const handlePress = useCallback(() => {
      onPress(item);
    }, [item, onPress]);

    const isUnread = !item.is_read;
    const timeDisplay = formatRelativeTime(item.created_at);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.container,
          isUnread ? styles.containerUnread : styles.containerRead,
          pressed && styles.containerPressed,
        ]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${item.body}, ${timeDisplay}, ${
          isUnread ? 'unread' : 'read'
        }`}
        accessibilityState={{ selected: isUnread }}
      >
        {/* Category Icon */}
        <NotificationIcon
          category={item.category}
          templateKey={item.template_key}
          size={18}
          containerSize={38}
          style={styles.iconWrapper}
        />

        {/* Content Details */}
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.title,
                  isUnread ? styles.titleUnread : styles.titleRead,
                ]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              {isUnread && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.timeText}>{timeDisplay}</Text>
          </View>

          <Text
            style={[
              styles.body,
              isUnread ? styles.bodyUnread : styles.bodyRead,
            ]}
            numberOfLines={3}
          >
            {item.body}
          </Text>
        </View>
      </Pressable>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  containerUnread: {
    backgroundColor: palette.white,
    borderColor: palette.gray200,
    ...shadows.xs,
  },
  containerRead: {
    backgroundColor: palette.white,
    borderColor: palette.gray100,
  },
  containerPressed: {
    backgroundColor: palette.gray50,
    transform: [{ scale: 0.995 }],
  },
  iconWrapper: {
    marginRight: 12,
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    lineHeight: 19,
    flexShrink: 1,
  },
  titleUnread: {
    fontFamily: fontFamily.jakarta.semiBold,
    color: colors.textPrimary,
  },
  titleRead: {
    fontFamily: fontFamily.jakarta.medium,
    color: colors.textSecondary,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primaryDark,
    flexShrink: 0,
  },
  timeText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 11,
    lineHeight: 18,
    color: colors.textMuted,
    flexShrink: 0,
    marginTop: 1,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
  bodyUnread: {
    fontFamily: fontFamily.jakarta.regular,
    color: colors.textSecondary,
  },
  bodyRead: {
    fontFamily: fontFamily.jakarta.regular,
    color: colors.textMuted,
  },
});
