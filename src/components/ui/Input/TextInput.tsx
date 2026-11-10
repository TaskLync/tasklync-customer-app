import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  TextInput as RNTextInput, 
  TextInputProps as RNTextInputProps, 
  View, 
  StyleSheet, 
  ViewStyle, 
  TextStyle,
  Pressable 
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring, 
  withSequence, 
  interpolateColor,
  interpolate
} from 'react-native-reanimated';

import { layout, spacing } from '@design/spacing';
import { fontFamily, fontSize } from '@design/typography';
import { shakeSequence, springConfig, timingConfig } from '@design/animations';
import { useAppTheme } from '../../../theme/useAppTheme';

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedText = Animated.createAnimatedComponent(Animated.Text);

export interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ElementType;
  rightIcon?: React.ElementType;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(({
  label,
  error,
  hint,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  value,
  onChangeText,
  onFocus,
  onBlur,
  editable = true,
  placeholder,
  ...rest
}, ref) => {
  const { colors } = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);
  
  const labelProgress = useSharedValue(value ? 1 : 0);
  const borderProgress = useSharedValue(0);
  const shakeX = useSharedValue(0);

  const isFloated = isFocused || (value && value.length > 0);

  useEffect(() => {
    labelProgress.value = withSpring(isFloated ? 1 : 0, springConfig.snappy);
    borderProgress.value = withTiming(isFocused ? 1 : 0, { duration: timingConfig.fast });
  }, [isFloated, isFocused, labelProgress, borderProgress]);

  const prevError = useRef(error);
  useEffect(() => {
    if (error && !prevError.current) {
      shakeX.value = withSequence(
        ...shakeSequence.map(x => withTiming(x, { duration: 45 }))
      );
    }
    prevError.current = error;
  }, [error, shakeX]);

  const handleFocus = useCallback((e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  }, [onFocus]);

  const handleBlur = useCallback((e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  }, [onBlur]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    let borderColor = interpolateColor(
      borderProgress.value,
      [0, 1],
      [colors.border, colors.borderFocus]
    );

    if (error) {
      borderColor = colors.borderError;
    }

    let backgroundColor = interpolateColor(
      borderProgress.value,
      [0, 1],
      [colors.bgInput, colors.bgCard]
    );

    if (!editable) {
      backgroundColor = colors.bgInput;
    }

    return {
      borderColor,
      backgroundColor,
      transform: [{ translateX: shakeX.value }]
    };
  });

  const animatedLabelStyle = useAnimatedStyle(() => {
    const translateY = interpolate(labelProgress.value, [0, 1], [0, -14]);
    const scale = interpolate(labelProgress.value, [0, 1], [1, 0.85]);
    
    let color = interpolateColor(
      borderProgress.value,
      [0, 1],
      [colors.textMuted, colors.textGreen]
    );

    if (error) {
      color = colors.textDanger;
    }

    return {
      transform: [
        { translateY },
        { scale }
      ],
      color,
    };
  });

  const iconColor = error 
    ? colors.textDanger 
    : (isFocused ? colors.primaryDark : colors.textMuted);
  const actualIconColor = !editable ? colors.textDisabled : iconColor;

  return (
    <View style={[{ width: '100%', marginBottom: spacing.md }, containerStyle]}>
      <AnimatedView 
        style={[
          styles.container, 
          animatedContainerStyle,
          !editable && { opacity: 0.5 }
        ]}
      >
        {LeftIcon && (
          <View style={styles.leftIconContainer}>
            <LeftIcon size={20} color={actualIconColor} />
          </View>
        )}
        
        <View style={styles.inputWrapper}>
          {label && (
            <AnimatedText 
              style={[
                styles.label, 
                animatedLabelStyle,
                LeftIcon ? { marginLeft: 0 } : {}
              ]}
              pointerEvents="none"
            >
              {label}
            </AnimatedText>
          )}

          <RNTextInput
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            editable={editable}
            style={[
              styles.input,
              { color: colors.textPrimary },
              inputStyle
            ]}
            selectionColor={colors.primaryDark}
            placeholder={isFloated ? placeholder : undefined}
            {...rest}
          />
        </View>

        {RightIcon && (
          <Pressable 
            style={styles.rightIconContainer} 
            onPress={onRightIconPress}
            disabled={!editable || !onRightIconPress}
          >
            <RightIcon size={20} color={actualIconColor} />
          </Pressable>
        )}
      </AnimatedView>

      {(error || hint) && (
        <AnimatedView style={styles.helperTextContainer}>
          <AnimatedText 
            style={[
              styles.helperText,
              { color: error ? colors.textDanger : colors.textSecondary }
            ]}
          >
            {error || hint}
          </AnimatedText>
        </AnimatedView>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: layout.inputH,
    borderRadius: layout.inputBorderRadius,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.inputPaddingH,
  },
  leftIconContainer: {
    marginRight: spacing.sm,
  },
  rightIconContainer: {
    marginLeft: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.label,
    left: 0,
    top: 16,
    transformOrigin: 'left top',
  },
  input: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.body1,
    height: '100%',
    paddingTop: 14,
  },
  helperTextContainer: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  helperText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.caption,
  }
});