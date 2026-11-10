import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface StepConnectorLineProps {
  isFilled: boolean;
}

export const StepConnectorLine: React.FC<StepConnectorLineProps> = ({ isFilled }) => {
  const styles = useThemedStyles(createStyles);
  const fillProgress = useSharedValue(isFilled ? 1 : 0);

  useEffect(() => {
    fillProgress.value = withTiming(isFilled ? 1 : 0, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });
  }, [isFilled, fillProgress]);

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: `${fillProgress.value * 100}%`,
  }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, animatedFillStyle]} />
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  track: {
    flex: 1,
    height: 3,
    backgroundColor: palette.gray200,
    marginHorizontal: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});
