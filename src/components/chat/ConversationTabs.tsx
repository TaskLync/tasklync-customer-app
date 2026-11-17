import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
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

const SLIDE = { duration: 220, easing: Easing.out(Easing.cubic) };

/**
 * Quiet, left-aligned filter: text labels with a single neutral pill that slides to the selected
 * filter. No outer container, borders or shadows.
 */
export const ConversationTabs: React.FC<ConversationTabsProps> = ({ activeTab, onTabChange, unreadCount = 0 }) => {
  const styles = useThemedStyles(createStyles);
  const layouts = useRef<Partial<Record<ConversationFilterTab, { x: number; y: number; width: number; height: number }>>>({});
  const [measured, setMeasured] = useState(false);
  const pillX = useSharedValue(0);
  const pillW = useSharedValue(0);
  const pillY = useSharedValue(0);
  const pillH = useSharedValue(0);

  const moveTo = useCallback(
    (tab: ConversationFilterTab, animate: boolean) => {
      const l = layouts.current[tab];
      if (!l) return;
      pillX.value = animate ? withTiming(l.x, SLIDE) : l.x;
      pillW.value = animate ? withTiming(l.width, SLIDE) : l.width;
      pillY.value = l.y;
      pillH.value = l.height;
    },
    [pillX, pillW, pillY, pillH]
  );

  useEffect(() => {
    moveTo(activeTab, measured);
  }, [activeTab, measured, moveTo]);

  const onTabLayout = (id: ConversationFilterTab) => (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    layouts.current[id] = { x, y, width, height };
    // Width changes (e.g. the unread count appearing) re-seat the pill without animating.
    if (id === activeTab) moveTo(id, false);
    if (!measured && TABS.every((t) => layouts.current[t.id])) setMeasured(true);
  };

  const pillStyle = useAnimatedStyle(() => ({
    width: pillW.value,
    height: pillH.value,
    transform: [{ translateX: pillX.value }, { translateY: pillY.value }],
  }));

  return (
    <View style={styles.container} accessibilityRole="tablist">
      <Animated.View style={[styles.pill, pillStyle, !measured && styles.hidden]} pointerEvents="none" />
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const count = tab.id === 'unread' && unreadCount > 0 ? unreadCount : 0;

        return (
          <Pressable
            key={tab.id}
            onLayout={onTabLayout(tab.id)}
            onPress={() => !isActive && onTabChange(tab.id)}
            hitSlop={{ top: 6, bottom: 6 }}
            style={({ pressed }) => [styles.tab, pressed && !isActive && styles.tabPressed]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={count ? `${tab.label}, ${count} unread` : tab.label}
          >
            <Text style={[styles.label, isActive && styles.labelActive]} maxFontSizeMultiplier={1.3}>
              {tab.label}
            </Text>
            {count > 0 && (
              <Text style={[styles.count, isActive && styles.countActive]} maxFontSizeMultiplier={1.3}>
                {count > 99 ? '99+' : count}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 8,
      gap: 2,
      backgroundColor: colors.neutralBg,
    },
    pill: {
      position: 'absolute',
      left: 0,
      top: 0,
      borderRadius: 18,
      backgroundColor: colors.neutralFill,
    },
    hidden: {
      opacity: 0,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 36,
      paddingHorizontal: 14,
      borderRadius: 18,
      gap: 6,
    },
    tabPressed: {
      opacity: 0.6,
    },
    label: {
      fontFamily: fontFamily.jakarta.medium,
      fontSize: 14,
      color: colors.neutralInkSecondary,
      includeFontPadding: false,
    },
    labelActive: {
      fontFamily: fontFamily.jakarta.semiBold,
      color: colors.neutralInk,
    },
    count: {
      fontFamily: fontFamily.inter.semiBold,
      fontSize: 12,
      color: colors.neutralInkSecondary,
      includeFontPadding: false,
      fontVariant: ['tabular-nums'],
    },
    countActive: {
      color: colors.neutralInk,
    },
  });
