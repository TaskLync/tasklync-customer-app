import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';

export interface RevealProps {
  /** Shared 0 → 1 progress (driven by SuccessCelebration). */
  reveal: SharedValue<number>;
  /** Stagger slot; each slot starts 12% later on the shared timeline. */
  index?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const WINDOW = 0.6;
const STEP = 0.12;
const OFFSET_Y = 12;

/** Fades + lifts children in with an ease-out, slotted into the shared reveal timeline. */
export const Reveal: React.FC<RevealProps> = ({ reveal, index = 0, style, children }) => {
  const start = index * STEP;
  const end = start + WINDOW;

  const animatedStyle = useAnimatedStyle(() => {
    const t = interpolate(reveal.value, [start, end], [0, 1], Extrapolation.CLAMP);
    const eased = 1 - Math.pow(1 - t, 3);
    return {
      opacity: eased,
      transform: [{ translateY: (1 - eased) * OFFSET_Y }],
    };
  });

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};
