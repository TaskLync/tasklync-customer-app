import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import { TabType } from '../../hooks/useBookingsList';
import { BookingsTabIndicator } from './BookingsTabIndicator';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface BookingsTabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const TABS: { id: TabType; label: string }[] = [
  { id: 'ACTIVE', label: 'Active' },
  { id: 'PAST', label: 'Past' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export function BookingsTabBar({ activeTab, onTabChange }: BookingsTabBarProps) {
  const styles = useThemedStyles(createStyles);
  const [tabWidth, setTabWidth] = useState(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    setTabWidth(e.nativeEvent.layout.width / TABS.length);
  };

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            style={styles.tab}
            onPress={() => onTabChange(tab.id)}
          >
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
      
      {tabWidth > 0 && (
        <BookingsTabIndicator activeTab={activeTab} tabWidth={tabWidth} />
      )}
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgCard,
    position: 'relative',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabLabel: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: colors.primaryDark,
  },
});
