/**
 * OTP verification: behaviour, motion and copy in one place.
 * The screen, the OTPInput component, the auth hook and the validation schema all read from here,
 * so the code length, cooldown or wording can change without touching UI code.
 *
 *   EXPO_PUBLIC_OTP_RESEND_SECONDS   optional cooldown before "Resend code" unlocks (used when the
 *                                    API response does not send its own `expiresIn`)
 */
import { timingConfig, stagger } from '../design/animations';
import { spacing } from '../design/spacing';

const envPositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt((value ?? '').trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const OTP_CONFIG = {
  /** Number of digits in the verification code. */
  length: 6,
  /** Countdown before resend is allowed, unless the API returns `expiresIn`. */
  resendCooldownSeconds: envPositiveInt(process.env.EXPO_PUBLIC_OTP_RESEND_SECONDS, 60),
  /** Time the success state stays on screen before navigation. */
  successNavigationDelayMs: 800,
  /** Digits of the phone number left visible when masked. */
  visiblePhoneDigits: 2,
  /** Length of the national part of the phone number (the rest is the country code). */
  nationalNumberLength: 10,
  /** Route used for "Change number" when there is no screen to go back to. */
  phoneRoute: '/(auth)/phone',
  toastIds: {
    verifyError: 'otp-verify-error',
    resend: 'otp-resend-toast',
  },
} as const;

export const OTP_MOTION = {
  entranceDuration: timingConfig.slow,
  entranceOffset: spacing.sm,
  autoFocusDelay: timingConfig.normal,
  colorTransition: timingConfig.fast,
  digitEnterDuration: timingConfig.fast,
  digitEnterOffset: spacing.xs,
  shakeStepDuration: stagger.normal,
  /** Fraction of the shared shakeSequence amplitude: a restrained nudge, not a wobble. */
  shakeScale: 0.5,
  caretHold: timingConfig.slow,
  caretFade: timingConfig.instant,
  statusFadeIn: timingConfig.fast,
  statusFadeOut: timingConfig.instant,
  resendFadeIn: timingConfig.normal,
  verifyingOpacity: 0.5,
  pressedOpacity: 0.55,
} as const;

export const OTP_COPY = {
  title: 'Verify your number',
  subtitle: (length: number) => `We sent a ${length}-digit code to`,
  verifying: 'Verifying…',
  verified: 'Verified',
  verifyFailed: 'Incorrect verification code. Please try again.',
  resendPrompt: "Didn't receive a code?",
  resendIn: 'Resend code in',
  resendAction: 'Resend code',
  resending: 'Sending…',
  resendSuccess: 'We sent you a new code.',
  resendFailed: "Couldn't resend the code. Please try again.",
  wrongNumber: 'Wrong number?',
  changeNumber: 'Change number',
  incompleteCode: (length: number) => `Please enter all ${length} digits`,
  a11y: {
    back: 'Go back',
    phone: (lastDigits: string) => `phone number ending in ${lastDigits}`,
    input: (length: number, entered: number) =>
      `Verification code, ${length} digits. ${entered} entered.`,
    inputHint: 'Enter or paste the code we sent by SMS',
    resendIn: (seconds: number) => `Resend available in ${seconds} seconds`,
    resend: 'Resend verification code',
    changeNumber: 'Change phone number',
  },
} as const;
