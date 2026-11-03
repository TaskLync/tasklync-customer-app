import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { colors, palette } from '../../../design';

/**
 * Booking-success hero.
 *
 * Timeline (all on the UI thread, ~1.3s total):
 *   0   – 650ms  thin line fills 0 → 100%
 *   650 – 990ms  line morphs into a circle (same view, so it is seamless)
 *   830 – 1150ms white check draws itself (stroke-dash) with a slight scale-in
 *   910 – 1250ms circle "pops" 1 → 1.06 → 1 (damped spring, no bounce)
 *   950 – 1550ms soft glow ring expands once and fades
 *   910ms+       `reveal` runs 0 → 1 so sibling content can fade up in sequence
 */

const LINE_WIDTH = 176;
const LINE_HEIGHT = 12;
const CIRCLE_SIZE = 88;

const CHECK_PATH = 'M28 45 L39 56 L60 33';
const CHECK_LENGTH = 48; // slightly above the real path length (~46.7)

const FILL_MS = 650;
const MORPH_MS = 340;

const easeOutExpo = Easing.bezier(0.16, 1, 0.3, 1);
const easeOutCubic = Easing.bezier(0.33, 1, 0.68, 1);
const easeFill = Easing.bezier(0.32, 0.72, 0, 1);

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface SuccessCelebrationProps {
  /** Driven 0 → 1 once the circle forms; consumed by <Reveal /> siblings. */
  reveal: SharedValue<number>;
}

export const SuccessCelebration: React.FC<SuccessCelebrationProps> = ({ reveal }) => {
  const reduceMotion = useReducedMotion();

  const fill = useSharedValue(0);
  const morph = useSharedValue(0);
  const check = useSharedValue(0);
  const pop = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      fill.value = 1;
      morph.value = 1;
      check.value = 1;
      reveal.value = withTiming(1, { duration: 200 });
      return;
    }

    const morphAt = FILL_MS;

    fill.value = withTiming(1, { duration: FILL_MS, easing: easeFill });
    morph.value = withDelay(morphAt, withTiming(1, { duration: MORPH_MS, easing: easeOutExpo }));
    check.value = withDelay(
      morphAt + 180,
      withTiming(1, { duration: 320, easing: easeOutCubic }),
    );
    pop.value = withDelay(
      morphAt + 260,
      withSequence(
        withTiming(1.06, { duration: 140, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 22, stiffness: 320, mass: 0.8 }),
      ),
    );
    glow.value = withDelay(
      morphAt + 300,
      withTiming(1, { duration: 600, easing: easeOutCubic }),
    );
    reveal.value = withDelay(
      morphAt + 260,
      withTiming(1, { duration: 650, easing: Easing.linear }),
    );
  }, [reduceMotion, fill, morph, check, pop, glow, reveal]);

  // Gray rail the line fills along; fades out as the morph begins.
  const trackStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, morph.value * 3),
  }));

  // One green view: grows as a line, then morphs into the circle.
  const shapeStyle = useAnimatedStyle(() => {
    const width = fill.value * LINE_WIDTH + (CIRCLE_SIZE - LINE_WIDTH) * morph.value;
    const height = LINE_HEIGHT + (CIRCLE_SIZE - LINE_HEIGHT) * morph.value;
    return {
      width,
      height,
      borderRadius: height / 2,
      left: morph.value > 0 ? (LINE_WIDTH - width) / 2 : 0,
      top: (CIRCLE_SIZE - height) / 2,
      shadowOpacity: 0.28 * morph.value,
      elevation: 6 * morph.value,
    };
  });

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  const checkWrapStyle = useAnimatedStyle(() => ({
    opacity: check.value > 0.02 ? 1 : 0,
    transform: [{ scale: interpolate(check.value, [0, 1], [0.82, 1]) }],
  }));

  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LENGTH * (1 - check.value),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 0.2, 1], [0, 0.45, 0]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.95, 1.55]) }],
  }));

  return (
    <View style={styles.container} accessible accessibilityLabel="Booking confirmed">
      <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />
      <Animated.View style={[styles.stage, popStyle]}>
        <Animated.View style={[styles.track, trackStyle]} />
        <Animated.View style={[styles.shape, shapeStyle]} />
        <Animated.View style={[styles.checkWrap, checkWrapStyle]}>
          <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} viewBox="0 0 88 88">
            <AnimatedPath
              d={CHECK_PATH}
              stroke={palette.white}
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={`${CHECK_LENGTH} ${CHECK_LENGTH}`}
              animatedProps={checkProps}
            />
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: LINE_WIDTH,
    height: CIRCLE_SIZE,
    alignSelf: 'center',
    marginBottom: 32,
  },
  stage: {
    width: LINE_WIDTH,
    height: CIRCLE_SIZE,
  },
  track: {
    position: 'absolute',
    left: 0,
    top: (CIRCLE_SIZE - LINE_HEIGHT) / 2,
    width: LINE_WIDTH,
    height: LINE_HEIGHT,
    borderRadius: LINE_HEIGHT / 2,
    backgroundColor: palette.gray200,
  },
  shape: {
    position: 'absolute',
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
  },
  checkWrap: {
    position: 'absolute',
    left: (LINE_WIDTH - CIRCLE_SIZE) / 2,
    top: 0,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
  },
  glow: {
    position: 'absolute',
    left: (LINE_WIDTH - CIRCLE_SIZE) / 2,
    top: 0,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: colors.primary,
  },
});
