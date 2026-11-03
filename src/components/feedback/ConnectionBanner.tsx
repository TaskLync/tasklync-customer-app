import { colors, palette } from '../../design';
import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSocketStore } from '../../store/socket.store';
import { SOCKET_CONFIG } from '../../config/socket.config';

type BannerStatus = 'reconnecting' | 'back_online';

export const ConnectionBanner: React.FC = () => {
  const insets = useSafeAreaInsets();
  const isConnected = useSocketStore((state) => state.isConnected);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<BannerStatus>('reconnecting');

  const translateY = useSharedValue(-60);
  const opacity = useSharedValue(0);

  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasShownRef = useRef(false);

  useEffect(() => {
    if (!isConnected) {
      // Clear any pending dismiss timers
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }

      // Zero Anxiety Design: Only show banner if disconnected for > BANNER_SHOW_THRESHOLD_MS (3000ms)
      showTimerRef.current = setTimeout(() => {
        setStatus('reconnecting');
        setVisible(true);
        wasShownRef.current = true;
        translateY.value = withSpring(0, {
          mass: 1,
          damping: 20,
          stiffness: 120, // spring-gentle
          overshootClamping: true,
        });
        opacity.value = withTiming(1, { duration: 150 });
      }, SOCKET_CONFIG.BANNER_SHOW_THRESHOLD_MS);
    } else {
      // Disconnect was under 3s: Cancel timer silently
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }

      // If the banner was actually visible to the user, show "Back online" briefly before dismissing
      if (wasShownRef.current && visible) {
        setStatus('back_online');

        dismissTimerRef.current = setTimeout(() => {
          translateY.value = withTiming(-60, { duration: 200 });
          opacity.value = withTiming(0, { duration: 200 }, (finished) => {
            if (finished) {
              runOnJS(setVisible)(false);
              wasShownRef.current = false;
            }
          });
        }, 1500);
      } else {
        setVisible(false);
        wasShownRef.current = false;
      }
    }

    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [isConnected, visible, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) {
    return null;
  }

  const isBackOnline = status === 'back_online';

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top, 8) + 4 },
        animatedStyle,
      ]}
    >
      <View
        style={[
          styles.pill,
          isBackOnline ? styles.pillBackOnline : styles.pillReconnecting,
        ]}
      >
        <View
          style={[
            styles.dot,
            isBackOnline ? styles.dotBackOnline : styles.dotReconnecting,
          ]}
        />
        <Text
          style={[
            styles.text,
            isBackOnline ? styles.textBackOnline : styles.textReconnecting,
          ]}
        >
          {isBackOnline ? 'Back online' : 'Reconnecting…'}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pillReconnecting: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warningBorder,
    borderWidth: 1,
  },
  pillBackOnline: {
    backgroundColor: colors.primaryBorderSubtle,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  dotReconnecting: {
    backgroundColor: colors.warningMedium,
  },
  dotBackOnline: {
    backgroundColor: colors.primaryDark,
  },
  text: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    letterSpacing: -0.1,
  },
  textReconnecting: {
    color: colors.textWarning,
  },
  textBackOnline: {
    color: colors.textGreen,
  },
});
