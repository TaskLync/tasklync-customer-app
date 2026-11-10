import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  withRepeat,
} from 'react-native-reanimated';
import { IconButton } from '../ui/Button/IconButton';
import { Text } from '../ui/Text/Text';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import { fontFamily } from '../../design/typography';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface NotificationBellProps {
  unreadCount?: number;
  onPress?: () => void;
  variant?: 'badge' | 'dot';
  size?: number;
  iconSize?: number;
  showDot?: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  unreadCount: propUnreadCount,
  onPress,
  variant = 'badge',
  size = 40,
  iconSize = 22,
  showDot,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { unreadCount: hookUnreadCount } = useUnreadCount();
  const effectiveUnreadCount = propUnreadCount !== undefined ? propUnreadCount : hookUnreadCount;

  const prevCountRef = useRef<number>(effectiveUnreadCount);

  const rotation = useSharedValue(0);
  const badgeScale = useSharedValue(effectiveUnreadCount > 0 ? 1 : 0);

  useEffect(() => {
    const prevCount = prevCountRef.current;
    prevCountRef.current = effectiveUnreadCount;

    if (effectiveUnreadCount > 0) {
      if (prevCount !== effectiveUnreadCount) {
        // Count increased or changed: Trigger expressive spring bounce + chime microinteraction
        badgeScale.value = withSequence(
          withTiming(1.25, { duration: 150 }),
          withSpring(1.0, { damping: 12, stiffness: 150 })
        );

        if (effectiveUnreadCount > prevCount) {
          rotation.value = withSequence(
            withTiming(14, { duration: 90, easing: Easing.inOut(Easing.ease) }),
            withRepeat(
              withTiming(-14, { duration: 90, easing: Easing.inOut(Easing.ease) }),
              3,
              true
            ),
            withTiming(0, { duration: 90, easing: Easing.inOut(Easing.ease) })
          );
        }
      } else {
        badgeScale.value = 1;
      }
    } else {
      badgeScale.value = withTiming(0, { duration: 150 });
    }
  }, [effectiveUnreadCount, badgeScale, rotation]);

  const bellStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/notifications' as any);
    }
  };

  const isDotVariant = variant === 'dot';
  const hasIndicator = showDot !== undefined ? showDot : effectiveUnreadCount > 0;
  const displayCount = effectiveUnreadCount > 99 ? '99+' : `${effectiveUnreadCount}`;

  return (
    <View style={styles.container}>
      <Animated.View style={bellStyle}>
        <IconButton
          icon={Bell}
          iconSize={iconSize}
          color={colors.textPrimary}
          bg="transparent"
          bgPressed="rgba(0,0,0,0.05)"
          onPress={handlePress}
          size={size}
          accessibilityLabel={`Notifications, ${effectiveUnreadCount} unread`}
        />
      </Animated.View>

      {isDotVariant ? (
        hasIndicator && (
          <Animated.View style={[styles.dotBadge, badgeStyle]} pointerEvents="none" />
        )
      ) : (
        effectiveUnreadCount > 0 && (
          <Animated.View style={[styles.badge, badgeStyle]} pointerEvents="none">
            <Text style={styles.badgeText}>{displayCount}</Text>
          </Animated.View>
        )
      )}
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: palette.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    borderWidth: 2,
    borderColor: colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  dotBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: palette.danger,
    borderWidth: 1.5,
    borderColor: colors.bgApp,
  },
  badgeText: {
    fontFamily: fontFamily.inter.bold,
    fontSize: 9,
    color: colors.bgCard,
    lineHeight: 11,
  },
});
