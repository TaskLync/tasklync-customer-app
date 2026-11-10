import { FC, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { Plus, Minus } from 'lucide-react-native';
import { typography } from '../../design/typography';
import { springConfig } from '../../design/animations';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface QuantityStepperProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedText = Animated.createAnimatedComponent(Text);

export const QuantityStepper: FC<QuantityStepperProps> = ({
  value,
  onIncrement,
  onDecrement,
  min = 1,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const minusScale = useSharedValue(1);
  const plusScale = useSharedValue(1);
  const numberScale = useSharedValue(1);

  // Pulse quantity number on change using withSequence
  useEffect(() => {
    numberScale.value = withSequence(
      withSpring(1.18, springConfig.bouncy),
      withSpring(1.0, springConfig.stiff)
    );
  }, [value, numberScale]);

  const handleDecrement = () => {
    minusScale.value = withSequence(
      withSpring(0.9, springConfig.stiff),
      withSpring(1.0, springConfig.stiff)
    );

    onDecrement();
  };

  const handleIncrement = () => {
    plusScale.value = withSequence(
      withSpring(0.9, springConfig.stiff),
      withSpring(1.0, springConfig.stiff)
    );

    onIncrement();
  };

  const minusAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: minusScale.value }],
  }));

  const plusAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: plusScale.value }],
  }));

  const numberAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: numberScale.value }],
  }));

  const isMinReached = value <= min;

  return (
    <View style={styles.container}>
      <AnimatedPressable
        style={[
          styles.button,
          isMinReached && styles.disabledButton,
          minusAnimatedStyle,
        ]}
        onPress={handleDecrement}
        hitSlop={6}
        accessibilityLabel="Decrease quantity"
      >
        <Minus size={14} color={isMinReached ? colors.textMuted : colors.textPrimary} />
      </AnimatedPressable>

      <View style={styles.numberWrapper}>
        {/* Inter font for numerical quantity value */}
        <AnimatedText style={[styles.numberText, numberAnimatedStyle]}>
          {value}
        </AnimatedText>
      </View>

      <AnimatedPressable
        style={[styles.button, styles.plusButton, plusAnimatedStyle]}
        onPress={handleIncrement}
        hitSlop={6}
        accessibilityLabel="Increase quantity"
      >
        <Plus size={14} color={colors.textOnGreen} />
      </AnimatedPressable>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSection,
    borderRadius: 20,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusButton: {
    backgroundColor: colors.primary,
  },
  disabledButton: {
    backgroundColor: 'transparent',
  },
  numberWrapper: {
    minWidth: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  numberText: {
    fontFamily: typography.fontFamily.inter.bold, // Inter font for quantity numbers
    fontSize: typography.fontSize.body2,
    color: colors.textPrimary,
  },
});
