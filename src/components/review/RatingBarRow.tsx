import { useEffect } from 'react';
import { View, StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { fontFamily as fonts } from '../../design/typography';
import { radius } from '../../design/radius';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface RatingBarRowProps {
  label: string;
  value: number | null;
  maxValue?: number;
  animated?: boolean;
  animationDelay?: number;
  trackColor?: string;
  fillColor?: string;
  style?: ViewStyle;
}

const springConfig = {
  damping: 20,
  stiffness: 90,
  mass: 1,
};

export const RatingBarRow = ({
  label,
  value,
  maxValue = 5,
  animated = false,
  animationDelay = 0,
  trackColor: trackColorProp,
  fillColor: fillColorProp,
  style,
}: RatingBarRowProps) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const trackColor = trackColorProp ?? colors.border;
  const fillColor = fillColorProp ?? colors.primary;
  const targetPercent = value !== null ? (value / maxValue) * 100 : 0;
  const progress = useSharedValue(animated ? 0 : targetPercent);

  useEffect(() => {
    if (animated) {
      progress.value = withDelay(
        animationDelay,
        withSpring(targetPercent, springConfig)
      );
    } else {
      progress.value = targetPercent;
    }
  }, [animated, animationDelay, targetPercent, progress]);

  const fillStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value}%`,
    };
  });

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>

      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View
          style={[styles.fill, { backgroundColor: fillColor }, fillStyle]}
        />
      </View>

      <Text style={styles.scoreText}>
        {value !== null ? value.toFixed(1) : '-'}
      </Text>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
  },
  label: {
    width: 100,
    fontFamily: fonts.jakarta.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  scoreText: {
    width: 24,
    textAlign: 'right',
    fontFamily: fonts.inter.semiBold,
    fontSize: 12,
    color: colors.textPrimary,
  },
});
