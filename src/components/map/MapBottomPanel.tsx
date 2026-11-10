import { FC, useEffect, ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { springConfig } from '../../design/animations';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

const SNAP_COLLAPSED = 210; // Collapsed height (~210px) showing header + card list
const SNAP_EXPANDED = 390;  // Expanded height (~390px)

interface MapBottomPanelProps {
  children: ReactNode;
}

export const MapBottomPanel: FC<MapBottomPanelProps> = ({ children }) => {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const translateY = useSharedValue(screenHeight); // Start off-screen
  const contextY = useSharedValue(0);

  const maxTranslateY = screenHeight - SNAP_COLLAPSED - insets.bottom;
  const minTranslateY = screenHeight - SNAP_EXPANDED - insets.bottom;

  // Mount slide-up animation (0 -> 200px)
  useEffect(() => {
    translateY.value = withSpring(maxTranslateY, springConfig.gentle);
  }, [maxTranslateY, translateY]);

  const gesture = Gesture.Pan()
    .onStart(() => {
      contextY.value = translateY.value;
    })
    .onUpdate((event) => {
      const nextY = contextY.value + event.translationY;
      // Clamp drag boundaries
      translateY.value = Math.max(minTranslateY - 20, Math.min(maxTranslateY + 20, nextY));
    })
    .onEnd((event) => {
      const velocity = event.velocityY;
      // If velocity is strong or position passed midpoint, snap to nearest point
      const midPoint = (maxTranslateY + minTranslateY) / 2;

      if (velocity < -400 || translateY.value < midPoint) {
        translateY.value = withSpring(minTranslateY, springConfig.gentle);
      } else {
        translateY.value = withSpring(maxTranslateY, springConfig.gentle);
      }
    });

  const animatedPanelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.panel, { height: screenHeight }, animatedPanelStyle]}>
      <GestureDetector gesture={gesture}>
        <View style={styles.handleContainer}>
          <View style={styles.handleBar} />
        </View>
      </GestureDetector>

      <View
        style={[
          styles.content,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 14 : 20 },
        ]}
      >
        {children}
      </View>
    </Animated.View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 20,
  },
  handleContainer: {
    width: '100%',
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  content: {
    flex: 1,
  },
});
