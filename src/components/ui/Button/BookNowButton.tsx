import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { ArrowRight } from 'lucide-react-native';

import { radius } from '../../../design/radius';
import { fontFamily } from '../../../design/typography';
import { lightPalette } from '../../../design/colors';
import { withAlpha } from '../../../design/colorUtils';
import { usePressScale } from '../../../hooks/usePressScale';
import { useAppTheme } from '../../../theme/useAppTheme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Re-tap lock for handlers that return nothing (e.g. navigation), so a double tap cannot fire twice. */
const REPEAT_LOCK_MS = 700;
/** Fixed dark ink: the onDark variant is a white button in both themes. */
const INK = lightPalette.gray900;

export type BookNowButtonVariant =
  /** Solid white CTA for dark imagery (promo banner). Identical in both themes: the surface behind it is always dark. */
  | 'onDark'
  /** Solid brand-green CTA for card surfaces. Theme-aware. */
  | 'brand';

export interface BookNowButtonProps {
  onPress: () => void | Promise<unknown>;
  variant?: BookNowButtonVariant;
  label?: string;
  showArrow?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPressIn?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export const BookNowButton: React.FC<BookNowButtonProps> = ({
  onPress,
  variant = 'brand',
  label = 'Book Now',
  showArrow = false,
  loading = false,
  disabled = false,
  onPressIn,
  accessibilityLabel,
  accessibilityHint,
  style,
}) => {
  const { colors, palette, isDark } = useAppTheme();
  const press = usePressScale(0.97);
  const [pressed, setPressed] = useState(false);
  const locked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const inactive = disabled || loading;

  const handlePress = useCallback(() => {
    if (inactive || locked.current) return;
    locked.current = true;
    const release = () => { locked.current = false; };
    const result = onPress();
    if (result && typeof (result as Promise<unknown>).finally === 'function') {
      (result as Promise<unknown>).finally(release);
    } else {
      timer.current = setTimeout(release, REPEAT_LOCK_MS);
    }
  }, [inactive, onPress]);

  const tone = (() => {
    if (variant === 'onDark') {
      return {
        bg: palette.pureWhite,
        pressedBg: withAlpha(palette.pureWhite, 0.86),
        text: INK,
        disabledBg: withAlpha(palette.pureWhite, 0.4),
        disabledText: withAlpha(INK, 0.5),
      };
    }
    return {
      bg: palette.green700, // light #15803D (5:1 with white text) / dark #4ADE80 (with dark text)
      pressedBg: isDark ? palette.green600 : palette.green800,
      text: colors.textOnGreen,
      disabledBg: colors.bgHover,
      disabledText: colors.textDisabled,
    };
  })();

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={() => {
        setPressed(true);
        press.onPressIn();
        onPressIn?.();
      }}
      onPressOut={() => {
        setPressed(false);
        press.onPressOut();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[
        styles.base,
        { backgroundColor: disabled ? tone.disabledBg : pressed && !loading ? tone.pressedBg : tone.bg },
        press.animatedStyle,
        style,
      ]}
    >
      {/* Label stays laid out while loading so the button never changes width. */}
      <View style={[styles.content, loading && styles.hidden]}>
        <Text style={[styles.label, { color: disabled ? tone.disabledText : tone.text }]} numberOfLines={1}>
          {label}
        </Text>
        {showArrow ? (
          <ArrowRight size={14} color={disabled ? tone.disabledText : tone.text} strokeWidth={2.2} style={styles.arrow} />
        ) : null}
      </View>
      {loading ? (
        <View style={styles.spinner} pointerEvents="none">
          <ActivityIndicator size="small" color={tone.text} />
        </View>
      ) : null}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 36,
    minWidth: 92,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hidden: {
    opacity: 0,
  },
  label: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  arrow: {
    marginLeft: 6,
  },
  spinner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
