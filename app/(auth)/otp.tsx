import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageSquare, ChevronLeft } from 'lucide-react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { Screen } from '@components/layout/Screen';
import { Text } from '@components/ui/Text';
import { OTPInput } from '@components/ui/Input/OTPInput';
import { IconButton } from '@components/ui/Button/IconButton';
import { fontFamily } from '@design/index';
import { useVerifyOtp, useResendOtp } from '@hooks/useAuth';
import { useToast } from '@providers/ToastProvider';
import { mapOtpVerificationError } from '@utils/authError';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';

export type OTPState = 'idle' | 'verifying' | 'error' | 'success';

export default function OTPScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { showToast } = useToast();

  const [otp, setOtp] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [otpState, setOtpState] = useState<OTPState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { verifyOtp, isLoading: isVerifying } = useVerifyOtp();
  const { resendOtp, isLoading: isResending } = useResendOtp();

  const inFlightRef = useRef<boolean>(false);
  const attemptIdRef = useRef<number>(0);

  // Handle countdown interval safely
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  // Clean error state immediately when the user starts typing or correcting
  const handleOtpChange = useCallback((newCode: string) => {
    if (otpState === 'error') {
      setOtpState('idle');
      setErrorMessage(null);
    }
    setOtp(newCode);
  }, [otpState]);

  // Trigger verification strictly when exactly 6 digits are populated
  const handleComplete = useCallback(async (code: string) => {
    if (inFlightRef.current || otpState === 'verifying' || otpState === 'success') {
      return;
    }

    if (code.length < 6) {
      return;
    }

    inFlightRef.current = true;
    const currentAttempt = ++attemptIdRef.current;
    setOtpState('verifying');
    setErrorMessage(null);

    try {
      const result = await verifyOtp(phone || '', code);

      // Discard stale responses if a newer attempt or resend occurred
      if (currentAttempt !== attemptIdRef.current) {
        return;
      }

      if (result.success) {
        setOtpState('success');
        // Navigation is triggered by the useVerifyOtp hook after the 800ms celebration animation
      } else {
        setOtpState('error');
        const msg = result.error || 'Incorrect verification code. Please try again.';
        setErrorMessage(msg);
        showToast({
          id: 'otp-verify-error',
          message: msg,
          variant: 'error',
        });
      }
    } catch (err) {
      if (currentAttempt !== attemptIdRef.current) {
        return;
      }
      setOtpState('error');
      const mapped = mapOtpVerificationError(err);
      setErrorMessage(mapped.message);
      showToast({
        id: 'otp-verify-error',
        message: mapped.message,
        variant: 'error',
      });
    } finally {
      inFlightRef.current = false;
    }
  }, [inFlightRef, otpState, verifyOtp, phone, showToast]);

  // Handle resend request with rigorous error handling and timer isolation
  const handleResend = useCallback(async () => {
    if (!canResend || isResending || !phone) {
      return;
    }

    // Invalidate any older in-flight verification
    attemptIdRef.current++;
    inFlightRef.current = false;

    const result = await resendOtp(phone);
    if (result.success) {
      const nextInterval = result.expiresIn && result.expiresIn > 0 ? result.expiresIn : 60;
      setTimeLeft(nextInterval);
      setCanResend(false);
      setOtp('');
      setOtpState('idle');
      setErrorMessage(null);
      showToast({
        id: 'otp-resend-toast',
        message: 'Verification code resent successfully.',
        variant: 'success',
      });
    } else {
      // DO NOT reset countdown timer on failure! Leave canResend true so user can retry immediately.
      const msg = result.error || "Couldn't resend the code. Please try again.";
      setErrorMessage(msg);
      showToast({
        id: 'otp-resend-toast',
        message: msg,
        variant: 'error',
      });
    }
  }, [canResend, isResending, phone, resendOtp, showToast]);

  const handleGoBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/phone');
    }
  }, [router]);

  const formattedPhone = phone ? `+92 3XX XXX••${phone.slice(-2)}` : '';
  const timeDisplay = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;

  const countdownStyle = useAnimatedStyle(() => ({
    opacity: withTiming(canResend ? 0 : 1, { duration: 250 }),
  }));

  const resendStyle = useAnimatedStyle(() => ({
    opacity: withTiming(canResend ? 1 : 0, { duration: 250 }),
    position: canResend ? 'relative' : 'absolute',
  }));

  return (
    <Screen bg={colors.bgCard} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <IconButton
            icon={ChevronLeft}
            iconSize={24}
            color={colors.textPrimary}
            onPress={handleGoBack}
            accessibilityLabel="Go back and change phone number"
            bg="transparent"
            style={styles.backButton}
          />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.iconContainer}>
            <MessageSquare size={28} color={colors.primary} />
          </View>

          <Text variant="h1" color="primary" style={styles.title}>
            Verify your number
          </Text>

          <Text style={styles.maskedPhoneContainer}>
            <Text style={styles.maskedPhonePrefix}>Code sent to </Text>
            <Text style={styles.maskedPhone}>{formattedPhone}</Text>
          </Text>

          <View style={styles.otpContainer}>
            <OTPInput
              value={otp}
              onChange={handleOtpChange}
              onComplete={handleComplete}
              error={otpState === 'error'}
              success={otpState === 'success'}
              verifying={otpState === 'verifying'}
              disabled={otpState === 'success' || isResending}
              length={6}
            />
          </View>

          {/* Verifying Status Feedback: Subtle indicator without false green styling */}
          {otpState === 'verifying' && (
            <View style={styles.verifyingContainer} accessibilityLiveRegion="polite">
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.verifyingText}>Verifying code...</Text>
            </View>
          )}

          {/* High-contrast accessible inline error message */}
          {otpState === 'error' && errorMessage && (
            <Text style={styles.errorText} accessibilityRole="alert" accessibilityLiveRegion="assertive">
              {errorMessage}
            </Text>
          )}

          <View style={styles.countdownSection} accessibilityLiveRegion="polite">
            <Animated.View style={[styles.countdownContainer, countdownStyle]}>
              <Text style={styles.countdownText}>Resend code in </Text>
              <Text style={styles.timeText}>{timeDisplay}</Text>
            </Animated.View>

            <Animated.View style={[styles.resendContainer, resendStyle]}>
              <Pressable
                onPress={handleResend}
                disabled={!canResend || isResending}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Resend verification code"
              >
                {isResending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.resendText}>Resend code</Text>
                )}
              </Pressable>
            </Animated.View>
          </View>

          <View style={styles.wrongNumberContainer}>
            <Text style={styles.wrongNumberPrefix}>Wrong number? </Text>
            <Pressable onPress={handleGoBack} hitSlop={8} accessibilityRole="link">
              <Text style={styles.wrongNumberLink}>Change it</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  backButton: {
    width: 44,
    height: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    marginBottom: 8,
  },
  maskedPhoneContainer: {
    marginBottom: 32,
  },
  maskedPhonePrefix: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 15,
    color: colors.textMuted,
  },
  maskedPhone: {
    fontFamily: fontFamily.inter.medium,
    fontSize: 15,
    color: colors.primary,
  },
  otpContainer: {
    marginBottom: 24,
  },
  verifyingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  verifyingText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  errorText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 13,
    color: colors.textDanger,
    marginBottom: 16,
    lineHeight: 18,
  },
  countdownSection: {
    alignItems: 'flex-start',
    marginBottom: 16,
    height: 24, // Fixed height to prevent layout jumps when toggling
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdownText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  timeText: {
    fontFamily: fontFamily.inter.bold,
    fontSize: 16,
    color: colors.primary,
  },
  resendContainer: {
    justifyContent: 'center',
  },
  resendText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: colors.primary,
  },
  wrongNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  wrongNumberPrefix: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  wrongNumberLink: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: colors.primary,
  },
});
