import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  ViewStyle,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { Flame, Sparkles, Tag } from 'lucide-react-native';
import { typography } from '../../design/typography';
import { springConfig } from '../../design/animations';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export type ServiceBadgeType = 'popular' | 'new' | 'deal' | 'limited';

interface ServiceBadgeProps {
  type: ServiceBadgeType;
  size?: 'xs' | 'sm';
  style?: ViewStyle;
}

export const ServiceBadge: React.FC<ServiceBadgeProps> = ({
  type,
  size = 'xs',
  style,
}) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      200,
      withSpring(1, springConfig.bouncy)
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const getBadgeConfig = () => {
    switch (type) {
      case 'popular':
        return {
          backgroundColor: palette.warning,
          label: 'Popular',
          Icon: Flame,
        };
      case 'new':
        return {
          backgroundColor: palette.info,
          label: 'New',
          Icon: Sparkles,
        };
      case 'deal':
        return {
          backgroundColor: palette.danger,
          label: 'Deal',
          Icon: Tag,
        };
      case 'limited':
        return {
          backgroundColor: colors.inverseSurface,
          label: 'Limited',
          Icon: null,
        };
      default:
        return {
          backgroundColor: colors.textMuted,
          label: '',
          Icon: null,
        };
    }
  };

  const config = getBadgeConfig();
  // The inverse chip is light in dark mode, so its label flips with it.
  const labelColor = config.backgroundColor === colors.inverseSurface ? colors.textInverse : colors.textOnGreen;
  const Icon = config.Icon;

  const isXs = size === 'xs';
  const badgeHeight = isXs ? 18 : 22;
  const paddingHorizontal = isXs ? 6 : 10;
  const fontSize = isXs ? 10 : 11;
  const iconSize = isXs ? 10 : 12;
  const gap = isXs ? 3 : 4;

  return (
    <Animated.View
      style={[
        styles.badgeContainer,
        {
          backgroundColor: config.backgroundColor,
          height: badgeHeight,
          paddingHorizontal,
          gap,
        },
        animatedStyle,
        style,
      ]}
    >
      {Icon && (
        <Icon
          size={iconSize}
          strokeWidth={1.5}
          color={labelColor}
        />
      )}
      <Text style={[styles.labelText, { fontSize, color: labelColor }]}>
        {config.label}
      </Text>
    </Animated.View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  labelText: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    color: colors.textOnGreen,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
