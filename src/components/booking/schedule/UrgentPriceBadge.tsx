import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { fontFamily } from '../../../design';
import { useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

export interface UrgentPriceBadgeProps {
  visible: boolean;
  badgeText?: string;
}

export const UrgentPriceBadge: React.FC<UrgentPriceBadgeProps> = ({
  visible,
  badgeText = '+30%',
}) => {
  const styles = useThemedStyles(createStyles);
  const scale = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    if (visible) {
      // Spring bouncy appearance (0 -> 1.1 -> 1.0)
      scale.value = withSpring(1.0, {
        damping: 10,
        stiffness: 240,
        mass: 0.7,
      });
    } else {
      // Spring stiff disappearance
      scale.value = withSpring(0, {
        damping: 18,
        stiffness: 300,
      });
    }
  }, [visible, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value > 0.05 ? 1 : 0,
  }));

  return (
    <Animated.View style={[styles.badgeContainer, animatedStyle]}>
      <Text style={styles.badgeText}>{badgeText}</Text>
    </Animated.View>
  );
};

const createStyles = ({ palette }: AppTheme) => StyleSheet.create({
  badgeContainer: {
    backgroundColor: palette.warningLight,
    borderWidth: 1,
    borderColor: palette.warning,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: fontFamily.inter.bold,
    fontSize: 12,
    lineHeight: 15,
    color: palette.warningDark,
  },
});
