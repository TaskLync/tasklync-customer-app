import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { fontFamily } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export type StepState = 'complete' | 'active' | 'future';

export interface StepDotProps {
  stepNumber: number;
  state: StepState;
}

export const StepDot: React.FC<StepDotProps> = ({ stepNumber, state }) => {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const scale = useSharedValue(1);
  const checkOpacity = useSharedValue(state === 'complete' ? 1 : 0);
  const numberOpacity = useSharedValue(state === 'complete' ? 0 : 1);

  useEffect(() => {
    if (state === 'complete') {
      scale.value = withTiming(1.0, { duration: 100 });
      checkOpacity.value = withTiming(1, { duration: 100 });
      numberOpacity.value = withTiming(0, { duration: 100 });
    } else if (state === 'active') {
      scale.value = withTiming(1.0, { duration: 100 });
      checkOpacity.value = withTiming(0, { duration: 100 });
      numberOpacity.value = withTiming(1, { duration: 100 });
    } else {
      scale.value = withTiming(1.0, { duration: 100 });
      checkOpacity.value = withTiming(0, { duration: 100 });
      numberOpacity.value = withTiming(1, { duration: 100 });
    }
  }, [state, scale, checkOpacity, numberOpacity]);

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
  }));

  const numberAnimatedStyle = useAnimatedStyle(() => ({
    opacity: numberOpacity.value,
  }));

  const isGreenBg = state === 'complete' || state === 'active';

  return (
    <View style={styles.container}>
      {/* Static Active Outer Ring */}
      {state === 'active' && <View style={styles.activeOuterRing} />}

      {/* Main Dot Container */}
      <Animated.View
        style={[
          styles.dot,
          isGreenBg ? styles.dotGreen : styles.dotGray,
          dotAnimatedStyle,
        ]}
      >
        {/* Checkmark icon (for complete state) */}
        <Animated.View style={[styles.absoluteIcon, checkAnimatedStyle]}>
          <Check size={14} color={palette.pureWhite} strokeWidth={3} />
        </Animated.View>

        {/* Step number (for active & future states) */}
        <Animated.View style={[styles.absoluteIcon, numberAnimatedStyle]}>
          <Text
            style={[
              styles.numberText,
              isGreenBg ? styles.textWhite : styles.textGray,
            ]}
          >
            {stepNumber}
          </Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeOuterRing: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    opacity: 0.4,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dotGreen: {
    backgroundColor: colors.primary,
  },
  dotGray: {
    backgroundColor: palette.white,
    borderWidth: 1.5,
    borderColor: palette.gray300,
  },
  absoluteIcon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontFamily: fontFamily.inter.bold,
    fontSize: 12,
    lineHeight: 15,
    textAlign: 'center',
  },
  textWhite: {
    color: palette.pureWhite,
  },
  textGray: {
    color: palette.gray600,
  },
});
