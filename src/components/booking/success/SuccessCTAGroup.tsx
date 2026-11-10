import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useBookingDraftStore } from '../../../store/bookingDraft.store';
import { fontFamily } from '../../../design';
import { useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

export interface SuccessCTAGroupProps {
  bookingId: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const SuccessCTAGroup: React.FC<SuccessCTAGroupProps> = ({ bookingId }) => {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const resetDraft = useBookingDraftStore((s) => s.resetDraft);

  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withTiming(0.98, { duration: 80 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1.0, { duration: 120 });
  };

  const handleTrackBooking = () => {
    if (bookingId && !bookingId.startsWith('TL-') && !bookingId.startsWith('b-')) {
      router.push(`/booking/${bookingId}` as any);
    } else {
      router.replace('/(tabs)/bookings' as any);
    }
  };

  const handleBackToHome = () => {
    resetDraft();
    router.replace('/(tabs)' as any);
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Primary Action Button: Track Booking */}
      <AnimatedPressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handleTrackBooking}
        style={[styles.primaryButton, buttonAnimatedStyle]}
        accessibilityRole="button"
        accessibilityLabel="Track booking status"
      >
        <Text style={styles.primaryText}>Track Booking</Text>
      </AnimatedPressable>

      {/* Secondary Text Action: Back to Home */}
      <Pressable
        onPress={handleBackToHome}
        style={styles.secondaryLink}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Return to home screen"
      >
        <Text style={styles.secondaryText}>Back to Home</Text>
      </Pressable>
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 8,
  },
  primaryText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 16,
    color: palette.pureWhite,
  },
  secondaryLink: {
    height: 48,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 15,
    color: colors.textSecondary,
  },
});
