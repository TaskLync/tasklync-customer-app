import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationBell } from '../home/NotificationBell';
import { fontFamily } from '../../design/typography';
import { colors, palette } from '../../design/colors';

interface MessagesHeaderProps {
  totalUnreadCount?: number;
}

export const MessagesHeader: React.FC<MessagesHeaderProps> = ({ totalUnreadCount = 0 }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 14) + 6 }]}>
      <View style={styles.titleRow}>
        <Text style={styles.title} maxFontSizeMultiplier={1.2}>
          Messages
        </Text>
        {totalUnreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {totalUnreadCount}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.actionWrap}>
        <NotificationBell size={38} iconSize={20} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: colors.bgCard,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 28,
    lineHeight: 34,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  unreadBadge: {
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primaryBorderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 12,
    color: colors.primaryDark,
  },
  actionWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
