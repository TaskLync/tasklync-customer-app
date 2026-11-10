import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { fontFamily, fontSize, spacing } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface ReviewCommentInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * ReviewCommentInput Component
 *
 * Multiline comment box conforming to REVIEW_SERVICE_CUSTOMER_API_SPECIFICATION.md:
 * - Supports up to 2000 characters
 * - Live character counter ("120 / 2000") with subtle warning tone shift near 90%
 * - Android textAlignVertical: 'top' support
 * - Clean focus state indicator with theme tokens
 */
export const ReviewCommentInput: React.FC<ReviewCommentInputProps> = ({
  value,
  onChangeText,
  placeholder = 'Tell us about your experience (optional)',
  maxLength = 2000,
  disabled = false,
  onFocus,
  onBlur,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [isFocused, setIsFocused] = useState(false);
  const charCount = value.length;
  const warningThreshold = Math.floor(maxLength * 0.9);
  const isNearLimit = charCount >= warningThreshold;
  const isOverLimit = charCount > maxLength;

  return (
    <View style={styles.container}>

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          disabled && styles.inputWrapperDisabled,
          isOverLimit && styles.inputWrapperError,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          multiline
          maxLength={maxLength}
          editable={!disabled}
          onFocus={() => {
            setIsFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          style={styles.textInput}
          textAlignVertical="top"
          accessibilityLabel="Review comments"
          accessibilityHint={`Optional feedback up to ${maxLength} characters`}
        />

        {/* Live Character Counter */}
        <View style={styles.counterRow}>
          <Text
            style={[
              styles.counterText,
              isNearLimit && styles.counterTextWarning,
              isOverLimit && styles.counterTextError,
            ]}
          >
            <Text style={styles.counterNumber}>{charCount}</Text>
            <Text style={styles.counterLimit}> / {maxLength}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  label: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body1 - 1,
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
  },
  inputWrapper: {
    backgroundColor: colors.bgInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    minHeight: 112,
  },
  inputWrapperFocused: {
    backgroundColor: colors.bgCard,
    borderColor: colors.primaryDark,
  },
  inputWrapperDisabled: {
    backgroundColor: palette.gray100,
    opacity: 0.7,
  },
  inputWrapperError: {
    borderColor: colors.textDanger,
  },
  textInput: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.body2,
    color: colors.textPrimary,
    minHeight: 80,
    paddingTop: 0,
    paddingBottom: spacing.sm,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  counterText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.dataSM - 1,
    color: colors.textMuted,
  },
  counterNumber: {
    fontFamily: fontFamily.jakarta.semiBold,
    color: colors.textSecondary,
  },
  counterLimit: {
    color: colors.textMuted,
  },
  counterTextWarning: {
    color: palette.warning,
  },
  counterTextError: {
    color: colors.textDanger,
  },
});
