import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

/** Geometry (dp): 50 × 30 track, 24 thumb, 3 inset on every side. */
export const SWITCH = { width: 50, height: 30, thumb: 24, inset: 3, stretch: 4 } as const;
const TRAVEL = SWITCH.width - SWITCH.thumb - SWITCH.inset * 2; // 20

const SLIDE = { duration: 220, easing: Easing.bezier(0.25, 0.1, 0.25, 1) };
const PRESS = { duration: 140, easing: Easing.out(Easing.quad) };

export interface SwitchProps {
  value: boolean;
  /** Omit when a parent row owns the press (pass `pressed` instead). */
  onValueChange?: (next: boolean) => void;
  disabled?: boolean;
  /** Press feedback driven by a parent row: the thumb stretches like a native switch. */
  pressed?: boolean;
  accessibilityLabel?: string;
}

/**
 * Tasklync switch. Brand green ON track, soft neutral OFF track, white thumb on both, one 220 ms
 * slide + colour cross-fade on the UI thread. Mounts at its value without animating, so screens
 * never flicker on open. State is carried by thumb position as well as colour.
 */
export const Switch: React.FC<SwitchProps> = ({ value, onValueChange, disabled = false, pressed, accessibilityLabel }) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const progress = useSharedValue(value ? 1 : 0);
  const press = useSharedValue(0);
  const [selfPressed, setSelfPressed] = React.useState(false);
  const isPressed = pressed ?? selfPressed;

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, SLIDE);
  }, [value, progress]);

  useEffect(() => {
    press.value = withTiming(isPressed && !disabled ? 1 : 0, PRESS);
  }, [isPressed, disabled, press]);

  const offColor = colors.switchTrackOff;
  const onColor = colors.buttonPrimary;
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [offColor, onColor]),
  }));

  const thumbStyle = useAnimatedStyle(() => {
    const stretch = press.value * SWITCH.stretch;
    // Stretch toward the centre: ON grows leftwards, OFF grows rightwards.
    const x = interpolate(progress.value, [0, 1], [0, TRAVEL - stretch]);
    return { width: SWITCH.thumb + stretch, transform: [{ translateX: x }] };
  });

  const body = (
    <Animated.View style={[styles.track, trackStyle, disabled && styles.disabled]}>
      <Animated.View style={[styles.thumb, thumbStyle]} />
    </Animated.View>
  );

  if (!onValueChange) {
    // Decorative inside an accessible row: the row announces the switch.
    return (
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden pointerEvents="none">
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      onPressIn={() => setSelfPressed(true)}
      onPressOut={() => setSelfPressed(false)}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
    >
      {body}
    </Pressable>
  );
};

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    track: {
      width: SWITCH.width,
      height: SWITCH.height,
      borderRadius: SWITCH.height / 2,
      padding: SWITCH.inset,
      justifyContent: 'center',
    },
    thumb: {
      height: SWITCH.thumb,
      borderRadius: SWITCH.thumb / 2,
      backgroundColor: colors.pureWhite,
      // One soft, tight shadow so the white thumb reads on the light OFF track.
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 2,
      elevation: 2,
    },
    disabled: {
      opacity: 0.45,
    },
  });
