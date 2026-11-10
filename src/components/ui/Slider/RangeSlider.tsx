import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { typography } from '../../../design/typography';
import { shadows } from '../../../design/shadows';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (range: [number, number]) => void;
  prefix?: string;
  suffix?: string;
  trackColor?: string;
  disabled?: boolean;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
  min,
  max,
  step = 50,
  value,
  onChange,
  prefix = 'Rs ',
  suffix = '',
  trackColor: trackColorProp,
  disabled = false,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const trackColor = trackColorProp ?? colors.primary;
  const initialMin = value?.[0] ?? min;
  const initialMax = value?.[1] ?? max;

  const [localMin, setLocalMin] = useState(initialMin);
  const [localMax, setLocalMax] = useState(initialMax);

  const trackWidth = useSharedValue(0);
  const minValueShared = useSharedValue(initialMin);
  const maxValueShared = useSharedValue(initialMax);

  const scaleMin = useSharedValue(1);
  const scaleMax = useSharedValue(1);

  // Sync state and shared values when value prop changes from outside
  useEffect(() => {
    const nextMin = value?.[0] ?? min;
    const nextMax = value?.[1] ?? max;
    minValueShared.value = nextMin;
    maxValueShared.value = nextMax;
    setLocalMin(nextMin);
    setLocalMax(nextMax);
  }, [value?.[0], value?.[1], min, max]); // Use primitive dependencies to avoid referential equality resets

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0) {
      trackWidth.value = width - 24; // subtract thumb width
    }
  };

  const updateMinText = (val: number) => {
    setLocalMin(val);
  };

  const updateMaxText = (val: number) => {
    setLocalMax(val);
  };

  const handleDragEnd = (finalMin: number, finalMax: number) => {
    onChange([finalMin, finalMax]);
  };

  // Min Thumb Gesture
  const minStartVal = useSharedValue(0);
  const minGesture = Gesture.Pan()
    .enabled(!disabled)
    .onBegin(() => {
      minStartVal.value = minValueShared.value;
      scaleMin.value = 1.2;
    })
    .onChange((event) => {
      if (trackWidth.value === 0) return;

      const deltaVal = (event.translationX / trackWidth.value) * (max - min);
      let newVal = minStartVal.value + deltaVal;

      // Snap to step
      newVal = Math.round(newVal / step) * step;

      // Clamp
      const currentMaxVal = maxValueShared.value;
      if (newVal < min) newVal = min;
      if (newVal > currentMaxVal) newVal = currentMaxVal;

      if (minValueShared.value !== newVal) {
        minValueShared.value = newVal;
        runOnJS(updateMinText)(newVal);
      }
    })
    .onEnd(() => {
      scaleMin.value = 1.0;
      runOnJS(handleDragEnd)(minValueShared.value, maxValueShared.value);
    });

  // Max Thumb Gesture
  const maxStartVal = useSharedValue(0);
  const maxGesture = Gesture.Pan()
    .enabled(!disabled)
    .onBegin(() => {
      maxStartVal.value = maxValueShared.value;
      scaleMax.value = 1.2;
    })
    .onChange((event) => {
      if (trackWidth.value === 0) return;

      const deltaVal = (event.translationX / trackWidth.value) * (max - min);
      let newVal = maxStartVal.value + deltaVal;

      // Snap to step
      newVal = Math.round(newVal / step) * step;

      // Clamp
      const currentMinVal = minValueShared.value;
      if (newVal < currentMinVal) newVal = currentMinVal;
      if (newVal > max) newVal = max;

      if (maxValueShared.value !== newVal) {
        maxValueShared.value = newVal;
        runOnJS(updateMaxText)(newVal);
      }
    })
    .onEnd(() => {
      scaleMax.value = 1.0;
      runOnJS(handleDragEnd)(minValueShared.value, maxValueShared.value);
    });

  // Thumb Styles
  const minThumbAnimatedStyle = useAnimatedStyle(() => {
    const width = trackWidth.value;
    const percentage = width > 0 ? (minValueShared.value - min) / (max - min) : 0;
    const translateX = percentage * width;

    return {
      transform: [
        { translateX },
        { scale: scaleMin.value },
      ],
    };
  });

  const maxThumbAnimatedStyle = useAnimatedStyle(() => {
    const width = trackWidth.value;
    const percentage = width > 0 ? (maxValueShared.value - min) / (max - min) : 0;
    const translateX = percentage * width;

    return {
      transform: [
        { translateX },
        { scale: scaleMax.value },
      ],
      zIndex: minValueShared.value === maxValueShared.value ? 10 : 1,
    };
  });

  // Track Fill Style
  const trackFillAnimatedStyle = useAnimatedStyle(() => {
    const width = trackWidth.value;
    const minPercent = width > 0 ? (minValueShared.value - min) / (max - min) : 0;
    const maxPercent = width > 0 ? (maxValueShared.value - min) / (max - min) : 1;

    const left = minPercent * width + 12;
    const fillWidth = (maxPercent - minPercent) * width;

    return {
      left,
      width: fillWidth,
    };
  });

  const formatPrice = (val: number) => {
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.valueLabel}>
          {prefix}
          {formatPrice(localMin)}
          {suffix}
        </Text>
        <Text style={styles.valueLabel}>
          {prefix}
          {formatPrice(localMax)}
          {suffix}
        </Text>
      </View>

      <View
        style={styles.sliderWrapper}
        onLayout={handleLayout}
      >
        {/* Track Base */}
        <View style={styles.trackBase} />

        {/* Track Fill */}
        <Animated.View
          style={[
            styles.trackFill,
            { backgroundColor: trackColor },
            trackFillAnimatedStyle,
          ]}
        />

        {/* Min Thumb */}
        <GestureDetector gesture={minGesture}>
          <Animated.View
            style={[
              styles.thumb,
              { borderColor: trackColor },
              minThumbAnimatedStyle,
            ]}
            accessibilityRole="adjustable"
            accessibilityLabel="Minimum value slider"
            accessibilityValue={{ min, max, now: localMin }}
          />
        </GestureDetector>

        {/* Max Thumb */}
        <GestureDetector gesture={maxGesture}>
          <Animated.View
            style={[
              styles.thumb,
              { borderColor: trackColor },
              maxThumbAnimatedStyle,
            ]}
            accessibilityRole="adjustable"
            accessibilityLabel="Maximum value slider"
            accessibilityValue={{ min, max, now: localMax }}
          />
        </GestureDetector>
      </View>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 10,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  valueLabel: {
    fontFamily: typography.fontFamily.inter.bold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sliderWrapper: {
    height: 32,
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
  },
  trackBase: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  trackFill: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bgCard,
    borderWidth: 2,
    ...shadows.md,
  },
});
