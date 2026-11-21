import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View, TextInput as RNTextInput, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { fontFamily, fontSize, textStyles } from '@design/typography';
import { layout } from '@design/spacing';
import { radius } from '@design/radius';
import { shakeSequence } from '@design/animations';
import { OTP_CONFIG, OTP_COPY, OTP_MOTION } from '../../../config/otp.config';
import { sanitizeOtpInput } from '@utils/otp';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

export interface OTPInputProps {
  value: string;
  onChange: (val: string) => void;
  onComplete?: (val: string) => void;
  error?: boolean;
  success?: boolean;
  verifying?: boolean;
  disabled?: boolean;
  length?: number;
  autoFocus?: boolean;
}

type CellState = 'idle' | 'active' | 'error' | 'success';

/**
 * The hidden input must stay rendered and hit-testable (Android ignores fully transparent views for
 * paste / autofill), so it keeps a near-zero opacity and a minimal font size instead of 0.
 */
const HIDDEN_INPUT_OPACITY = 0.011;
const HIDDEN_INPUT_FONT_SIZE = 1;

const colorTiming = { duration: OTP_MOTION.colorTransition, easing: Easing.out(Easing.quad) };
const shakeSteps = shakeSequence.map((x) => x * OTP_MOTION.shakeScale);

/**
 * Borderless code cells driven by ONE hidden TextInput. A single native input is what makes paste,
 * Android SMS autofill (`autoComplete="sms-otp"`), iOS one-time-code suggestions and backspace all
 * behave natively; the cells are purely presentational.
 *
 * Resting cells are a flat neutral surface. Only the active cell lifts (raised surface, hairline border,
 * slim caret); error and success tint the surface rather than outlining every cell.
 */
export const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChange,
  onComplete,
  error = false,
  success = false,
  verifying = false,
  disabled = false,
  length = OTP_CONFIG.length,
  autoFocus = true,
}) => {
  const styles = useThemedStyles(createStyles);
  const inputRef = useRef<RNTextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const shakeX = useSharedValue(0);

  const interactive = !disabled && !verifying && !success;

  // Focus once the screen has settled, and again whenever input becomes possible after a verify
  // attempt or resend.
  useEffect(() => {
    if (!autoFocus || !interactive) return;
    const timer = setTimeout(() => inputRef.current?.focus(), OTP_MOTION.autoFocusDelay);
    return () => clearTimeout(timer);
  }, [autoFocus, interactive]);

  // Invalid code: one restrained horizontal nudge. Digits are kept so the user can correct in place.
  useEffect(() => {
    if (!error) return;
    shakeX.value = withSequence(
      ...shakeSteps.map((x) => withTiming(x, { duration: OTP_MOTION.shakeStepDuration })),
    );
    inputRef.current?.focus();
  }, [error, shakeX]);

  useEffect(() => () => cancelAnimation(shakeX), [shakeX]);

  const handleTextChange = useCallback(
    (text: string) => {
      if (!interactive) return;
      const next = sanitizeOtpInput(text, length);
      if (next === value) return;
      onChange(next);
      if (next.length === length) onComplete?.(next);
    },
    [interactive, length, value, onChange, onComplete],
  );

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const activeIndex = Math.min(value.length, length - 1);

  // The row, not each cell, carries the size cap: cells are equal flex shares of a row that is at most
  // `length` full-size cells plus gaps, and the row is centred. On narrow screens the row is the full
  // width and the cells shrink equally; on wide screens the spare width is split evenly on both sides.
  const rowMaxWidth = length * layout.otpCellMaxW + (length - 1) * layout.otpCellGap;

  return (
    <Animated.View style={[styles.container, shakeStyle]}>
      <View style={[styles.row, { maxWidth: rowMaxWidth }]} pointerEvents="none">
        {Array.from({ length }, (_, index) => {
          const char = value[index] ?? '';
          let state: CellState = 'idle';
          if (error) state = 'error';
          else if (success) state = 'success';
          else if (isFocused && interactive && index === activeIndex) state = 'active';

          return (
            <OTPCell
              key={index}
              char={char}
              state={state}
              dimmed={verifying}
              showCaret={state === 'active' && !char}
            />
          );
        })}
      </View>

      {/* Transparent native input stretched over the cells: receives taps, long-press paste and autofill. */}
      <RNTextInput
        ref={inputRef}
        value={value}
        onChangeText={handleTextChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        importantForAutofill="yes"
        autoCorrect={false}
        spellCheck={false}
        editable={interactive}
        caretHidden
        selectionColor="transparent"
        cursorColor="transparent"
        style={styles.hiddenInput}
        accessibilityLabel={OTP_COPY.a11y.input(length, value.length)}
        accessibilityHint={OTP_COPY.a11y.inputHint}
      />
    </Animated.View>
  );
};

interface OTPCellProps {
  char: string;
  state: CellState;
  dimmed: boolean;
  showCaret: boolean;
}

const OTPCell = memo(function OTPCell({ char, state, dimmed, showCaret }: OTPCellProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  // Idle cells use their own surface colour as the border, so the border is invisible but the
  // geometry never changes between states.
  const tones: Record<CellState, { bg: string; border: string; text: string }> = {
    idle: { bg: colors.fieldSurface, border: colors.fieldSurface, text: colors.textStrong },
    active: { bg: colors.fieldSurfaceActive, border: colors.fieldBorderActive, text: colors.textStrong },
    error: { bg: colors.dangerLight, border: colors.borderErrorLight, text: colors.textDangerDark },
    success: { bg: colors.fieldSurface, border: colors.borderSuccessLight, text: colors.textGreen },
  };
  const { bg, border, text } = tones[state];

  // Digit entry: a quick fade with a small rise; no scaling, so typing stays crisp.
  const digitProgress = useSharedValue(char ? 1 : 0);
  useEffect(() => {
    digitProgress.value = 0;
    if (char) {
      digitProgress.value = withTiming(1, {
        duration: OTP_MOTION.digitEnterDuration,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [char, digitProgress]);

  // Slim blinking caret in the active empty cell.
  const caret = useSharedValue(1);
  useEffect(() => {
    if (!showCaret) {
      cancelAnimation(caret);
      return;
    }
    caret.value = 1;
    caret.value = withRepeat(
      withSequence(
        withDelay(OTP_MOTION.caretHold, withTiming(0, { duration: OTP_MOTION.caretFade })),
        withDelay(OTP_MOTION.caretHold, withTiming(1, { duration: OTP_MOTION.caretFade })),
      ),
      -1,
    );
    return () => cancelAnimation(caret);
  }, [showCaret, caret]);

  useEffect(() => () => cancelAnimation(digitProgress), [digitProgress]);

  const cellStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(bg, colorTiming),
    borderColor: withTiming(border, colorTiming),
  }));

  const digitStyle = useAnimatedStyle(() => ({
    opacity: digitProgress.value,
    transform: [{ translateY: (1 - digitProgress.value) * OTP_MOTION.digitEnterOffset }],
  }));

  const caretStyle = useAnimatedStyle(() => ({ opacity: caret.value }));

  return (
    <Animated.View style={[styles.cell, cellStyle]}>
      {showCaret ? (
        <Animated.View style={[styles.caret, caretStyle]} />
      ) : (
        <View style={dimmed && styles.digitDimmed}>
          <Animated.Text style={[styles.digit, { color: text }, digitStyle]} allowFontScaling={false}>
            {char}
          </Animated.Text>
        </View>
      )}
    </Animated.View>
  );
});

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    container: {
      width: '100%',
    },
    row: {
      flexDirection: 'row',
      width: '100%',
      alignSelf: 'center',
      gap: layout.otpCellGap,
    },
    cell: {
      // Equal shares of the row (basis 0), so every cell has the same width.
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      minWidth: 0,
      height: layout.otpCellH,
      borderRadius: radius.md,
      borderWidth: layout.otpCellBorderW,
      alignItems: 'center',
      justifyContent: 'center',
    },
    digit: {
      fontFamily: fontFamily.inter.medium,
      fontSize: fontSize.h2,
      lineHeight: textStyles.h2.lineHeight,
      includeFontPadding: false,
      textAlign: 'center',
    },
    digitDimmed: {
      opacity: OTP_MOTION.verifyingOpacity,
    },
    caret: {
      width: layout.otpCaretW,
      height: layout.otpCaretH,
      borderRadius: layout.otpCaretW,
      backgroundColor: colors.textStrong,
    },
    hiddenInput: {
      ...StyleSheet.absoluteFill,
      opacity: HIDDEN_INPUT_OPACITY,
      color: 'transparent',
      fontSize: HIDDEN_INPUT_FONT_SIZE,
    },
  });
