import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import {
  iconSize,
  IconSizeKey,
  getOpticalStrokeWidth,
  iconEnclosures,
  createEnclosureVariants,
  iconOpticalOffsets,
} from '../../../design/iconography';
import { springConfig } from '../../../design/animations';
import { Text } from '../Text/Text';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type EnclosureVariant = keyof typeof iconEnclosures.variants;
export type EnclosureSizeTier = keyof typeof iconEnclosures.sizes;

export interface PremiumIconProps {
  /** Lucide icon or custom SVG icon component */
  icon: React.ElementType;
  /** Size token or exact numeric pixel value (defaults to 'action' = 20px) */
  size?: IconSizeKey | number;
  /** Explicit stroke width override. If omitted, optically calibrated */
  strokeWidth?: number;
  /** Optical stroke preset ('hairline' = 1.25, 'refined' = 1.6-1.7, 'strong' = 2.0) */
  strokePreset?: 'hairline' | 'refined' | 'balanced' | 'strong';
  /** Icon color (defaults to textPrimary) */
  color?: string;
  /** Optional enclosure container (squircle / pill) */
  enclosure?: EnclosureVariant;
  /** Enclosure size tier (sm = 32, md = 40, lg = 48, xl = 56, hero = 72) */
  enclosureSize?: EnclosureSizeTier | number;
  /** Custom enclosure radius override */
  enclosureRadius?: number;
  /** Whether to apply optical centering compensation for directional glyphs (e.g. Chevrons, Play) */
  opticalAlign?: boolean;
  /** Name of the icon for optical offset lookup (e.g. 'ChevronRight') */
  iconName?: string;
  /** Optional interactive press handler */
  onPress?: () => void;
  /** Haptic feedback style on press (deprecated, no-op) */
  haptic?: 'light' | 'medium' | 'heavy' | 'selection' | 'none';
  /** Badge counter or indicator dot */
  badge?: number | boolean;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
  /** Accessibility hint */
  accessibilityHint?: string;
  /** Disabled interactive state */
  disabled?: boolean;
  /** Custom container style */
  style?: ViewStyle;
}

export const PremiumIcon: React.FC<PremiumIconProps> = ({
  icon: IconComponent,
  size = 'action',
  strokeWidth: customStrokeWidth,
  strokePreset = 'refined',
  color: colorProp,
  enclosure = 'naked',
  enclosureSize,
  enclosureRadius,
  opticalAlign = true,
  iconName,
  onPress,
  haptic = 'none',
  badge,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
  style,
}) => {
  const { colors } = useAppTheme();
  const enclosureVariants = useThemedStyles(createEnclosureVariants);
  const styles = useThemedStyles(createStyles);
  const color = colorProp ?? colors.textPrimary;
  // Resolve numeric icon size
  const resolvedIconSize: number = typeof size === 'number' ? size : iconSize[size];

  // Resolve optical stroke width
  const resolvedStrokeWidth =
    customStrokeWidth ?? getOpticalStrokeWidth(resolvedIconSize, strokePreset);

  // Compute optical offset
  const offset =
    opticalAlign && iconName && iconOpticalOffsets[iconName]
      ? iconOpticalOffsets[iconName]
      : { x: 0, y: 0 };

  // Resolve container dimensions & styling
  const isEnclosed = enclosure !== 'naked';
  let containerDimension = resolvedIconSize;
  let containerRadius = 0;

  if (isEnclosed) {
    if (typeof enclosureSize === 'number') {
      containerDimension = enclosureSize;
      containerRadius = enclosureRadius ?? containerDimension / 2;
    } else if (enclosureSize && iconEnclosures.sizes[enclosureSize]) {
      const tier = iconEnclosures.sizes[enclosureSize];
      containerDimension = tier.container;
      containerRadius = enclosureRadius ?? tier.radius;
    } else {
      // Automatic container size calculation: ~1.8x icon size
      containerDimension = Math.max(resolvedIconSize * 1.8, 32);
      containerRadius = enclosureRadius ?? containerDimension * 0.3;
    }
  }

  // Interactive microinteractions
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    if (disabled || !onPress) return;
    scale.value = withSpring(0.92, springConfig.stiff);
  }, [disabled, onPress, scale]);

  const handlePressOut = useCallback(() => {
    if (disabled || !onPress) return;
    scale.value = withSpring(1.0, springConfig.bouncy);
  }, [disabled, onPress, scale]);

  const handlePress = useCallback(() => {
    if (disabled || !onPress) return;
    onPress();
  }, [disabled, onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Fitts' Law ergonomic touch target (min 44x44pt)
  const isInteractive = Boolean(onPress);
  const minTouchTarget = 44;
  const touchExtra =
    isInteractive && containerDimension < minTouchTarget
      ? (minTouchTarget - containerDimension) / 2
      : 0;

  const enclosureStyle = isEnclosed ? enclosureVariants[enclosure] : null;

  const content = (
    <View
      style={[
        styles.iconCentering,
        {
          transform: [
            { translateX: offset.x },
            { translateY: offset.y },
          ],
        },
      ]}
    >
      <IconComponent
        size={resolvedIconSize}
        color={color}
        strokeWidth={resolvedStrokeWidth}
      />
    </View>
  );

  const badgeElement = badge ? (
    <View
      style={[
        styles.badge,
        typeof badge === 'number' ? styles.countBadge : styles.dotBadge,
      ]}
      pointerEvents="none"
    >
      {typeof badge === 'number' && (
        <Text style={styles.badgeText}>
          {badge > 99 ? '99+' : badge.toString()}
        </Text>
      )}
    </View>
  ) : null;

  if (isInteractive) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        hitSlop={touchExtra}
        style={[
          styles.container,
          isEnclosed && {
            width: containerDimension,
            height: containerDimension,
            borderRadius: containerRadius,
            ...enclosureStyle,
          },
          disabled && styles.disabled,
          animatedStyle,
          style,
        ]}
      >
        {content}
        {badgeElement}
      </AnimatedPressable>
    );
  }

  return (
    <View
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.container,
        isEnclosed && {
          width: containerDimension,
          height: containerDimension,
          borderRadius: containerRadius,
          ...enclosureStyle,
        },
        style,
      ]}
    >
      {content}
      {badgeElement}
    </View>
  );
};

const createStyles = ({ palette }: AppTheme) => StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconCentering: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: palette.danger,
    borderColor: palette.white,
    borderWidth: 1.5,
    zIndex: 10,
  },
  dotBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  countBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 9,
    color: palette.pureWhite,
    fontWeight: '700',
    lineHeight: Platform.OS === 'ios' ? 11 : 12,
  },
});
