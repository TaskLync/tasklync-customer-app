import { colors, palette } from '../../design';
import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { WorkerPortfolioImage } from '../../types/review.types';
import { radius } from '@design/radius';

interface PortfolioCellProps {
  image: WorkerPortfolioImage;
  size: number;
  onPress: (index: number) => void;
  index: number;
  priority?: 'high' | 'normal' | 'low';
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const springConfig = {
  damping: 24,
  stiffness: 300,
  mass: 0.8,
};

export const PortfolioCell = ({
  image,
  size,
  onPress,
  index,
  priority = 'normal',
}: PortfolioCellProps) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const imageAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.98, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const handlePress = () => {
    onPress(index);
  };

  const handleLoad = () => {
    opacity.value = withTiming(1, { duration: 200 });
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[
        styles.container,
        { width: size, height: size },
        animatedStyle,
      ]}
      accessibilityRole="button"
      accessibilityLabel={image.caption || `Portfolio photo ${index + 1}`}
      accessibilityHint="Tap to view full screen"
    >
      <View style={[styles.placeholder, { width: size, height: size }]} />
      <Animated.View style={[StyleSheet.absoluteFill, imageAnimatedStyle]}>
        <Image
          source={{ uri: image.imageUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          priority={priority}
          onLoad={handleLoad}
        />
      </Animated.View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  placeholder: {
    backgroundColor: '#E2E8F0',
  },
});
