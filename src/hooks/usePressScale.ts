import { useCallback } from 'react';
import { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * Lightweight press feedback: a quick, subtle scale-down on press and a short ease-out back on
 * release. Timing-based (no spring) so there is never any overshoot or bounce, and it runs on the
 * UI thread.
 */
export function usePressScale(pressedScale = 0.985) {
  const scale = useSharedValue(1);

  const onPressIn = useCallback(() => {
    scale.value = withTiming(pressedScale, { duration: 90, easing: Easing.out(Easing.quad) });
  }, [scale, pressedScale]);

  const onPressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return { onPressIn, onPressOut, animatedStyle };
}
