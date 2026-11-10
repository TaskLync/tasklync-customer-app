/**
 * Tasklync skeleton system.
 *
 * Design language (one source of truth for every loading placeholder in the app):
 *   • colour   — SKELETON.color on white / section surfaces
 *   • motion   — a calm opacity pulse (1 → 0.5, 900 ms each way), identical everywhere
 *   • radii    — SKELETON.radius.{text, block, card, pill}
 *
 * Performance model:
 *   • ONE app-wide animation clock (`pulse`) drives every skeleton. It starts when the first
 *     skeleton mounts and is cancelled when the last one unmounts — no per-block loops,
 *     no out-of-phase blinking, nothing left running in the background.
 *   • A <SkeletonGroup> is the only animated node in a placeholder. Blocks inside a group
 *     are plain Views, so a 30-block screen costs one animated style, not thirty.
 *   • Groups wait APPEAR_DELAY before fading in, so cache hits and fast responses never
 *     flash a skeleton. The space is still reserved, so nothing shifts when content lands.
 *   • Reduced motion: the pulse is skipped and the placeholder stays static.
 */
import React, { createContext, useContext, useEffect } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, DimensionValue } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  makeMutable,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

// ─── Tokens ────────────────────────────────────────────────────────────────────
export const SKELETON = {
  radius: { text: 4, block: 8, card: 14, pill: 100 },
} as const;

const PULSE_MIN = 0.5;
const PULSE_HALF_CYCLE_MS = 900;
/** Placeholders stay invisible this long, so fast loads never flash. */
const APPEAR_DELAY_MS = 120;
const APPEAR_DURATION_MS = 180;

// ─── Shared clock ──────────────────────────────────────────────────────────────
const pulse = makeMutable(1);
let clockUsers = 0;

const acquireClock = () => {
  clockUsers += 1;
  if (clockUsers === 1) {
    pulse.value = 1;
    pulse.value = withRepeat(
      withTiming(PULSE_MIN, { duration: PULSE_HALF_CYCLE_MS, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }
};

const releaseClock = () => {
  clockUsers = Math.max(0, clockUsers - 1);
  if (clockUsers === 0) {
    cancelAnimation(pulse);
    pulse.value = 1;
  }
};

/** Animated opacity for one placeholder root: delayed fade-in × shared pulse. */
const useSkeletonOpacity = (delay: number) => {
  const reduceMotion = useReducedMotion();
  const appear = useSharedValue(delay > 0 ? 0 : 1);

  useEffect(() => {
    if (delay > 0) {
      appear.value = withDelay(delay, withTiming(1, { duration: APPEAR_DURATION_MS }));
    }
    if (reduceMotion) return undefined;
    acquireClock();
    return () => {
      cancelAnimation(appear);
      releaseClock();
    };
  }, [appear, delay, reduceMotion]);

  return useAnimatedStyle(() => ({
    opacity: reduceMotion ? appear.value : appear.value * pulse.value,
  }));
};

const GroupContext = createContext(false);

// ─── SkeletonGroup ─────────────────────────────────────────────────────────────
interface SkeletonGroupProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Override the anti-flash delay (ms). Use 0 for placeholders that must show instantly. */
  delay?: number;
  accessibilityLabel?: string;
}

/**
 * Root of every placeholder. Animates once for all its blocks and announces "loading"
 * to screen readers in place of the meaningless grey shapes.
 * Nested groups collapse into plain Views, so composite skeletons (e.g. a review card) can be
 * used standalone or inside a whole-screen skeleton without adding animated nodes.
 */
export const SkeletonGroup: React.FC<SkeletonGroupProps> = (props) => {
  const inGroup = useContext(GroupContext);
  if (inGroup) return <View style={props.style}>{props.children}</View>;
  return <AnimatedSkeletonGroup {...props} />;
};

const AnimatedSkeletonGroup: React.FC<SkeletonGroupProps> = ({
  children,
  style,
  delay = APPEAR_DELAY_MS,
  accessibilityLabel = 'Loading',
}) => {
  const animatedStyle = useSkeletonOpacity(delay);
  return (
    <GroupContext.Provider value={true}>
      <Animated.View
        style={[style, animatedStyle]}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ busy: true }}
        importantForAccessibility="yes"
      >
        {children}
      </Animated.View>
    </GroupContext.Provider>
  );
};

// ─── Primitives ────────────────────────────────────────────────────────────────
interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A single placeholder block (image, button, chip, card area…).
 * Inside a SkeletonGroup it is a plain View; on its own it animates itself.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius = SKELETON.radius.block,
  style,
}) => {
  const styles = useThemedStyles(createStyles);
  const inGroup = useContext(GroupContext);
  const block = <View style={[styles.block, { width, height, borderRadius }, style]} />;
  // Inside a group: a plain View (no wrapper). Standalone: animates itself.
  return inGroup ? block : <AnimatedSkeletonGroup>{block}</AnimatedSkeletonGroup>;
};

/** Avatar / icon placeholder. */
export const SkeletonCircle: React.FC<{ size: number; style?: StyleProp<ViewStyle> }> = ({
  size,
  style,
}) => <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />;

interface SkeletonTextProps {
  /** Font size of the text being stood in for. */
  fontSize?: number;
  /** Line height of the real text — each placeholder line occupies exactly this height. */
  lineHeight?: number;
  width?: DimensionValue;
  lines?: number;
  /** Width of the final line when lines > 1. */
  lastLineWidth?: DimensionValue;
  style?: StyleProp<ViewStyle>;
}

/**
 * Text placeholder that reserves the real line box (lineHeight) and draws a bar sized to the
 * glyphs (≈ cap height), so swapping in the real text causes no vertical shift.
 */
export const SkeletonText: React.FC<SkeletonTextProps> = ({
  fontSize = 14,
  lineHeight,
  width = '100%',
  lines = 1,
  lastLineWidth = '60%',
  style,
}) => {
  const styles = useThemedStyles(createStyles);
  const box = lineHeight ?? Math.round(fontSize * 1.4);
  const bar = Math.max(8, Math.round(fontSize * 0.75));
  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, i) => (
        <View key={i} style={[styles.textLine, { height: box }]}>
          <Skeleton
            width={lines > 1 && i === lines - 1 ? lastLineWidth : width}
            height={bar}
            borderRadius={SKELETON.radius.text}
          />
        </View>
      ))}
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  block: {
    backgroundColor: colors.border, // visible on the base surface and on secondary surfaces without being heavy
  },
  textLine: {
    justifyContent: 'center',
  },
});
