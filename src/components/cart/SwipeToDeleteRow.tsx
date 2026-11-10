import { FC, ReactNode, useState, useCallback } from 'react';
import { StyleSheet, Pressable, Platform, useWindowDimensions, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Trash2 } from 'lucide-react-native';
import { springConfig } from '../../design/animations';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

const SWIPE_THRESHOLD = -80; // Distance in px required to commit delete

interface SwipeToDeleteRowProps {
  children: ReactNode;
  onDelete: () => void;
}

export const SwipeToDeleteRow: FC<SwipeToDeleteRowProps> = ({
  children,
  onDelete,
}) => {
  const styles = useThemedStyles(createStyles);
  const { width: screenWidth } = useWindowDimensions();
  const [isDeleting, setIsDeleting] = useState(false);
  const translateX = useSharedValue(0);
  const measuredHeight = useSharedValue(0);
  const opacity = useSharedValue(1);

  const handleFinishDelete = useCallback(() => {
    onDelete();
  }, [onDelete]);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      if (height > 0) {
        measuredHeight.value = height;
      }
    },
    [measuredHeight]
  );

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      // Only allow swiping left (negative translateX)
      if (event.translationX < 0) {
        translateX.value = Math.max(event.translationX, -screenWidth * 0.4);
      } else {
        translateX.value = 0;
      }
    })
    .onEnd(() => {
      if (translateX.value < SWIPE_THRESHOLD) {
        // Commit delete action
        runOnJS(setIsDeleting)(true);
        translateX.value = withTiming(-screenWidth, { duration: 200 });
        opacity.value = withTiming(0, { duration: 200 });

        // Collapse dynamically measured row height to 0
        measuredHeight.value = withSpring(0, springConfig.gentle, (finished) => {
          if (finished) {
            runOnJS(handleFinishDelete)();
          }
        });
      } else {
        // Snap back to normal
        translateX.value = withSpring(0, springConfig.stiff);
      }
    });

  // Reveal delete background smoothly as user swipes left; 0 opacity in default state
  const animatedDeleteBackgroundStyle = useAnimatedStyle(() => {
    const bgOpacity = interpolate(
      translateX.value,
      [-40, 0],
      [1, 0],
      Extrapolation.CLAMP
    );

    return {
      opacity: isDeleting ? opacity.value : bgOpacity,
    };
  });

  const animatedRowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    height: isDeleting ? measuredHeight.value : undefined,
    opacity: opacity.value,
    marginBottom: isDeleting ? (measuredHeight.value === 0 ? 0 : 8) : 8,
  }));

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      {/* Red Delete Background Layer - positioned strictly behind with zero layout footprint */}
      <Animated.View style={[styles.deleteBackground, animatedDeleteBackgroundStyle]}>
        <Pressable
          style={styles.deleteButton}
          onPress={() => {
            onDelete();
          }}
          accessibilityRole="button"
          accessibilityLabel="Delete item"
        >
          <Trash2 size={22} color="#FFFFFF" />
        </Pressable>
      </Animated.View>

      {/* Foreground Content Row - measured dynamically onLayout */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[styles.foreground, animatedRowStyle]}
          onLayout={handleLayout}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
  },
  deleteBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#EF4444', // Danger Red
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingRight: 24,
    zIndex: 0,
  },
  deleteButton: {
    width: 60,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foreground: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    zIndex: 1,
  },
});
