import { useEffect } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { fontFamily, fontSize, radius, spacing, shadows } from '../../design';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface ToastUndoProps {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
  bottomOffset?: number;
}

export const ToastUndo: React.FC<ToastUndoProps> = ({
  visible,
  message,
  onUndo,
  onDismiss,
  durationMs = 4000,
  bottomOffset = 24,
}) => {
  const styles = useThemedStyles(createStyles);
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (visible) {
      opacity.value = withTiming(1, { duration: 150 });
      translateY.value = withSpring(0, {
        damping: 24,
        stiffness: 300,
      });

      timer = setTimeout(() => {
        translateY.value = withTiming(100, { duration: 200 });
        opacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onDismiss)();
        });
      }, durationMs);
    } else {
      translateY.value = withTiming(100, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible, durationMs, onDismiss, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const handleUndoPress = () => {
    onUndo();
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: bottomOffset },
        animatedStyle,
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${message}. Double tap Undo to revert.`}
    >
      <Text style={styles.messageText} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {message}
      </Text>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleUndoPress}
        style={styles.undoButton}
        accessibilityRole="button"
        accessibilityLabel="Undo"
      >
        <Text style={styles.undoText}>Undo</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = ({ palette }: AppTheme) => StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.base,
    right: spacing.base,
    height: 48,
    backgroundColor: '#1E293B', // Deep slate
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    zIndex: 999,
    ...shadows.md,
  },
  messageText: {
    flex: 1,
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.body2,
    color: palette.pureWhite,
    marginRight: spacing.sm,
  },
  undoButton: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm + 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: radius.pill,
  },
  undoText: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: fontSize.caption + 0.5,
    color: '#86EFAC', // Light Green
  },
});
