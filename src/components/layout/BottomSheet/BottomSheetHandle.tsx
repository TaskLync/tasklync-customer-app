import { View, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { radius } from '../../../design/radius';
import { springConfig } from '../../../design/animations';
import { useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface BottomSheetHandleProps {
  style?: StyleProp<ViewStyle>;
  indicatorStyle?: StyleProp<ViewStyle>;
}

export const BottomSheetHandle: React.FC<BottomSheetHandleProps> = ({
  style,
  indicatorStyle,
}) => {
  const styles = useThemedStyles(createStyles);
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(1.15, springConfig.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1.0, springConfig.snappy);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={[styles.container, style]}>
      <AnimatedPressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.touchArea, animatedStyle]}
        accessibilityRole="none"
        accessibilityLabel="Bottom sheet drag handle"
      >
        <View style={[styles.handle, indicatorStyle]} />
      </AnimatedPressable>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  touchArea: {
    width: 64,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handle: {
    width: 38,
    height: 4.5,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong, // subtle neutral grab pill
  },
});

