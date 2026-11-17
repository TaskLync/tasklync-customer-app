import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { typography } from '../../design/typography';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Small count shown after the label (hidden when 0 / undefined). */
  badge?: number | undefined;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

const HEIGHT = 44;
const PAD = 4;
const SLIDE = { duration: 220, easing: Easing.out(Easing.cubic) };

/**
 * Neutral track with one white selection surface that slides between segments. No opacity
 * fades (on a white screen those read as a white flash), no Android elevation (it draws its own
 * shadow layer): the thumb is a plain rounded surface with a hairline edge.
 */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const styles = useThemedStyles(createStyles);
  const [width, setWidth] = useState(0);
  const segW = width > 0 ? (width - PAD * 2) / options.length : 0;
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  const x = useSharedValue(0);
  const [placed, setPlaced] = useState(false);
  useEffect(() => {
    if (!segW) return;
    x.value = placed ? withTiming(index * segW, SLIDE) : index * segW;
    if (!placed) setPlaced(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, segW]);

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      style={styles.track}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      {segW > 0 && <Animated.View style={[styles.thumb, { width: segW, opacity: placed ? 1 : 0 }, thumbStyle]} pointerEvents="none" />}
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => !selected && onChange(o.value)}
            style={({ pressed }) => [styles.segment, pressed && !selected && styles.segmentPressed]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={o.badge ? `${o.label}, ${o.badge} new` : o.label}
          >
            <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1} maxFontSizeMultiplier={1.25}>
              {o.label}
            </Text>
            {!!o.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText} maxFontSizeMultiplier={1.1}>
                  {o.badge > 99 ? '99+' : o.badge}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = ({ colors, palette }: AppTheme) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      minHeight: HEIGHT,
      padding: PAD,
      borderRadius: 14,
      backgroundColor: colors.searchFieldBg,
    },
    thumb: {
      position: 'absolute',
      top: PAD,
      bottom: PAD,
      left: PAD,
      borderRadius: 10,
      backgroundColor: colors.segmentThumb,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    segment: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: 10,
      paddingHorizontal: 8,
    },
    segmentPressed: {
      backgroundColor: colors.buttonSecondaryPressed,
    },
    label: {
      fontFamily: typography.fontFamily.jakarta.medium,
      fontSize: 14,
      color: colors.textMuted,
    },
    labelSelected: {
      fontFamily: typography.fontFamily.jakarta.semiBold,
      color: colors.textPrimary,
    },
    badge: {
      minWidth: 18,
      height: 18,
      paddingHorizontal: 5,
      borderRadius: 9,
      backgroundColor: colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      fontFamily: typography.fontFamily.inter.semiBold,
      fontSize: 10.5,
      color: palette.green700,
      includeFontPadding: false,
    },
  });
