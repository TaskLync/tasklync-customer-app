import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Star } from 'lucide-react-native';
import { typography } from '../../../design/typography';
import { springConfig } from '../../../design/animations';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

interface StarRatingFilterProps {
  value: number; // 0 = any, 1-5 = minimum
  onChange: (value: number) => void;
  size?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const StarRatingFilter: React.FC<StarRatingFilterProps> = ({
  value,
  onChange,
  size = 28,
}) => {
  const styles = useThemedStyles(createStyles);
  const [label, setLabel] = useState(getLabelForValue(value));
  const labelOpacity = useSharedValue(1);

  const updateLabelOnJS = (val: number) => {
    setLabel(getLabelForValue(val));
  };

  useEffect(() => {
    labelOpacity.value = withTiming(0, { duration: 75 }, (finished) => {
      if (finished) {
        runOnJS(updateLabelOnJS)(value);
        labelOpacity.value = withTiming(1, { duration: 75 });
      }
    });
  }, [value]);

  const handleStarPress = (starIndex: number) => {
    if (value === starIndex) {
      onChange(0); // Toggle off if tapping same star
    } else {
      onChange(starIndex);
    }
  };

  const labelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((starIndex) => (
          <StarItem
            key={starIndex}
            index={starIndex}
            currentValue={value}
            size={size}
            onPress={() => handleStarPress(starIndex)}
          />
        ))}
      </View>
      <Animated.Text style={[styles.label, labelAnimatedStyle]}>
        {label}
      </Animated.Text>
    </View>
  );
};

const StarItem: React.FC<{
  index: number;
  currentValue: number;
  size: number;
  onPress: () => void;
}> = ({ index, currentValue, size, onPress }) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const isSelected = index <= currentValue;
  const progress = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    if (isSelected) {
      // Stagger cascade fill
      const delay = (index - 1) * 30;
      progress.value = withDelay(delay, withSpring(1, springConfig.snappy));
      // Haptic for each star in cascade
      const timer = setTimeout(() => {
      }, delay);
      return () => clearTimeout(timer);
    } else {
      const delay = (index - 1) * 20;
      progress.value = withDelay(delay, withSpring(0, springConfig.stiff));
    }
  }, [isSelected, index, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: progress.value * 0.2 + 0.8 }, // scale 0.8 -> 1.0
      ],
      opacity: progress.value * 0.5 + 0.5, // 0.5 -> 1.0
    };
  });

  return (
    <AnimatedPressable
      onPress={onPress}
      hitSlop={8}
      style={[styles.starButton, animatedStyle]}
    >
      <Star
        size={size}
        color={isSelected ? '#F59E0B' : colors.border}
        fill={isSelected ? '#F59E0B' : 'transparent'}
      />
    </AnimatedPressable>
  );
};

function getLabelForValue(val: number): string {
  switch (val) {
    case 0: return 'Any rating';
    case 1: return '1★ and above';
    case 2: return '2★ and above';
    case 3: return '3★ and above';
    case 4: return '4★ and above';
    case 5: return '5 stars only';
    default: return 'Any rating';
  }
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  starButton: {
    // any extra padding if needed
  },
  label: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
});

