import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { AlertCircle, ChevronDown, Ticket } from 'lucide-react-native';
import { fontFamily } from '../../design';
import { CODE_MAX_LENGTH, formatLockoutRemaining, isCodeInputValid } from '../../utils/offers';
import { AppliedDiscountChip } from './AppliedDiscountChip';
import type { usePromoCode } from '../../hooks/usePromoCode';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

type PromoController = ReturnType<typeof usePromoCode>;

interface PromoCodeInputProps {
  promo: PromoController;
  workerName?: string | undefined;
  /** Called when the field gains focus, so the screen can scroll it above the keyboard. */
  onFocusField?: (() => void) | undefined;
}

/**
 * "Have a promo code?" row → input → applied chip.
 *   collapsed ─tap→ editing ─Apply→ validating ─→ applied | invalid (message under the field) | locked
 * The message under the field is the server's own text; reasons are never guessed (spec 9.4).
 */
export const PromoCodeInput: React.FC<PromoCodeInputProps> = ({ promo, workerName, onFocusField }) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { input, status, applied, message, isBusy, isLocked, lockRemainingMs, setInput, apply, remove } = promo;
  const inputRef = useRef<TextInput>(null);
  const [expanded, setExpanded] = useState<boolean>(Boolean(input) || status !== 'idle');
  const [focused, setFocused] = useState(false);

  // An applied code takes the place of the field.
  if (applied && status === 'applied') {
    return (
      <Animated.View layout={LinearTransition.duration(200)} style={styles.section}>
        <AppliedDiscountChip applied={applied} workerName={workerName} onRemove={remove} />
      </Animated.View>
    );
  }

  const showField = expanded || status !== 'idle' || input.length > 0;

  if (!showField) {
    return (
      <Animated.View layout={LinearTransition.duration(200)} style={styles.section}>
        <Pressable
          onPress={() => {
            setExpanded(true);
            // Focus after the field mounts.
            setTimeout(() => inputRef.current?.focus(), 60);
          }}
          style={({ pressed }) => [styles.collapsedRow, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Add a promo code"
        >
          <View style={styles.leading}>
            <Ticket size={18} color={colors.textPrimary} strokeWidth={2} />
            <Text style={styles.collapsedText}>Have a promo code?</Text>
          </View>
          <ChevronDown size={18} color={colors.textMuted} />
        </Pressable>
      </Animated.View>
    );
  }

  const hasError = (status === 'invalid' || status === 'error' || status === 'locked') && Boolean(message);
  const canApply = isCodeInputValid(input) && !isBusy && !isLocked;

  return (
    <Animated.View
      entering={FadeInDown.duration(180)}
      layout={LinearTransition.duration(200)}
      style={styles.section}
    >
      <Text style={styles.label}>Promo code</Text>

      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          hasError && styles.fieldError,
          isLocked && styles.fieldDisabled,
        ]}
      >
        <Ticket size={18} color={colors.textMuted} strokeWidth={2} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={input}
          onChangeText={setInput}
          onFocus={() => {
            setFocused(true);
            onFocusField?.();
          }}
          onBlur={() => setFocused(false)}
          onSubmitEditing={apply}
          placeholder="Enter code"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          returnKeyType="done"
          maxLength={CODE_MAX_LENGTH}
          editable={!isBusy && !isLocked}
          accessibilityLabel="Promo code"
        />
        <Pressable
          onPress={apply}
          disabled={!canApply}
          style={({ pressed }) => [
            styles.applyBtn,
            !canApply && styles.applyBtnDisabled,
            pressed && canApply && styles.applyBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canApply, busy: isBusy }}
          accessibilityLabel="Apply promo code"
        >
          {isBusy ? (
            <ActivityIndicator size="small" color={palette.pureWhite} />
          ) : (
            <Text style={[styles.applyText, !canApply && styles.applyTextDisabled]}>Apply</Text>
          )}
        </Pressable>
      </View>

      {hasError ? (
        <Animated.View entering={FadeIn.duration(160)} style={styles.errorRow} accessibilityRole="alert">
          <AlertCircle size={14} color={colors.textDanger} style={styles.errorIcon} />
          <View style={styles.errorTextWrap}>
            <Text style={styles.errorText}>{message}</Text>
            {isLocked ? (
              <Text style={styles.errorHint}>
                You can try again in about {formatLockoutRemaining(lockRemainingMs)}.
              </Text>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  section: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: 14,
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
  },
  pressed: {
    opacity: 0.6,
  },
  leading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  collapsedText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  label: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: 12,
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldFocused: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.white,
  },
  fieldError: {
    borderColor: colors.borderError,
  },
  fieldDisabled: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: fontFamily.inter.semiBold,
    fontSize: 15,
    letterSpacing: 0.6,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  applyBtn: {
    minWidth: 68,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.inverseSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnPressed: {
    opacity: 0.85,
  },
  applyBtnDisabled: {
    backgroundColor: palette.gray100,
  },
  applyText: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 13.5,
    color: colors.textInverse,
  },
  applyTextDisabled: {
    color: palette.gray400,
  },
  errorRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  errorIcon: {
    marginTop: 2,
  },
  errorTextWrap: {
    flex: 1,
  },
  errorText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textDanger,
  },
  errorHint: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
