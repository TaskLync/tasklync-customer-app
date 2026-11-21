import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeftIcon, ShieldCheckIcon } from '../../src/components/ui/Icon/icons';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Screen } from '@components/layout/Screen';
import { Text } from '@components/ui/Text';
import { OTPInput } from '@components/ui/Input/OTPInput';
import { IconButton } from '@components/ui/Button/IconButton';
import {
  fontFamily,
  textStyles,
  letterSpacing,
  spacing,
  layout,
  radius,
  iconSize,
  getOpticalStrokeWidth,
} from '@design/index';
import { useVerifyOtp, useResendOtp } from '@hooks/useAuth';
import { useToast } from '@providers/ToastProvider';
import { mapOtpVerificationError } from '@utils/authError';
import { maskPhoneNumber, phoneLastDigits, formatCountdown } from '@utils/otp';
import { OTP_CONFIG, OTP_COPY, OTP_MOTION } from '../../src/config/otp.config';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';

export type OTPState = 'idle' | 'verifying' | 'error' | 'success';

const TILE_ICON_SIZE = iconSize.standard;
const TILE_ICON_STROKE = getOpticalStrokeWidth(TILE_ICON_SIZE, 'refined');
const LINK_HIT_SLOP = { top: spacing.md, bottom: spacing.md, left: spacing.sm, right: spacing.sm };

export default function OTPScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { showToast } = useToast();

  const [otp, setOtp] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(OTP_CONFIG.resendCooldownSeconds);
  const [otpState, setOtpState] = useState<OTPState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { verifyOtp } = useVerifyOtp();
  const { resendOtp, isLoading: isResending } = useResendOtp();

  const inFlightRef = useRef<boolean>(false);
  const attemptIdRef = useRef<number>(0);

  const isCountingDown = timeLeft > 0;
  const canResend = !isCountingDown;

  // One interval per countdown cycle (not one per tick). A successful resend restarts the cycle.
  useEffect(() => {
    if (!isCountingDown) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isCountingDown]);

  // Screen entrance: soft fade with a small rise.
  const entrance = useSharedValue(0);
  useEffect(() => {
    entrance.value = withTiming(1, {
      duration: OTP_MOTION.entranceDuration,
      easing: Easing.out(Easing.cubic),
    });
  }, [entrance]);
  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateY: (1 - entrance.value) * OTP_MOTION.entranceOffset }],
  }));

  // Clear the error styling as soon as the user starts correcting the code.
  const handleOtpChange = useCallback((newCode: string) => {
    if (otpState === 'error') {
      setOtpState('idle');
      setErrorMessage(null);
    }
    setOtp(newCode);
  }, [otpState]);

  // Verify strictly once every digit is present; guarded against duplicate requests.
  const handleComplete = useCallback(async (code: string) => {
    if (inFlightRef.current || otpState === 'verifying' || otpState === 'success') {
      return;
    }

    if (code.length < OTP_CONFIG.length) {
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
        // Navigation is triggered by the useVerifyOtp hook after OTP_CONFIG.successNavigationDelayMs
      } else {
        setOtpState('error');
        const msg = result.error || OTP_COPY.verifyFailed;
        setErrorMessage(msg);
        showToast({ id: OTP_CONFIG.toastIds.verifyError, message: msg, variant: 'error' });
      }
    } catch (err) {
      if (currentAttempt !== attemptIdRef.current) {
        return;
      }
      setOtpState('error');
      const mapped = mapOtpVerificationError(err);
      setErrorMessage(mapped.message);
      showToast({ id: OTP_CONFIG.toastIds.verifyError, message: mapped.message, variant: 'error' });
    } finally {
      inFlightRef.current = false;
    }
  }, [otpState, verifyOtp, phone, showToast]);

  // Resend: only after the cooldown, never while a resend is already in flight.
  const handleResend = useCallback(async () => {
    if (!canResend || isResending || !phone) {
      return;
    }

    // Invalidate any older in-flight verification
    attemptIdRef.current++;
    inFlightRef.current = false;

    const result = await resendOtp(phone);
    if (result.success) {
      const nextInterval =
        result.expiresIn && result.expiresIn > 0 ? result.expiresIn : OTP_CONFIG.resendCooldownSeconds;
      setTimeLeft(nextInterval);
      setOtp('');
      setOtpState('idle');
      setErrorMessage(null);
      showToast({ id: OTP_CONFIG.toastIds.resend, message: OTP_COPY.resendSuccess, variant: 'success' });
    } else {
      // Do NOT restart the countdown on failure, so the user can retry immediately.
      const msg = result.error || OTP_COPY.resendFailed;
      setErrorMessage(msg);
      showToast({ id: OTP_CONFIG.toastIds.resend, message: msg, variant: 'error' });
    }
  }, [canResend, isResending, phone, resendOtp, showToast]);

  const handleGoBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(OTP_CONFIG.phoneRoute as Href);
    }
  }, [router]);

  const maskedPhone = maskPhoneNumber(phone, OTP_CONFIG.visiblePhoneDigits, OTP_CONFIG.nationalNumberLength);
  const phoneEnding = phoneLastDigits(phone, OTP_CONFIG.visiblePhoneDigits);


  return (
    <Screen bg={colors.bgCard} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={0}>
        {/* 1. Navigation: a single quiet back affordance */}
        <View style={styles.header}>
          <IconButton
            icon={ChevronLeftIcon}
            iconSize={iconSize.nav}
            size={layout.minTouchTarget}
            color={colors.textStrong}
            bg="transparent"
            bgPressed={colors.fieldSurface}
            onPress={handleGoBack}
            accessibilityLabel={OTP_COPY.a11y.back}
          />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, spacing.base) + spacing.sm },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View style={[styles.content, entranceStyle]}>
            {/* 2. Icon tile: flat neutral surface, no glow, no ring */}
            <View style={styles.iconTile} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <ShieldCheckIcon size={TILE_ICON_SIZE} color={colors.iconSubtle} strokeWidth={TILE_ICON_STROKE} />
            </View>

            {/* 3-4. Heading and destination */}
            <Text style={styles.title} accessibilityRole="header">
              {OTP_COPY.title}
            </Text>
            <Text style={styles.subtitle}>
              {OTP_COPY.subtitle(OTP_CONFIG.length)}
              {'\n'}
              <Text style={styles.phone} accessibilityLabel={OTP_COPY.a11y.phone(phoneEnding)}>
                {maskedPhone}
              </Text>
            </Text>

            {/* 5. Code */}
            <View style={styles.otpWrap}>
              <OTPInput
                value={otp}
                onChange={handleOtpChange}
                onComplete={handleComplete}
                error={otpState === 'error'}
                success={otpState === 'success'}
                verifying={otpState === 'verifying'}
                disabled={otpState === 'success' || isResending}
                length={OTP_CONFIG.length}
              />
            </View>

            {/* Feedback: one quiet line, reserved height so nothing below moves */}
            <View style={styles.status} accessibilityLiveRegion="polite">
              {otpState === 'verifying' && (
                <Animated.View
                  key="verifying"
                  entering={FadeIn.duration(OTP_MOTION.statusFadeIn)}
                  exiting={FadeOut.duration(OTP_MOTION.statusFadeOut)}
                  style={styles.statusRow}
                >
                  <ActivityIndicator size="small" color={colors.textSubtle} />
                  <Text style={styles.statusMuted}>{OTP_COPY.verifying}</Text>
                </Animated.View>
              )}
              {otpState === 'error' && errorMessage && (
                <Animated.Text
                  key="error"
                  entering={FadeIn.duration(OTP_MOTION.statusFadeIn)}
                  exiting={FadeOut.duration(OTP_MOTION.statusFadeOut)}
                  style={styles.statusError}
                  accessibilityRole="alert"
                >
                  {errorMessage}
                </Animated.Text>
              )}
              {otpState === 'success' && (
                <Animated.Text
                  key="success"
                  entering={FadeIn.duration(OTP_MOTION.statusFadeIn)}
                  style={styles.statusSuccess}
                >
                  {OTP_COPY.verified}
                </Animated.Text>
              )}
            </View>

            {/* 6. Resend: prompt and action on separate lines */}
            <View style={styles.resend}>
              <Text style={styles.resendPrompt}>{OTP_COPY.resendPrompt}</Text>
              <View style={styles.resendActionRow}>
                {isCountingDown ? (
                  <Text style={styles.countdown} accessibilityLabel={OTP_COPY.a11y.resendIn(timeLeft)}>
                    {OTP_COPY.resendIn} <Text style={styles.countdownTime}>{formatCountdown(timeLeft)}</Text>
                  </Text>
                ) : (
                  <Animated.View key="resend" entering={FadeIn.duration(OTP_MOTION.resendFadeIn)}>
                    <Pressable
                      onPress={handleResend}
                      disabled={isResending || otpState === 'success'}
                      hitSlop={LINK_HIT_SLOP}
                      accessibilityRole="button"
                      accessibilityLabel={OTP_COPY.a11y.resend}
                      accessibilityState={{ disabled: isResending, busy: isResending }}
                      style={({ pressed }) => pressed && styles.pressed}
                    >
                      {isResending ? (
                        <View style={styles.statusRow}>
                          <ActivityIndicator size="small" color={colors.textSubtle} />
                          <Text style={styles.countdown}>{OTP_COPY.resending}</Text>
                        </View>
                      ) : (
                        <Text style={styles.resendLink}>{OTP_COPY.resendAction}</Text>
                      )}
                    </Pressable>
                  </Animated.View>
                )}
              </View>
            </View>

            {/* 7. Change number: secondary, no divider, settles at the bottom above the keyboard */}
            <View style={styles.footer}>
              <Text style={styles.footerPrompt}>{OTP_COPY.wrongNumber} </Text>
              <Pressable
                onPress={handleGoBack}
                disabled={otpState === 'success'}
                hitSlop={LINK_HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel={OTP_COPY.a11y.changeNumber}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.footerLink}>{OTP_COPY.changeNumber}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/**
 * Vertical rhythm (spacing scale): header, 16, icon, 24, title, 8, subtitle + phone, 32, code,
 * 12, feedback, 20, resend, (flex), change number, safe area.
 */
const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.base,
  },
  content: {
    flexGrow: 1,
  },
  iconTile: {
    width: layout.otpIconTile,
    height: layout.otpIconTile,
    borderRadius: radius.md,
    backgroundColor: colors.fieldSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...textStyles.h1,
    fontFamily: fontFamily.poppins.semiBold,
    letterSpacing: letterSpacing.tight,
    color: colors.textStrong,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...textStyles.body1,
    color: colors.textSubtle,
  },
  phone: {
    fontFamily: fontFamily.inter.medium,
    letterSpacing: letterSpacing.wide,
    color: colors.textStrong,
  },
  otpWrap: {
    marginTop: spacing['3xl'],
  },
  status: {
    minHeight: textStyles.body2.lineHeight,
    marginTop: spacing.md,
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusMuted: {
    ...textStyles.body2,
    color: colors.textSubtle,
  },
  statusError: {
    ...textStyles.body2,
    color: colors.textDanger,
  },
  statusSuccess: {
    ...textStyles.body2,
    fontFamily: fontFamily.jakarta.medium,
    color: colors.textGreen,
  },
  resend: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  resendPrompt: {
    ...textStyles.body2,
    color: colors.textSubtle,
  },
  resendActionRow: {
    minHeight: textStyles.body2.lineHeight,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  countdown: {
    ...textStyles.body2,
    fontFamily: fontFamily.jakarta.medium,
    color: colors.textSubtle,
  },
  countdownTime: {
    fontFamily: fontFamily.inter.medium,
    fontVariant: ['tabular-nums'],
    color: colors.textStrong,
  },
  resendLink: {
    ...textStyles.body2,
    fontFamily: fontFamily.jakarta.semiBold,
    color: colors.primaryDark,
  },
  pressed: {
    opacity: OTP_MOTION.pressedOpacity,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: spacing['3xl'],
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerPrompt: {
    ...textStyles.body2,
    color: colors.textSubtle,
  },
  footerLink: {
    ...textStyles.body2,
    fontFamily: fontFamily.jakarta.semiBold,
    color: colors.textStrong,
  },
});
