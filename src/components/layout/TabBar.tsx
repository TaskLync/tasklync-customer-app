import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, PixelRatio, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Search, Calendar, MessageSquare, User } from 'lucide-react-native';
import { fontFamily } from '../../design/typography';
import { useChatUnreadStore } from '../../store/chatUnread.store';
import { TabBadge } from './TabBadge';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

/**
 * TabBar
 *
 * Senior Mobile UI/UX Uber/Foodpanda/Zomato-grade bottom navigation bar.
 * Architecture & Design:
 * - Minimalist, docked edge-to-edge layout with razor-thin top border
 * - Neutral active / inactive states (neutralInk / tabBarInactive), no brand colour;
 *   both meet WCAG AA on the tab bar surface in light and dark (see colors.ts)
 * - Theme surface background with a hairline top separator (tabBarBorder), no shadow
 * - Active tab: one soft neutral capsule that slides between tabs (UI-thread animation, no re-layout)
 * - Micro notification badge on Messages supporting unread sync and 99+ ceiling
 * - Full compliance with iOS Home Indicator and Android gesture/button safe areas
 * - Accessible touch targets (>= 48dp) and screen-reader accessibility labeling
 */


/** Indicator geometry (dp). Height is even so radius = height / 2 lands on whole pixels. */
const INDICATOR_H = 32;
const INDICATOR_MAX_W = 60;
/** Minimum clear space between the indicator and its tab's edges (never touches a neighbour). */
const INDICATOR_SIDE_GAP = 8;
const TAB_PADDING_TOP = 7;

export const TabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const ACTIVE_COLOR = colors.neutralInk;
  const INACTIVE_COLOR = colors.tabBarInactive;
  const unreadMessageCount = useChatUnreadStore((s) => s.unreadCount);

  // Calculate bottom inset: respect iOS home indicator (typically 34dp) and Android navigation bar (~16-48dp) with intentional breathing room
  const bottomInset =
    insets.bottom > 0 ? insets.bottom + 6 : Platform.OS === 'ios' ? 10 : 8;

  // ── Active indicator ──
  // ONE rounded layer drawn behind the tabs that slides to the focused tab. It has no children
  // and no overflow override, and its geometry is snapped to whole pixels, so Android always
  // rasterises a clean capsule (a rounded background that also hosted the overflowing badge
  // with `overflow: visible` is what could render with mis-drawn corners).
  const tabCount = state.routes.length;
  const [barWidth, setBarWidth] = useState(0);
  const tabWidth = barWidth > 0 ? barWidth / tabCount : 0;
  const indicatorWidth = tabWidth > 0 ? PixelRatio.roundToNearestPixel(Math.min(INDICATOR_MAX_W, tabWidth - INDICATOR_SIDE_GAP * 2)) : 0;
  const indicatorX = (index: number) => PixelRatio.roundToNearestPixel(index * tabWidth + (tabWidth - indicatorWidth) / 2);

  const translateX = useSharedValue(0);
  const [placed, setPlaced] = useState(false);

  useEffect(() => {
    if (!tabWidth) return;
    const x = indicatorX(state.index);
    // First placement (and width changes) jump; switching tabs slides.
    translateX.value = placed ? withTiming(x, { duration: 240, easing: Easing.out(Easing.cubic) }) : x;
    if (!placed) setPlaced(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index, tabWidth, indicatorWidth]);

  const onBarLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setBarWidth((prev) => (Math.abs(prev - w) < 0.5 ? prev : w));
  }, []);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]} onLayout={onBarLayout}>
      {indicatorWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, { width: indicatorWidth, opacity: placed ? 1 : 0 }, indicatorStyle]}
        />
      )}
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        // Label resolution adhering to React Navigation conventions
        const label =
          options.tabBarLabel !== undefined
            ? typeof options.tabBarLabel === 'function'
              ? options.tabBarLabel({ focused: isFocused, color: isFocused ? ACTIVE_COLOR : INACTIVE_COLOR, position: 'below-icon', children: '' })
              : options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name === 'index'
            ? 'Home'
            : route.name.charAt(0).toUpperCase() + route.name.slice(1);

        const badgeCount =
          route.name === 'messages'
            ? unreadMessageCount
            : typeof options.tabBarBadge === 'number'
            ? options.tabBarBadge
            : 0;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const renderIcon = () => {
          const color = isFocused ? ACTIVE_COLOR : INACTIVE_COLOR;
          const strokeWidth = isFocused ? 2.1 : 1.75;
          const size = 22;

          if (options.tabBarIcon) {
            return options.tabBarIcon({ focused: isFocused, color, size });
          }

          const iconProps = { size, color, strokeWidth };

          switch (route.name) {
            case 'index':
              return <Home {...iconProps} />;
            case 'explore':
              return <Search {...iconProps} />;
            case 'bookings':
              return <Calendar {...iconProps} />;
            case 'messages':
              return <MessageSquare {...iconProps} />;
            case 'profile':
              return <User {...iconProps} />;
            default:
              return <Home {...iconProps} />;
          }
        };

        const accessibilityLabel =
          badgeCount > 0
            ? `${label}, ${badgeCount > 99 ? '99 plus' : badgeCount} new notifications`
            : String(label);

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={options.tabBarAccessibilityLabel || accessibilityLabel}
            accessibilityHint={isFocused ? undefined : `Navigates to ${label}`}
            onPress={onPress}
            onLongPress={onLongPress}
            style={({ pressed }) => [
              styles.tab,
              pressed && styles.tabPressed,
            ]}
          >
            <View style={styles.tabContent}>
              {/* Transparent slot the size of the indicator: keeps icon centred on it. */}
              <View style={styles.iconSlot}>
                <View style={styles.iconWrapper}>
                  {renderIcon()}
                  {badgeCount > 0 && <TabBadge count={badgeCount} />}
                </View>
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  isFocused ? styles.labelActive : styles.labelInactive,
                ]}
              >
                {label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.tabBarBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.tabBarBorder,
    width: '100%',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    // Content starts at a fixed offset so the absolute indicator (top: TAB_PADDING_TOP) always
    // lines up with the icon slot, at any font scale.
    justifyContent: 'flex-start',
    minHeight: 48,
    paddingTop: TAB_PADDING_TOP,
    paddingBottom: 2,
  },
  tabPressed: {
    opacity: 0.7,
  },
  tabContent: {
    alignItems: 'center',
  },
  // Selected state: soft neutral capsule, rounded on all four corners (radius = height / 2).
  indicator: {
    position: 'absolute',
    left: 0,
    top: TAB_PADDING_TOP,
    height: INDICATOR_H,
    borderRadius: INDICATOR_H / 2,
    borderCurve: 'continuous',
    backgroundColor: colors.neutralFill,
  },
  iconSlot: {
    height: INDICATOR_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  label: {
    fontSize: 11,
    marginTop: 3,
    textAlign: 'center',
    includeFontPadding: false,
    letterSpacing: -0.1,
  },
  labelActive: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontWeight: '600',
    color: colors.neutralInk,
  },
  labelInactive: {
    fontFamily: fontFamily.jakarta.medium,
    fontWeight: '500',
    color: colors.tabBarInactive,
  },
});
