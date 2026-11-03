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
import { colors, palette } from '../../design/colors';
import { fontFamily } from '../../design/typography';

interface ServiceCategoryCardProps {
  category: Category;
  index?: number;
}

interface CategoryStyleConfig {
  bg: string;
  iconSource: any;
  displayName?: string;
}

const CATEGORY_STYLES: Record<string, CategoryStyleConfig> = {
  electrician: {
    bg: palette.amber100,
    iconSource: require('../../../assets/icons/categories/electrician.svg'),
    displayName: 'Electrician',
  },
  plumber: {
    bg: palette.blue100,
    iconSource: require('../../../assets/icons/categories/plumber.svg'),
    displayName: 'Plumber',
  },
  carpenter: {
    bg: palette.orange100,
    iconSource: require('../../../assets/icons/categories/carpenter.svg'),
    displayName: 'Carpenter',
  },
  painter: {
    bg: palette.purple100,
    iconSource: require('../../../assets/icons/categories/painter.svg'),
    displayName: 'Painter',
  },
  cleaning: {
    bg: colors.primaryLight,
    iconSource: require('../../../assets/icons/categories/cleaning.svg'),
    displayName: 'Cleaner',
  },
  cleaner: {
    bg: colors.primaryLight,
    iconSource: require('../../../assets/icons/categories/cleaning.svg'),
    displayName: 'Cleaner',
  },
  ac_repair: {
    bg: palette.sky100,
    iconSource: require('../../../assets/icons/categories/air-conditioner.svg'),
    displayName: 'AC Repair',
  },
};

const DEFAULT_STYLE: CategoryStyleConfig = {
  bg: colors.canvasGray,
  iconSource: require('../../../assets/icons/categories/cleaning.svg'),
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ServiceCategoryCard: React.FC<ServiceCategoryCardProps> = ({ category }) => {
  const router = useRouter();
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

  const styleConfig = CATEGORY_STYLES[category.id] || DEFAULT_STYLE;
  const labelText = styleConfig.displayName || category.name;

  return (
    <AnimatedPressable
      style={[styles.container, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${labelText} services`}
      accessibilityHint={`Tap to browse ${labelText} services and workers`}
    >
      <View style={[styles.iconContainer, { backgroundColor: styleConfig.bg }]}>
        <Image
          source={styleConfig.iconSource}
          style={styles.icon}
          contentFit="contain"
          priority="high"
        />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {labelText}
      </Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 76,
    backgroundColor: 'transparent',
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 32,
    height: 32,
  },
  label: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14.5,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 10,
  },
});
