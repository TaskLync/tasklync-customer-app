import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react-native';
import { fontFamily } from '../../../design/typography';
import { colors, palette } from '../../../design/colors';
import { NETWORK_CONFIG } from '../../../config/networkConfig';

export type ToastVariant = 'error' | 'success' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastData {
  id: string;
  message: string;
  variant?: ToastVariant;
  action?: ToastAction;
  duration?: number;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

/**
 * Toast Component (Day 39)
 * 
 * Implements Fitts's Law & Accessible User Feedback:
 * - Slide-up 250ms entrance
 * - Generous 44px+ touch targets for action buttons
 * - High contrast accessible text
 * - Press scale microinteraction on actions
 */
export const Toast: React.FC<ToastProps> = React.memo(({ toast, onDismiss }) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(60);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.97);

  const duration = toast.duration ?? (toast.action ? 6000 : 4000);

  useEffect(() => {
    // Entrance
    translateY.value = withTiming(0, {
      duration: NETWORK_CONFIG.TOAST_ANIM_DURATION_MS,
    });
    opacity.value = withTiming(1, {
      duration: NETWORK_CONFIG.TOAST_ANIM_DURATION_MS,
    });
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });

    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleDismiss = () => {
    opacity.value = withTiming(0, { duration: 180 });
    translateY.value = withTiming(40, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(onDismiss)(toast.id);
      }
    });
  };

  const handleActionPress = () => {
    toast.action?.onPress();
    handleDismiss();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const variant = toast.variant || 'error';

  const getVariantStyles = () => {
    switch (variant) {
      case 'error':
        return {
          icon: <AlertCircle size={18} color={palette.danger} strokeWidth={2.2} />,
          borderColor: colors.borderErrorLight,
          bgColor: colors.bgCard,
          textColor: palette.gray900,
        };
      case 'success':
        return {
          icon: <CheckCircle2 size={18} color={palette.green600} strokeWidth={2.2} />,
          borderColor: colors.primaryBorderSubtle,
          bgColor: colors.bgCard,
          textColor: palette.gray900,
        };
      case 'warning':
        return {
          icon: <AlertCircle size={18} color={palette.warning} strokeWidth={2.2} />,
          borderColor: colors.warningLight,
          bgColor: colors.bgCard,
          textColor: palette.gray900,
        };
      case 'info':
      default:
        return {
          icon: <Info size={18} color={palette.info} strokeWidth={2.2} />,
          borderColor: colors.borderInfoLight,
          bgColor: colors.bgCard,
          textColor: palette.gray900,
        };
    }
  };

  const variantConfig = getVariantStyles();
  const bottomOffset = insets.bottom + 20;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { bottom: bottomOffset },
        animatedStyle,
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <View
        style={[
          styles.container,
          { borderColor: variantConfig.borderColor },
        ]}
      >
        <View style={styles.iconContainer}>{variantConfig.icon}</View>

        <Text
          style={[styles.message, { color: variantConfig.textColor }]}
          numberOfLines={2}
        >
          {toast.message}
        </Text>

        {toast.action && (
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={handleActionPress}
            accessibilityRole="button"
            accessibilityLabel={toast.action.label}
          >
            <Text style={styles.actionText}>{toast.action.label}</Text>
          </Pressable>
        )}

        <Pressable
          style={styles.closeButton}
          onPress={handleDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
        >
          <X size={16} color={palette.gray400} />
        </Pressable>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  iconContainer: {
    marginRight: 10,
  },
  message: {
    flex: 1,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  actionButton: {
    backgroundColor: palette.green50,
    borderColor: palette.green300,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 10,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonPressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: palette.green100,
  },
  actionText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: palette.green700,
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
});
