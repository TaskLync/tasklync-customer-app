import { StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Text } from '../ui/Text/Text';
import { colors } from '../../design/colors';
import { radius } from '../../design/radius';
import { fontFamily } from '../../design/typography';

export const SearchPromptBar = () => {
  const router = useRouter();
  const scale = useSharedValue(1);
  const borderColor = useSharedValue<string>(colors.border);

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { stiffness: 400, damping: 20 });
    borderColor.value = colors.primary;
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    borderColor.value = colors.border;
  };

  const handlePress = () => {
    router.push('/explore' as any);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: borderColor.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Pressable
        style={styles.pressable}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        accessibilityRole="search"
        accessibilityLabel="Search for services or workers"
        accessibilityHint="Tap to open search"
      >
        <Search size={18} strokeWidth={1.6} color={colors.textMuted} style={styles.icon} />
        <Text style={styles.placeholder}>What do you need help with?</Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 50,
    backgroundColor: colors.bgSection,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
  },
  icon: {
    marginRight: 10,
  },
  placeholder: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 15,
    color: colors.textMuted,
  },
});
