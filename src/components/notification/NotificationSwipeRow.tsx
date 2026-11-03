import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Check, Trash2, MailOpen } from 'lucide-react-native';
import { NotificationItem } from '../../types/notification.types';
import { colors, fontFamily, radius } from '../../design';

const ACTION_WIDTH = 72;
const TOTAL_ACTIONS_WIDTH = ACTION_WIDTH * 2; // 144px
const SNAP_THRESHOLD = -TOTAL_ACTIONS_WIDTH / 2; // -72px
const FULL_SWIPE_THRESHOLD = -240;

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 250,
  mass: 0.6,
};

export interface NotificationSwipeRowProps {
  children: React.ReactNode;
  item: NotificationItem;
  onMarkRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  enabled?: boolean;
}

/**
 * NotificationSwipeRow Component
 *
 * Implements Day 32 Swipe Gesture Architecture:
 * - Simultaneous gesture safety: activeOffsetX([-10, 10]) and failOffsetY([-10, 10])
 * - 1:1 physical finger tracking with rubber-band resistance beyond boundaries
 * - 2 fixed Hick's-Law action zones (Mark Read + Delete)
 * - Animated layout collapse on deletion before state mutation
 * - Native haptic feedback
 */
export const NotificationSwipeRow: React.FC<NotificationSwipeRowProps> = ({
  children,
  item,
  onMarkRead,
  onDelete,
  enabled = true,
}) => {
  const translateX = useSharedValue(0);
  const contextX = useSharedValue(0);
  const rowHeight = useSharedValue<number | null>(null);
  const isDeleting = useSharedValue(false);
  const rowOpacity = useSharedValue(1);

  const closeRow = useCallback(() => {
    'worklet';
    translateX.value = withSpring(0, SPRING_CONFIG);
  }, [translateX]);

  const triggerDelete = useCallback(() => {
    if (!onDelete) return;
    onDelete(item.id);
  }, [item.id, onDelete]);

  const handleDeletePress = useCallback(() => {

    isDeleting.value = true;
    rowOpacity.value = withTiming(0, { duration: 150 });
    rowHeight.value = withTiming(0, { duration: 220 }, (finished) => {
      if (finished) {
        runOnJS(triggerDelete)();
      }
    });
  }, [isDeleting, rowOpacity, rowHeight, triggerDelete]);

  const handleMarkReadPress = useCallback(() => {

    closeRow();
    if (onMarkRead) {
      onMarkRead(item.id);
    }
  }, [closeRow, item.id, onMarkRead]);

  // Pan Gesture Setup
  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onStart(() => {
      contextX.value = translateX.value;
    })
    .onUpdate((event) => {
      const rawTranslation = contextX.value + event.translationX;

      if (rawTranslation > 0) {
        // Swiping right: heavy rubber-banding
        translateX.value = rawTranslation * 0.15;
      } else if (rawTranslation < -TOTAL_ACTIONS_WIDTH) {
        // Swiping past total actions: light rubber-banding
        const overflow = rawTranslation - (-TOTAL_ACTIONS_WIDTH);
        translateX.value = -TOTAL_ACTIONS_WIDTH + overflow * 0.4;
      } else {
        // 1:1 physical translation
        translateX.value = rawTranslation;
      }
    })
    .onEnd((event) => {
      if (translateX.value < FULL_SWIPE_THRESHOLD || event.velocityX < -1000) {
        // Full swipe to delete
        runOnJS(handleDeletePress)();
        return;
      }

      if (translateX.value < SNAP_THRESHOLD || event.velocityX < -400) {
        // Snap open action tray
        translateX.value = withSpring(-TOTAL_ACTIONS_WIDTH, SPRING_CONFIG);
      } else {
        // Snap closed
        translateX.value = withSpring(0, SPRING_CONFIG);
      }
    });

  // Animated styles
  const rowAnimatedStyle = useAnimatedStyle(() => {
    const style: any = {
      transform: [{ translateX: translateX.value }],
      opacity: rowOpacity.value,
    };

    if (rowHeight.value !== null) {
      style.height = rowHeight.value;
      style.overflow = 'hidden';
      style.marginBottom = 0;
      style.paddingVertical = 0;
    }

    return style;
  });

  const actionsAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-TOTAL_ACTIONS_WIDTH, -20, 0],
      [1, 0.4, 0],
      Extrapolation.CLAMP
    );

    return {
      opacity,
    };
  });

  const readActionAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      translateX.value,
      [-TOTAL_ACTIONS_WIDTH, -ACTION_WIDTH, 0],
      [1, 0.8, 0.5],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ scale }],
    };
  });

  const deleteActionAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      translateX.value,
      [-TOTAL_ACTIONS_WIDTH, -TOTAL_ACTIONS_WIDTH + 20, 0],
      [1, 0.8, 0.5],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ scale }],
    };
  });

  return (
    <View style={styles.wrapper}>
      {/* Background Action Tray (revealed on swipe) */}
      <Animated.View style={[styles.actionTray, actionsAnimatedStyle]}>
        {/* Action 1: Mark Read */}
        <Pressable
          style={[styles.actionButton, styles.readButton]}
          onPress={handleMarkReadPress}
          accessibilityRole="button"
          accessibilityLabel={item.is_read ? 'Mark as unread' : 'Mark as read'}
        >
          <Animated.View style={[styles.actionIconContainer, readActionAnimatedStyle]}>
            {item.is_read ? (
              <MailOpen size={20} color={colors.white} strokeWidth={2.2} />
            ) : (
              <Check size={20} color={colors.white} strokeWidth={2.5} />
            )}
            <Text style={styles.actionText}>
              {item.is_read ? 'Unread' : 'Read'}
            </Text>
          </Animated.View>
        </Pressable>

        {/* Action 2: Delete */}
        <Pressable
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDeletePress}
          accessibilityRole="button"
          accessibilityLabel="Delete notification"
        >
          <Animated.View style={[styles.actionIconContainer, deleteActionAnimatedStyle]}>
            <Trash2 size={20} color={colors.white} strokeWidth={2.2} />
            <Text style={styles.actionText}>Delete</Text>
          </Animated.View>
        </Pressable>
      </Animated.View>

      {/* Foreground Content Card with Pan Gesture */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.foregroundCard, rowAnimatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radius.lg,
    marginBottom: 8,
  },
  actionTray: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  actionButton: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readButton: {
    backgroundColor: colors.info,
  },
  deleteButton: {
    backgroundColor: colors.danger,
  },
  actionIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 11,
    color: colors.white,
  },
  foregroundCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
  },
});
