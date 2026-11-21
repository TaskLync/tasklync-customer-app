import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  type AppIconComponent,
  ChatBubbleIcon,
  CheckDoubleIcon,
  SearchIcon,
} from '../ui/Icon/icons';
import { ConversationFilterTab } from '../../types/chat.types';
import { fontFamily } from '../../design/typography';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface ConversationEmptyStateProps {
  searchQuery: string;
  activeTab: ConversationFilterTab;
  onClearSearch: () => void;
  onResetTab: () => void;
}

interface Copy {
  icon: AppIconComponent;
  title: string;
  body: string;
  action: string;
  onAction: () => void;
}

export const ConversationEmptyState: React.FC<ConversationEmptyStateProps> = ({
  searchQuery,
  activeTab,
  onClearSearch,
  onResetTab,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const explore = () => router.push('/(tabs)/explore');
  const query = searchQuery.trim();

  const copy: Copy = query
    ? {
        icon: SearchIcon,
        title: 'No matches',
        body: `Nothing matches “${query}”. Try a worker’s name or a service.`,
        action: 'Clear search',
        onAction: onClearSearch,
      }
    : activeTab === 'unread'
    ? {
        icon: CheckDoubleIcon,
        title: 'You’re all caught up',
        body: 'New messages from workers will show up here.',
        action: 'View all messages',
        onAction: onResetTab,
      }
    : activeTab === 'active'
    ? {
        icon: ChatBubbleIcon,
        title: 'No active conversations',
        body: 'Chats for bookings that are scheduled or in progress appear here.',
        action: 'Explore services',
        onAction: explore,
      }
    : {
        icon: ChatBubbleIcon,
        title: 'No conversations yet',
        body: 'When you book a service, your conversations with workers will appear here.',
        action: 'Explore services',
        onAction: explore,
      };

  const Icon = copy.icon;

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Icon size={24} strokeWidth={1.75} color={colors.neutralInkSecondary} />
      </View>
      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
        {copy.title}
      </Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.3}>
        {copy.body}
      </Text>
      <Pressable
        onPress={copy.onAction}
        style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        accessibilityRole="button"
        hitSlop={4}
      >
        <Text style={styles.actionText} maxFontSizeMultiplier={1.3}>
          {copy.action}
        </Text>
      </Pressable>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      paddingBottom: 48,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.neutralFill,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    title: {
      fontFamily: fontFamily.jakarta.semiBold,
      fontSize: 17,
      lineHeight: 24,
      letterSpacing: -0.2,
      color: colors.neutralInk,
      textAlign: 'center',
    },
    body: {
      marginTop: 6,
      maxWidth: 290,
      fontFamily: fontFamily.jakarta.regular,
      fontSize: 14,
      lineHeight: 21,
      color: colors.neutralInkSecondary,
      textAlign: 'center',
    },
    action: {
      marginTop: 22,
      minHeight: 40,
      paddingHorizontal: 18,
      borderRadius: 20,
      backgroundColor: colors.neutralFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionPressed: {
      backgroundColor: colors.neutralFillPressed,
    },
    actionText: {
      fontFamily: fontFamily.jakarta.semiBold,
      fontSize: 14,
      color: colors.neutralInk,
    },
  });
