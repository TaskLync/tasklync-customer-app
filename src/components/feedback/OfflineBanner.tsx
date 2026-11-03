import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import { fontFamily } from '../../design/typography';
import { colors, palette } from '../../design/colors';
import { NETWORK_CONFIG } from '../../config/networkConfig';

interface OfflineBannerProps {
  isOffline: boolean;
}

const BANNER_HEIGHT = NETWORK_CONFIG.BANNER_HEIGHT; // 36px

/**
 * OfflineBanner Component (Day 39)
 * 
 * Implements Zero Anxiety Design & Jakob's Law (matches industry standard top strip):
 * - Persists for the entire duration of disconnection without auto-dismissing
 * - Non-blocking status strip (pointerEvents="none")
 * - 200ms Timing animation (strictly NO spring bounce per Section 8)
 * - Accessibility live region announcement
 */
export const OfflineBanner: React.FC<OfflineBannerProps> = React.memo(({ isOffline }) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-BANNER_HEIGHT);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isOffline) {
      // Calm, non-bouncy entrance
      translateY.value = withTiming(0, {
        duration: NETWORK_CONFIG.BANNER_ANIM_DURATION_MS,
      });
      opacity.value = withTiming(1, {
        duration: NETWORK_CONFIG.BANNER_ANIM_DURATION_MS,
      });
    } else {
      // Symmetrical, calm exit
      translateY.value = withTiming(-BANNER_HEIGHT, {
        duration: NETWORK_CONFIG.BANNER_ANIM_DURATION_MS,
      });
      opacity.value = withTiming(0, {
        duration: NETWORK_CONFIG.BANNER_ANIM_DURATION_MS,
      });
    }
  }, [isOffline, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const topOffset = insets.top;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel="You are offline. Some features may be limited."
      style={[
        styles.container,
        { top: topOffset },
        animatedStyle,
      ]}
    >
      <View style={styles.banner}>
        <WifiOff size={14} color={palette.warningDark} strokeWidth={2.2} style={styles.icon} />
        <Text style={styles.text} numberOfLines={1}>
          You're offline — some features may be limited
        </Text>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 99998,
    alignItems: 'center',
  },
  banner: {
    width: '100%',
    height: BANNER_HEIGHT,
    backgroundColor: colors.warningLight, // palette.warningLight
    borderBottomWidth: 1,
    borderBottomColor: colors.warningBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 13,
    color: colors.textWarning, // palette.warningDark
    letterSpacing: -0.1,
  },
});
