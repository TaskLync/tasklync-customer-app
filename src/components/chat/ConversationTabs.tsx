import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ConversationFilterTab } from '../../types/chat.types';
import { fontFamily } from '../../design/typography';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface ConversationTabsProps {
  activeTab: ConversationFilterTab;
  onTabChange: (tab: ConversationFilterTab) => void;
  unreadCount?: number;
}

const TABS: { id: ConversationFilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'unread', label: 'Unread' },
];

export const ConversationTabs: React.FC<ConversationTabsProps> = ({
  activeTab,
  onTabChange,
  unreadCount = 0,
}) => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <View style={styles.segmentedControl}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const showCount = tab.id === 'unread' && unreadCount > 0;

          return (
            <Pressable
              key={tab.id}
              onPress={() => onTabChange(tab.id)}
              style={({ pressed }) => [
                styles.tab,
                isActive && styles.tabActive,
                pressed && styles.tabPressed,
                !showCount && styles.tabSingleContent,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${tab.label} filter ${showCount ? `(${unreadCount} unread)` : ''}`}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive && styles.tabTextActive,
                ]}
                maxFontSizeMultiplier={1.2}
              >
                {tab.label}
              </Text>

              {showCount && (
                <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                  <Text style={[styles.countText, isActive && styles.countTextActive]}>
                    {unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: colors.bgCard,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.bgSubtle,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 8,
    gap: 6,
  },
  tabSingleContent: {
    gap: 0,
  },
  tabActive: {
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  tabPressed: {
    opacity: 0.85,
  },
  tabText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  tabTextActive: {
    fontFamily: fontFamily.jakarta.semiBold,
    color: colors.primaryDark,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countBadgeActive: {
    backgroundColor: colors.primaryBorderSubtle,
  },
  countText: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 10.5,
    color: colors.textSecondary,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  countTextActive: {
    color: colors.primaryDark,
  },
});
