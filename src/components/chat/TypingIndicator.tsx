import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

function BouncingDot({ delay }: { delay: number }) {
  const styles = useThemedStyles(createStyles);
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 180, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 180, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, [delay, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

interface TypingIndicatorProps {
  isVisible?: boolean;
  workerName?: string;
}

export const TypingIndicator = React.memo(function TypingIndicator({
  isVisible = true,
}: TypingIndicatorProps) {
  const styles = useThemedStyles(createStyles);
  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <BouncingDot delay={0} />
        <BouncingDot delay={100} />
        <BouncingDot delay={200} />
      </View>
    </View>
  );
});

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
  },
});
