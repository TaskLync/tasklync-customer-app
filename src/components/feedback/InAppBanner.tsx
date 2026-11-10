import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  MessageSquare,
  CalendarCheck,
  CreditCard,
  Star,
  Sparkles,
  Info,
} from 'lucide-react-native';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface InAppBannerData {
  id: string;
  title: string;
  body: string;
  category?: string | undefined;
  deepLink?: string | undefined;
  data?: Record<string, any> | undefined;
}

interface InAppBannerProps {
  data: InAppBannerData;
  onPress: (data: InAppBannerData) => void;
  onDismiss: () => void;
  duration?: number;
}

/**
 * InAppBanner Component
 *
 * Implements Day 31 In-App Notification UI Standards:
 * - Reanimated 3 Spring Entrance (translateY -100 -> 0, scale 0.95 -> 1.0)
 * - Gesture-enabled Pan Gesture (swipe up to dismiss immediately)
 * - High visual hierarchy with category-specific badge icons & brand accents
 * - Fitts's Law generous touch area (full width card)
 * - Safe area aware (sits cleanly beneath status bar)
 */
export const InAppBanner = React.memo(function InAppBanner({
  data,
  onPress,
  onDismiss,
  duration = 4000,
}: InAppBannerProps) {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Entrance Animation
    translateY.value = withSpring(0, { damping: 18, stiffness: 220, mass: 0.8 });
    opacity.value = withTiming(1, { duration: 180 });


    // Auto-dismiss timer
    const timer = setTimeout(() => {
      handleExit();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleExit = () => {
    opacity.value = withTiming(0, { duration: 180 });
    translateY.value = withTiming(-120, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(onDismiss)();
      }
    });
  };

  const handlePress = () => {
    handleExit();
    onPress(data);
  };

  // Pan gesture to allow swiping up to dismiss
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY < 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY < -30 || event.velocityY < -400) {
        runOnJS(handleExit)();
      } else {
        translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const getCategoryIcon = () => {
    const cat = (data.category || '').toLowerCase();
    if (cat.includes('chat') || cat.includes('message')) {
      return <MessageSquare size={18} color={colors.textInfo} strokeWidth={2.2} />;
    }
    if (cat.includes('booking')) {
      return <CalendarCheck size={18} color={colors.primaryDark} strokeWidth={2.2} />;
    }
    if (cat.includes('payment')) {
      return <CreditCard size={18} color={colors.warningMedium} strokeWidth={2.2} />;
    }
    if (cat.includes('review')) {
      return <Star size={18} color={colors.starFilled} strokeWidth={2.2} />;
    }
    if (cat.includes('marketing') || cat.includes('promo')) {
      return <Sparkles size={18} color={palette.purple600} strokeWidth={2.2} />;
    }
    return <Bell size={18} color={colors.primaryDark} strokeWidth={2.2} />;
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.container,
          { top: Math.max(insets.top, Platform.OS === 'android' ? 12 : 16) },
          animatedStyle,
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.card,
            pressed && styles.cardPressed,
          ]}
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={`Notification: ${data.title}, ${data.body}`}
        >
          {/* Icon Badge */}
          <View style={styles.iconContainer}>{getCategoryIcon()}</View>

          {/* Text Details */}
          <View style={styles.textContainer}>
            <View style={styles.headerRow}>
              <Text style={styles.title} numberOfLines={1}>
                {data.title}
              </Text>
              <Text style={styles.timeBadge}>Just now</Text>
            </View>
            <Text style={styles.body} numberOfLines={2}>
              {data.body}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
});

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 10,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: colors.bgSubtle,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  title: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  timeBadge: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: colors.textMuted,
  },
  body: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
