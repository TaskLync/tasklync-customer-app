import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  interpolate,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { typography } from '../../../design/typography';
import { springConfig } from '../../../design/animations';
import { useAppTheme } from '../../../theme/useAppTheme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedText = Animated.createAnimatedComponent(Text);

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: any; // LucideIcon or ReactNode
  trailingIcon?: any;
  onTrailingPress?: () => void;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'filter' | 'status' | 'skill' | 'tag';
  /** 'neutral': grey chip, selected = white with a charcoal outline and dark text (no brand fill). */
  tone?: 'brand' | 'neutral';
  statusColor?: 'success' | 'warning' | 'danger' | 'info';
  showCheckmark?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  icon: Icon,
  trailingIcon: TrailingIcon,
  onTrailingPress,
  size = 'md',
  variant = 'filter',
  tone = 'brand',
  statusColor,
  showCheckmark = true,
  style,
  textStyle,
  disabled = false,
}) => {
  const { colors } = useAppTheme();
  const isInteractive = !!onPress && !disabled;
  const scale = useSharedValue(1);
  const selectionProgress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    if (variant === 'filter') {
      selectionProgress.value = withTiming(selected ? 1 : 0, { duration: 150 });
    }
  }, [selected, variant, selectionProgress]);

  const handlePressIn = () => {
    if (!isInteractive) return;
    scale.value = withSpring(0.96, springConfig.stiff);
  };

  const handlePressOut = () => {
    if (!isInteractive) return;
    scale.value = withSpring(1.0, springConfig.stiff); // Removed bouncy to prevent double-pulse heartbeat effect
  };

  const handlePress = () => {
    if (!isInteractive) return;
    onPress();
  };

  const containerAnimatedStyle = useAnimatedStyle(() => {
    let backgroundColor = colors.bgInput;
    let borderColor = 'transparent';

    if (variant === 'filter' && tone === 'neutral') {
      backgroundColor = interpolateColor(selectionProgress.value, [0, 1], [colors.bgInput, colors.bgCard]);
      // same colour as the fill when unselected, so selecting never shifts the layout
      borderColor = interpolateColor(selectionProgress.value, [0, 1], [colors.bgInput, colors.textPrimary]);
    } else if (variant === 'filter') {
      backgroundColor = interpolateColor(
        selectionProgress.value,
        [0, 1],
        [colors.bgInput, colors.primary]
      );
    } else if (variant === 'status') {
      switch (statusColor) {
        case 'success':
          backgroundColor = colors.bgSuccess;
          borderColor = colors.borderSuccessLight;
          break;
        case 'warning':
          backgroundColor = colors.warningLight;
          borderColor = colors.warningBorder;
          break;
        case 'danger':
          backgroundColor = colors.dangerLight;
          borderColor = colors.borderErrorLight;
          break;
        case 'info':
          backgroundColor = colors.infoLight;
          borderColor = colors.borderInfoLight;
          break;
      }
    } else if (variant === 'skill') {
      if (selected) {
        backgroundColor = colors.bgSuccess; // Needs to be defined in colors, assuming valid
        borderColor = colors.primaryBorder || colors.primary;
      } else {
        backgroundColor = colors.bgInput;
      }
    } else if (variant === 'tag') {
      backgroundColor = colors.bgSection;
    }

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
      borderColor,
      borderWidth:
        variant === 'status' || (variant === 'skill' && selected)
          ? 1
          : variant === 'filter' && tone === 'neutral'
            ? 1.25
            : 0,
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    let color = colors.textMuted;
    
    if (variant === 'filter' && tone === 'neutral') {
      color = interpolateColor(selectionProgress.value, [0, 1], [colors.textSecondary, colors.textPrimary]);
    } else if (variant === 'filter') {
      color = interpolateColor(
        selectionProgress.value,
        [0, 1],
        [colors.textMuted, colors.white]
      );
    } else if (variant === 'status') {
      switch (statusColor) {
        case 'success': color = colors.textGreenDark; break;
        case 'warning': color = colors.textWarning; break;
        case 'danger': color = colors.textDangerDark; break;
        case 'info': color = colors.textInfoDark; break;
      }
    } else if (variant === 'skill') {
      color = selected ? colors.textGreen || colors.primary : colors.textMuted;
    } else if (variant === 'tag') {
      color = colors.textSecondary || colors.textMuted;
    }

    return { color };
  });

  const checkmarkAnimatedStyle = useAnimatedStyle(() => {
    if (variant !== 'filter' || !showCheckmark) return { width: 0, opacity: 0, transform: [{ scale: 0 }] };
    return {
      width: interpolate(selectionProgress.value, [0, 1], [0, 16], 'clamp'),
      opacity: selectionProgress.value,
      transform: [{ scale: interpolate(selectionProgress.value, [0, 1], [0, 1], 'clamp') }],
      marginRight: interpolate(selectionProgress.value, [0, 1], [0, 4], 'clamp'),
    };
  });

  // Size specific styles
  const sizeStyles = {
    xs: { height: 26, paddingHorizontal: 8, fontSize: 11 },
    sm: { height: 30, paddingHorizontal: 10, fontSize: 12 },
    md: { height: 36, paddingHorizontal: 14, fontSize: 13 },
  }[size];

  const fontStyle = typography.fontFamily.jakarta.medium;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!isInteractive}
      // @ts-ignore - delayPressIn exists on Pressable but Animated.createAnimatedComponent loses it in some versions
      delayPressIn={0}
      style={[
        styles.base,
        {
          height: sizeStyles.height,
          paddingHorizontal: sizeStyles.paddingHorizontal,
        },
        containerAnimatedStyle,
        style,
      ]}
    >
      {variant === 'filter' && showCheckmark && (
        <AnimatedView style={[styles.checkmarkContainer, checkmarkAnimatedStyle]}>
          <Check size={14} color={colors.pureWhite} />
        </AnimatedView>
      )}

      {Icon && (
        <View style={styles.iconContainer}>
          {React.isValidElement(Icon) ? (
            Icon
          ) : (
            (() => {
              const IconComponent = Icon as React.ComponentType<any>;
              return (
                <IconComponent
                  size={size === 'xs' ? 12 : 14}
                  color={variant === 'filter' && selected ? (tone === 'neutral' ? colors.textPrimary : colors.pureWhite) : colors.textMuted}
                />
              );
            })()
          )}
        </View>
      )}

      <AnimatedText
        style={[
          {
            fontFamily: fontStyle,
            fontSize: sizeStyles.fontSize,
          },
          textAnimatedStyle,
          textStyle,
        ]}
      >
        {label}
      </AnimatedText>

      {TrailingIcon && (
        <Pressable
          onPress={(e) => {
            if (onTrailingPress) {
              e.stopPropagation();
              onTrailingPress();
            }
          }}
          hitSlop={12}
          style={styles.trailingIconContainer}
        >
          {React.isValidElement(TrailingIcon) ? (
            TrailingIcon
          ) : (
            (() => {
              const TrailingIconComponent = TrailingIcon as React.ComponentType<any>;
              return (
                <TrailingIconComponent
                  size={size === 'xs' ? 12 : 14}
                  color={variant === 'filter' && selected ? (tone === 'neutral' ? colors.textPrimary : colors.pureWhite) : colors.textMuted}
                />
              );
            })()
          )}
        </Pressable>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100, // pill
  },
  checkmarkContainer: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 6,
  },
  trailingIconContainer: {
    marginLeft: 6,
  },
});
