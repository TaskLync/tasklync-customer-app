import { FC } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, useColorScheme } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { colors, palette } from '../../design/colors';
import { typography } from '../../design/typography';
import { springConfig } from '../../design/animations';

interface ProceedFooterProps {
  total: number;
  itemCount: number;
  onProceed?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ProceedFooter: FC<ProceedFooterProps> = ({
  total,
  itemCount,
  onProceed,
}) => {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const scale = useSharedValue(1);

  const isEnabled = itemCount > 0;

  // Standardized edge-to-edge system navigation clearance (Uber/Careem/Foodpanda UX spec):
  // When insets.bottom > 0 (Android 3-button nav, gesture navigation bar, or iOS home indicator),
  // we add 14px of ergonomic breathing room above the system bar so the CTA never collides with system UI.
  // When insets.bottom is 0 (hardware navigation keys or older devices), we use a safe 20px baseline.
  const bottomPadding = insets.bottom > 0 ? insets.bottom + 14 : 20;

  const handlePressIn = () => {
    if (!isEnabled) return;
    scale.value = withSpring(0.97, springConfig.stiff);
  };

  const handlePressOut = () => {
    if (!isEnabled) return;
    scale.value = withSpring(1.0, springConfig.bouncy);
  };

  const handleProceed = () => {
    if (!isEnabled) return;

    if (onProceed) {
      onProceed();
    } else {
      router.push('/booking/schedule' as any);
    }
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const formattedTotal = `Rs. ${total.toLocaleString()}`;

  return (
    <View
      style={[
        styles.container,
        isDark && styles.containerDark,
        { paddingBottom: bottomPadding },
      ]}
    >
      <AnimatedPressable
        style={[
          styles.button,
          isEnabled
            ? styles.enabledButton
            : isDark
            ? styles.disabledButtonDark
            : styles.disabledButton,
          animatedButtonStyle,
        ]}
        onPress={handleProceed}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!isEnabled}
        accessibilityRole="button"
        accessibilityLabel={`Proceed to booking, total ${formattedTotal}`}
      >
        <View style={styles.contentRow}>
          {/* Poppins font for CTA label */}
          <Text
            style={[
              styles.ctaText,
              !isEnabled && (isDark ? styles.disabledTextDark : styles.disabledText),
            ]}
          >
            Proceed to Booking
          </Text>

          {isEnabled && (
            <View style={styles.rightGroup}>
              {/* Inter font for total inside CTA */}
              <Text style={styles.priceBadgeText}>{formattedTotal}</Text>
              <ArrowRight size={18} color={colors.textOnGreen} />
            </View>
          )}
        </View>
      </AnimatedPressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  containerDark: {
    backgroundColor: palette.slate800,
    borderTopColor: palette.slate700,
    shadowOpacity: 0.25,
  },
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  enabledButton: {
    backgroundColor: colors.primaryDark,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: colors.bgSkeleton,
  },
  disabledButtonDark: {
    backgroundColor: palette.slate700,
  },
  contentRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaText: {
    fontFamily: typography.fontFamily.poppins.bold, // Poppins font for CTA label
    fontSize: typography.fontSize.body1,
    color: colors.textOnGreen,
  },
  disabledText: {
    color: colors.textMuted,
    textAlign: 'center',
    width: '100%',
  },
  disabledTextDark: {
    color: colors.textMuted,
    textAlign: 'center',
    width: '100%',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceBadgeText: {
    fontFamily: typography.fontFamily.inter.bold, // Inter font for price badge inside CTA
    fontSize: typography.fontSize.body2,
    color: colors.textOnGreen,
  },
});
