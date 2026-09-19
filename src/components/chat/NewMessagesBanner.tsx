import React, { useEffect } from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ArrowDown } from 'lucide-react-native';

interface NewMessagesBannerProps {
  count: number;
  visible: boolean;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * NewMessagesBanner Component
 *
 * Implements Day 29 Position-Aware Microinteraction:
 * - Appears when new messages arrive while user is scrolled up in history
 * - Shows accurate count: "↓ 1 new message" or "↓ {count} new messages" (Typography: Jakarta SemiBold 13)
 * - Fitts's Law: Generous pill touch target (44px min height) with subtle shadow
 * - Motion: Snappy spring entrance (scale 0.9 -> 1.0, opacity 0 -> 1)
 * - Auto-dismisses when user scrolls to bottom or taps
 */
export const NewMessagesBanner = React.memo(function NewMessagesBanner({
  count,
  visible,
  onPress,
}: NewMessagesBannerProps) {
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible && count > 0) {
      opacity.value = withTiming(1, { duration: 180 });
      scale.value = withSpring(1, { damping: 16, stiffness: 240, mass: 0.7 });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.9, { duration: 150 });
    }
  }, [visible, count, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
    pointerEvents: opacity.value > 0.1 ? 'auto' : 'none',
  }));

  const handlePress = () => {
    onPress();
  };

  const label = count === 1 ? '1 new message' : `${count} new messages`;

  return (
    <AnimatedPressable
      style={[styles.container, animatedStyle]}
      onPress={handlePress}
      hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
      accessibilityRole="button"
      accessibilityLabel={`Scroll down, ${label}`}
    >
      <ArrowDown size={15} color="#FFFFFF" strokeWidth={2.5} style={styles.icon} />
      <Text style={styles.text}>{label}</Text>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    zIndex: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 6,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
});
