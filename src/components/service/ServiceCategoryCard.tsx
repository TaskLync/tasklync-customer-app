import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Text } from '../ui/Text/Text';
import { Category } from '../../types/category.types';
import { fontFamily } from '../../design/typography';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface ServiceCategoryCardProps {
  category: Category;
  index?: number;
  /** Allocated slot width; tile and label are centred inside it. Defaults to the original 76. */
  width?: number | undefined;
  /** Square tile size. Defaults to 68. */
  tileSize?: number | undefined;
  iconSize?: number | undefined;
  tileRadius?: number | undefined;
}

/** Large system font sizes may grow the label this much before it shrinks to fit its slot. */
const LABEL_MAX_FONT_SCALE = 1.3;

interface CategoryStyleConfig {
  bg: string;
  iconSource: any;
  /** Single-colour (black) artwork: tinted white in dark mode. Multi-colour icons are never tinted. */
  monochrome?: boolean;
  displayName?: string;
}

const createCategoryStyles = ({ colors, palette, isDark }: AppTheme) => ({ map: {
  electrician: {
    bg: palette.amber100,
    iconSource: require('../../../assets/icons/categories/electrician.svg'),
    displayName: 'Electrician',
  },
  plumber: {
    bg: palette.blue100,
    iconSource: require('../../../assets/icons/categories/plumber.svg'),
    monochrome: true,
    displayName: 'Plumber',
  },
  carpenter: {
    bg: palette.orange100,
    iconSource: require('../../../assets/icons/categories/carpenter.svg'),
    monochrome: true,
    displayName: 'Carpenter',
  },
  painter: {
    bg: palette.purple100,
    iconSource: require('../../../assets/icons/categories/painter.svg'),
    monochrome: true,
    displayName: 'Painter',
  },
  cleaning: {
    // Dark: deep green tint, same tier as the amber/blue/sky 100 backgrounds. Light keeps the original.
    bg: isDark ? palette.green100 : colors.primaryLight,
    iconSource: require('../../../assets/icons/categories/cleaning.svg'),
    monochrome: true,
    displayName: 'Cleaner',
  },
  cleaner: {
    // Dark: deep green tint, same tier as the amber/blue/sky 100 backgrounds. Light keeps the original.
    bg: isDark ? palette.green100 : colors.primaryLight,
    iconSource: require('../../../assets/icons/categories/cleaning.svg'),
    monochrome: true,
    displayName: 'Cleaner',
  },
  ac_repair: {
    bg: palette.sky100,
    iconSource: require('../../../assets/icons/categories/air-conditioner.svg'),
    displayName: 'AC Repair',
  },
} as Record<string, CategoryStyleConfig>,
  fallback: {
    bg: colors.canvasGray,
    iconSource: require('../../../assets/icons/categories/cleaning.svg'),
    monochrome: true,
  } as CategoryStyleConfig,
});

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ServiceCategoryCard: React.FC<ServiceCategoryCardProps> = ({
  category,
  width = 76,
  tileSize = 68,
  iconSize = 32,
  tileRadius = 20,
}) => {
  const { isDark } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const categoryStyles = useThemedStyles(createCategoryStyles);
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { stiffness: 400, damping: 20 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { stiffness: 300, damping: 15 });
  };

  const handlePress = () => {
    router.push(('/category/' + category.id) as any);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const styleConfig = categoryStyles.map[category.id] || categoryStyles.fallback;
  const labelText = styleConfig.displayName || category.name;

  return (
    <AnimatedPressable
      style={[styles.container, { width }, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${labelText} services`}
      accessibilityHint={`Tap to browse ${labelText} services and workers`}
    >
      <View
        style={[
          styles.iconContainer,
          { width: tileSize, height: tileSize, borderRadius: tileRadius, backgroundColor: styleConfig.bg },
        ]}
      >
        <Image
          source={styleConfig.iconSource}
          style={{ width: iconSize, height: iconSize }}
          contentFit="contain"
          {...(isDark && styleConfig.monochrome ? { tintColor: '#FFFFFF' } : {})}
          priority="high"
        />
      </View>
      <Text
        style={styles.label}
        align="center"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        maxFontSizeMultiplier={LABEL_MAX_FONT_SCALE}
      >
        {labelText}
      </Text>
    </AnimatedPressable>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 2,
    backgroundColor: 'transparent',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    alignSelf: 'stretch',
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14.5,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 10,
  },
});
