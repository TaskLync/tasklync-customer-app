import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RefreshCw, Check } from 'lucide-react-native';
import { fontFamily } from '../../design/typography';
import { colors, palette } from '../../design/colors';
import { NETWORK_CONFIG } from '../../config/networkConfig';
import { SyncState } from '../../types/network.types';

interface SyncIndicatorProps {
  syncState: SyncState;
  isOffline: boolean;
}

const PILL_HEIGHT = NETWORK_CONFIG.SYNC_PILL_HEIGHT; // 28px

/**
 * SyncIndicator Component (Day 39)
 * 
 * Implements Goal-Gradient Effect & Peak-End Rule:
 * - Dynamic count-based copy ("Syncing 2 updates...") gives concrete feedback
 * - Visual "All changes synced" state provides definitive closure
 * - Smooth 150ms fade-in -> 1.5s hold -> 150ms fade-out
 * - Zero haptics (passive system feedback)
 */
export const SyncIndicator: React.FC<SyncIndicatorProps> = React.memo(
  ({ syncState, isOffline }) => {
    const insets = useSafeAreaInsets();
    const [visible, setVisible] = useState<boolean>(false);
    const [isCompleted, setIsCompleted] = useState<boolean>(false);

    const opacity = useSharedValue(0);
    const rotation = useSharedValue(0);
    const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { isSyncing, pendingCount, totalToSync } = syncState;

    useEffect(() => {
      if (isOffline) {
        // Hide sync indicator if offline
        setVisible(false);
        opacity.value = 0;
        cancelAnimation(rotation);
        return;
      }

      if (isSyncing && pendingCount > 0) {
        if (holdTimeoutRef.current) {
          clearTimeout(holdTimeoutRef.current);
          holdTimeoutRef.current = null;
        }

        setIsCompleted(false);
        setVisible(true);
        opacity.value = withTiming(1, {
          duration: NETWORK_CONFIG.SYNC_INDICATOR_FADE_MS,
        });

        // Continuous rotation for spinner
        rotation.value = withRepeat(
          withTiming(360, { duration: 1000, easing: Easing.linear }),
          -1,
          false
        );
      } else if (!isSyncing && visible && !isCompleted && totalToSync > 0) {
        // Sync just finished successfully: Show "All changes synced" for 1.5s hold
        setIsCompleted(true);
        cancelAnimation(rotation);
        rotation.value = 0;

        holdTimeoutRef.current = setTimeout(() => {
          opacity.value = withTiming(
            0,
            { duration: NETWORK_CONFIG.SYNC_INDICATOR_FADE_MS },
            (finished) => {
              if (finished) {
                setVisible(false);
                setIsCompleted(false);
              }
            }
          );
        }, NETWORK_CONFIG.SYNC_INDICATOR_HOLD_MS);
      }

      return () => {
        if (holdTimeoutRef.current) {
          clearTimeout(holdTimeoutRef.current);
        }
      };
    }, [isSyncing, pendingCount, isOffline, totalToSync, visible, isCompleted, opacity, rotation]);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
    }));

    const iconRotationStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${rotation.value}deg` }],
    }));

    if (!visible) return null;

    const countText =
      pendingCount > 1
        ? `Syncing ${pendingCount} updates…`
        : pendingCount === 1
        ? 'Syncing 1 update…'
        : 'All changes synced';

    const topOffset = insets.top + 8;

    return (
      <Animated.View
        pointerEvents="none"
        accessibilityRole="text"
        accessibilityLiveRegion="polite"
        accessibilityLabel={isCompleted ? 'All changes synced' : countText}
        style={[
          styles.container,
          { top: topOffset },
          animatedStyle,
        ]}
      >
        <View
          style={[
            styles.pill,
            isCompleted ? styles.pillCompleted : styles.pillSyncing,
          ]}
        >
          {isCompleted ? (
            <Check size={12} color={palette.green700} strokeWidth={2.5} style={styles.icon} />
          ) : (
            <Animated.View style={[styles.icon, iconRotationStyle]}>
              <RefreshCw size={12} color={palette.gray600} strokeWidth={2.2} />
            </Animated.View>
          )}
          <Text
            style={[
              styles.text,
              isCompleted ? styles.textCompleted : styles.textSyncing,
            ]}
          >
            {countText}
          </Text>
        </View>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99997,
  },
  pill: {
    height: PILL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  pillSyncing: {
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
  },
  pillCompleted: {
    backgroundColor: colors.primaryTint, // palette.green50
    borderColor: colors.primaryBorder, // palette.green200
  },
  icon: {
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 12,
    letterSpacing: -0.1,
  },
  textSyncing: {
    color: palette.gray600,
  },
  textCompleted: {
    color: palette.green700,
  },
});
