import React, { useCallback, useState } from 'react';
import { StyleSheet, ViewStyle, ActivityIndicator, Pressable, LayoutChangeEvent, View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  interpolateColor
} from 'react-native-reanimated';
import { layout, spacing } from '@design/spacing';
import { radius } from '@design/radius';
import { springConfig } from '@design/animations';
import { fontFamily } from '@design/typography';
import { getOpticalStrokeWidth } from '@design/iconography';
import { useAppTheme } from '../../../theme/useAppTheme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedText = Animated.createAnimatedComponent(Animated.Text);
const AnimatedView = Animated.createAnimatedComponent(Animated.View);

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'text';
export type ButtonSize = 'lg' | 'md' | 'sm';
export type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'none';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ElementType; // Accept LucideIcon component
  iconPosition?: 'left' | 'right';
  iconStrokeWidth?: number;
  fullWidth?: boolean;
  style?: ViewStyle;
  haptic?: HapticFeedbackType;
  numberOfLines?: number;
}

export const Button = ({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  iconStrokeWidth,
  fullWidth = true,
  style,
  haptic = 'none',
  numberOfLines = 1,
}: ButtonProps) => {
  const { colors, palette } = useAppTheme();
  const scale = useSharedValue(1.0);
  const isPressed = useSharedValue(false);
  const [fixedWidth, setFixedWidth] = useState<number | null>(null);

  const handlePressIn = useCallback(() => {
    if (disabled || loading) return;
    isPressed.value = true;
    scale.value = withSpring(0.97, springConfig.stiff);
  }, [disabled, loading, isPressed, scale]);

  const handlePressOut = useCallback(() => {
    if (disabled || loading) return;
    isPressed.value = false;
    scale.value = withSpring(1.0, springConfig.bouncy);
  }, [disabled, loading, isPressed, scale]);

  const handlePress = useCallback(() => {
    if (disabled || loading) return;
    onPress();
  }, [disabled, loading, onPress]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    if (!loading && fixedWidth === null) {
      setFixedWidth(event.nativeEvent.layout.width);
    }
  }, [loading, fixedWidth]);

  // Size configurations
  const sizeStyles = {
    lg: {
      height: layout.primaryButtonH,
      paddingHorizontal: spacing.lg,
      fontSize: 16,
      lineHeight: 22,
      iconSize: 18,
      gap: spacing.sm,
    },
    md: {
      height: layout.secondaryButtonH,
      paddingHorizontal: spacing.md + spacing.sm, // 20px
      fontSize: 14,
      lineHeight: 20,
      iconSize: 16,
      gap: spacing.sm - 2, // 6px
    },
    sm: {
      height: layout.compactButtonH,
      paddingHorizontal: spacing.md + 2, // 14px
      fontSize: 13,
      lineHeight: 18,
      iconSize: 14,
      gap: spacing.xs + 1, // 5px
    },
  }[size];

  // Colors based on variant & state
  const getColors = () => {
    if (disabled) {
      switch (variant) {
        case 'primary': return { bg: colors.primaryBorder, text: colors.textPrimary, border: 'transparent' };
        case 'secondary': return { bg: 'transparent', text: colors.primaryBorder, border: colors.primaryBorder };
        case 'ghost': return { bg: colors.bgInput, text: colors.textPrimary, border: 'transparent', opacity: 0.5 };
        case 'danger': return { bg: palette.red300, text: colors.textOnGreen, border: 'transparent' };
        case 'text': return { bg: 'transparent', text: colors.textGreen, border: 'transparent', opacity: 0.4 };
      }
    }

    switch (variant) {
      case 'primary': return { idleBg: colors.primaryDark, pressedBg: palette.green700, text: colors.textOnGreen, border: 'transparent' };
      case 'secondary': return { idleBg: 'transparent', pressedBg: colors.primaryTint, text: colors.textGreen, border: colors.primaryDark }; // Using primaryDark for border to be visible or green600 as per spec (#16A34A)
      case 'ghost': return { idleBg: colors.bgInput, pressedBg: palette.gray100, text: colors.textPrimary, border: 'transparent' };
      case 'danger': return { idleBg: colors.danger, pressedBg: colors.dangerMedium, text: colors.textOnGreen, border: 'transparent' };
      case 'text': return { idleBg: 'transparent', pressedBg: 'transparent', text: colors.textGreen, border: 'transparent' };
    }
    return { idleBg: 'transparent', pressedBg: 'transparent', text: colors.textPrimary, border: 'transparent' };
  };

  const colorConfig = getColors();
  const fontFam = ['primary', 'secondary', 'danger'].includes(variant) 
    ? fontFamily.poppins.semiBold 
    : fontFamily.jakarta.medium;

  const animatedContainerStyle = useAnimatedStyle(() => {
    let backgroundColor = disabled ? (colorConfig as any).bg : (colorConfig as any).idleBg;
    
    if (!disabled && variant !== 'text') {
       backgroundColor = interpolateColor(
         isPressed.value ? 1 : 0,
         [0, 1],
         [(colorConfig as any).idleBg, (colorConfig as any).pressedBg]
       );
    }
    
    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    let textOpacity = 1;
    if (variant === 'text' && !disabled) {
      textOpacity = isPressed.value ? 0.7 : 1;
    }
    if (loading) {
      textOpacity = withTiming(0, { duration: 150 });
    } else {
      textOpacity = withTiming(1, { duration: 150 });
    }
    return { opacity: textOpacity };
  });

  const animatedSpinnerStyle = useAnimatedStyle(() => {
    return {
      opacity: loading ? withTiming(1, { duration: 150 }) : withTiming(0, { duration: 150 }),
      position: 'absolute',
    };
  });

  // Base structural styles
  const containerBaseStyle: ViewStyle = {
    height: sizeStyles.height,
    paddingHorizontal: sizeStyles.paddingHorizontal,
    borderRadius: size === 'sm' ? 10 : 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: fullWidth ? '100%' : undefined,
    alignSelf: fullWidth ? 'stretch' : 'center',
    borderWidth: variant === 'secondary' ? 1.5 : 0,
    borderColor: variant === 'secondary' ? colorConfig.border : 'transparent',
    opacity: (colorConfig as any).opacity || 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: ['primary', 'danger'].includes(variant) && !disabled ? 0.05 : 0,
    shadowRadius: 2,
    elevation: ['primary', 'danger'].includes(variant) && !disabled ? 1 : 0,
  };

  // If loading and fullWidth is false, lock width to prevent jitter
  const dynamicContainerStyle: ViewStyle = {};
  if (loading && !fullWidth && fixedWidth !== null) {
    dynamicContainerStyle.width = fixedWidth;
  }

  const renderContent = () => {
    const textElement = (
      <AnimatedText
        numberOfLines={numberOfLines}
        ellipsizeMode="tail"
        style={[
          styles.text,
          { 
            color: colorConfig.text, 
            fontFamily: fontFam, 
            fontSize: sizeStyles.fontSize,
            lineHeight: sizeStyles.lineHeight,
          },
          animatedTextStyle
        ]}
      >
        {label}
      </AnimatedText>
    );

    if (!Icon) {
      return (
        <View style={styles.contentRow}>
          {textElement}
        </View>
      );
    }

    const iconElement = (
      <AnimatedView style={animatedTextStyle}>
        <Icon 
          size={sizeStyles.iconSize} 
          color={colorConfig.text} 
          strokeWidth={iconStrokeWidth ?? getOpticalStrokeWidth(sizeStyles.iconSize, 'refined')}
        />
      </AnimatedView>
    );

    return (
      <View style={[styles.contentRow, { gap: sizeStyles.gap }]}>
        {iconPosition === 'left' && iconElement}
        {textElement}
        {iconPosition === 'right' && iconElement}
      </View>
    );
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: loading }}
      style={[containerBaseStyle, dynamicContainerStyle, animatedContainerStyle, style]}
      hitSlop={size === 'sm' ? 4 : 0} // Ensures min 44px for sm which is 36px
    >
      {renderContent()}
      
      {/* Spinner Overlay */}
      <AnimatedView style={[styles.spinnerContainer, animatedSpinnerStyle]}>
        <ActivityIndicator color={colorConfig.text} />
      </AnimatedView>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  text: {
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    alignSelf: 'center',
  },
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    ...(StyleSheet.absoluteFill as any),
  }
});
