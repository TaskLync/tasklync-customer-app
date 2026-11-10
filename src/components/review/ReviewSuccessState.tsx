import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { CheckCircle2 } from 'lucide-react-native';
import { fontFamily, fontSize, radius, spacing } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface ReviewSuccessStateProps {
  onDismiss: () => void;
  autoNavigateDelayMs?: number;
}

/**
 * ReviewSuccessState Component
 *
 * Implements Peak-End Rule Payoff & Timer-Safe Lifecycle:
 * - Expressive scale-in checkmark (spring-bouncy)
 * - Calming resolution copy without particle clutter
 * - 2-second auto-navigate timer with robust unmount cleanup
 * - Manual "Back to Bookings" action for users who prefer to proceed immediately
 */
export const ReviewSuccessState: React.FC<ReviewSuccessStateProps> = ({
  onDismiss,
  autoNavigateDelayMs = 2000,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {

    // Entrance Animation
    opacity.value = withTiming(1, { duration: 180 });
    scale.value = withSequence(
      withTiming(1.22, { duration: 200 }),
      withSpring(1.0, { damping: 12, stiffness: 140 })
    );

    // Auto-navigate timer with safe cleanup
    timerRef.current = setTimeout(() => {
      onDismiss();
    }, autoNavigateDelayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [autoNavigateDelayMs, onDismiss, opacity, scale]);

  const handleManualDone = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onDismiss();
  };

  const animatedIconStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container} accessibilityRole="alert">
      {/* Animated Checkmark Badge */}
      <Animated.View style={[styles.iconOuterCircle, animatedIconStyle]}>
        <View style={styles.iconInnerCircle}>
          <CheckCircle2 size={48} color={colors.primaryDark} strokeWidth={2.4} />
        </View>
      </Animated.View>

      {/* Copy */}
      <Animated.View style={[styles.textBlock, animatedContentStyle]}>
        <Text style={styles.title}>Review submitted! 🎉</Text>
        <Text style={styles.subtitle}>
          Thank you! Your feedback helps service professionals build their reputation and helps others book with confidence.
        </Text>
      </Animated.View>

      {/* Manual Dismiss Button */}
      <Animated.View style={[styles.buttonWrapper, animatedContentStyle]}>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={handleManualDone}
          accessibilityRole="button"
          accessibilityLabel="Done and return to bookings"
        >
          <Text style={styles.buttonText}>Back to Bookings</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.bgCard,
  },
  iconOuterCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.bgSuccess,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.green100,
    marginBottom: spacing.lg,
  },
  iconInnerCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  textBlock: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  buttonWrapper: {
    width: '100%',
    maxWidth: 240,
  },
  button: {
    height: 48,
    backgroundColor: palette.gray100,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonPressed: {
    backgroundColor: palette.gray200,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: fontSize.label,
    color: colors.textPrimary,
  },
});
