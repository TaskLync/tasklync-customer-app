import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ConversationFilterTab } from '../../types/chat.types';
import { fontFamily } from '../../design/typography';

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

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 9,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabPressed: {
    opacity: 0.85,
  },
  tabText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 13.5,
    color: '#64748B',
  },
  tabTextActive: {
    fontFamily: fontFamily.jakarta.semiBold,
    color: '#16A34A',
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countBadgeActive: {
    backgroundColor: '#DCFCE7',
  },
  countText: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 10.5,
    color: '#64748B',
  },
  countTextActive: {
    color: '#16A34A',
  },
});
