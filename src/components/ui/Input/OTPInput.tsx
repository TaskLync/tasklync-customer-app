import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text,
  TextInput as RNTextInput, 
  StyleSheet,
  Pressable,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  withSequence,
  withDelay
} from 'react-native-reanimated';

import { radius } from '@design/radius';
import { fontFamily } from '@design/typography';
import { shakeSequence, springConfig } from '@design/animations';
import { useAppTheme } from '../../../theme/useAppTheme';

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface OTPInputProps {
  value: string;
  onChange: (val: string) => void;
  onComplete?: (val: string) => void;
  error?: boolean;
  success?: boolean;
  verifying?: boolean;
  disabled?: boolean;
  length?: number;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChange,
  onComplete,
  error = false,
  success = false,
  verifying = false,
  disabled = false,
  length = 6,
}) => {
  const { colors } = useAppTheme();
  const inputRef = useRef<RNTextInput>(null);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [selection, setSelection] = useState<{ start: number; end: number }>({
    start: value.length,
    end: value.length,
  });

  // Animation values
  const shakeX = useSharedValue(0);

  // Individual box spring bounce shared values (fixed array of 6 to strictly respect React Hooks)
  const s0 = useSharedValue(1.0);
  const s1 = useSharedValue(1.0);
  const s2 = useSharedValue(1.0);
  const s3 = useSharedValue(1.0);
  const s4 = useSharedValue(1.0);
  const s5 = useSharedValue(1.0);
  const scales = [s0, s1, s2, s3, s4, s5];

  // Auto-focus on initial mount
  useEffect(() => {
    if (!disabled && !verifying && !success) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [disabled, verifying, success]);

  // Keep selection synchronized with value length when typing
  useEffect(() => {
    setSelection({ start: value.length, end: value.length });
  }, [value.length]);

  // Handle Error Shake animation (does NOT auto-wipe user digits)
  useEffect(() => {
    if (error) {
      shakeX.value = withSequence(
        ...shakeSequence.map(x => withTiming(x, { duration: 45 }))
      );
      // Keep keyboard active so user can immediately correct the code
      inputRef.current?.focus();
    }
  }, [error, shakeX]);

  // Handle Success Cascade Bounce (celebration on backend confirmation)
  useEffect(() => {
    if (success) {
      scales.forEach((scale, index) => {
        scale.value = withDelay(
          index * 45,
          withSequence(
            withSpring(1.08, springConfig.bouncy),
            withSpring(1.0, springConfig.bouncy)
          )
        );
      });
    }
  }, [success]);

  const handleTextChange = useCallback((text: string) => {
    if (disabled || verifying || success) return;

    // Sanitize to numeric digits only and clamp to exact length
    const sanitized = text.replace(/[^0-9]/g, '').slice(0, length);

    // Micro-interaction bounce on newly typed box
    if (sanitized.length > value.length && sanitized.length <= length) {
      const typedIndex = sanitized.length - 1;
      if (scales[typedIndex]) {
        scales[typedIndex].value = withSequence(
          withSpring(1.06, springConfig.bouncy),
          withSpring(1.0, springConfig.bouncy)
        );
      }
    }

    onChange(sanitized);

    // Automatically trigger completion when exactly 6 digits are populated
    if (sanitized.length === length && onComplete) {
      onComplete(sanitized);
    }
  }, [disabled, verifying, success, length, value.length, onChange, onComplete, scales]);

  const handleSelectionChange = useCallback((
    e: NativeSyntheticEvent<TextInputSelectionChangeEventData>
  ) => {
    setSelection(e.nativeEvent.selection);
  }, []);

  const handleBoxPress = useCallback((index: number) => {
    if (disabled || verifying || success) return;

    // Direct cursor to tapped box or clamped to next empty position
    const target = Math.min(index, value.length);
    setSelection({
      start: target,
      end: target < value.length ? target + 1 : target,
    });
    inputRef.current?.focus();
  }, [disabled, verifying, success, value.length]);

  const containerShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const activeInput = !disabled && !verifying && !success;

  return (
    <AnimatedView style={[styles.container, containerShakeStyle]}>
      {/* Master Hidden Input: handles numeric keyboard, pasting, SMS autofill & backspaces */}
      <RNTextInput
        ref={inputRef}
        value={value}
        onChangeText={handleTextChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onSelectionChange={handleSelectionChange}
        selection={selection}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        editable={activeInput}
        caretHidden={true}
        style={styles.hiddenInput}
        accessibilityLabel={`One-time verification code, ${length} digits`}
        accessibilityRole="text"
      />

      {/* Visual Display Boxes */}
      <View style={styles.boxesRow}>
        {Array.from({ length }).map((_, index) => {
          const char = value[index] || '';
          const isFilled = char.length > 0;
          
          // Focused box: active cursor position or first empty box
          const isCurrentFocus = isFocused && activeInput && !error && (
            selection.start === index || 
            (selection.start >= value.length && index === value.length)
          );

          let bgColor = colors.bgInput;
          let borderColor = colors.border;
          let textColor = colors.textPrimary;

          if (error) {
            // Subtle red error state across all boxes
            bgColor = colors.dangerLight; // #FEF2F2
            borderColor = colors.borderError; // #EF4444
            textColor = colors.textDanger; // #DC2626
          } else if (success) {
            // Confirmed green success state ONLY after backend validation
            bgColor = colors.bgSuccess; // #F0FDF4
            borderColor = colors.borderSuccess; // #22C55E
            textColor = colors.textPrimary;
          } else if (isCurrentFocus) {
            // Emerald focus ring on active box only
            bgColor = colors.bgCard; // #FFFFFF
            borderColor = colors.borderFocus; // #16A34A
            textColor = colors.textPrimary;
          } else if (isFilled) {
            // Neutral soft border on populated boxes
            bgColor = colors.bgCard; // #FFFFFF
            borderColor = colors.border; // #E2E8F0
            textColor = colors.textPrimary;
          }

          const animatedBoxStyle = useAnimatedStyle(() => {
            const scaleVal = scales[index] ? scales[index].value : 1.0;
            return {
              transform: [{ scale: scaleVal }],
            };
          });

          return (
            <AnimatedPressable
              key={index}
              onPress={() => handleBoxPress(index)}
              style={[
                styles.boxContainer,
                {
                  backgroundColor: bgColor,
                  borderColor,
                  borderWidth: isCurrentFocus || error || success ? 2 : 1.5,
                  opacity: verifying ? 0.85 : 1,
                },
                animatedBoxStyle,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Digit ${index + 1} of ${length}: ${char || 'empty'}`}
              accessibilityState={{
                selected: isCurrentFocus,
                disabled: !activeInput,
              }}
            >
              <Text style={[styles.digitText, { color: textColor }]}>
                {char}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </AnimatedView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  boxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  boxContainer: {
    width: 50,
    height: 58,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  digitText: {
    textAlign: 'center',
    fontFamily: fontFamily.inter.bold,
    fontSize: 22,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
    fontSize: 1,
    color: 'transparent',
    zIndex: 1,
  },
});
