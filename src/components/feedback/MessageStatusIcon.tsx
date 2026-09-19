import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Clock, Check, CheckCheck, AlertCircle } from 'lucide-react-native';
import { palette } from '../../design/colors';
import { NETWORK_CONFIG } from '../../config/networkConfig';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

interface MessageStatusIconProps {
  status: MessageStatus;
  size?: number | undefined;
  colorOverride?: string | undefined;
}

const ICON_SIZE = NETWORK_CONFIG.MESSAGE_STATUS_ICON_SIZE; // 12px

/**
 * MessageStatusIcon Component (Day 39)
 * 
 * Implements Recognition Over Recall & Minimalist Motion:
 * - Familiar universal chat conventions (Clock -> Single Check -> Double Check)
 * - Pure 100ms opacity cross-fade (strictly NO bounce/scale per Section 4.1/8)
 * - Accessible screen reader labels for assistive tech
 */
export const MessageStatusIcon: React.FC<MessageStatusIconProps> = React.memo(
  ({ status, size = ICON_SIZE, colorOverride }) => {
    const opacity = useSharedValue(1);

    useEffect(() => {
      // Gentle 100ms opacity cross-fade on status transition
      opacity.value = 0.4;
      opacity.value = withTiming(1, {
        duration: NETWORK_CONFIG.MESSAGE_STATUS_FADE_MS,
      });
    }, [status, opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
    }));

    const getAccessibilityLabel = (): string => {
      switch (status) {
        case 'sending':
          return 'Sending message';
        case 'sent':
          return 'Sent';
        case 'delivered':
          return 'Delivered';
        case 'read':
          return 'Read';
        case 'failed':
          return 'Failed to send';
        default:
          return 'Message status';
      }
    };

    const renderIcon = () => {
      const defaultMuted = colorOverride || palette.gray400;
      const readGreen = colorOverride || palette.green700;
      const dangerRed = colorOverride || palette.danger;

      switch (status) {
        case 'sending':
          return <Clock size={size} color={defaultMuted} strokeWidth={2.2} />;
        case 'sent':
          return <Check size={size} color={defaultMuted} strokeWidth={2.5} />;
        case 'delivered':
          return <CheckCheck size={size + 1} color={defaultMuted} strokeWidth={2.2} />;
        case 'read':
          return <CheckCheck size={size + 1} color={readGreen} strokeWidth={2.2} />;
        case 'failed':
          return <AlertCircle size={size} color={dangerRed} strokeWidth={2.2} />;
        default:
          return <Check size={size} color={defaultMuted} strokeWidth={2.2} />;
      }
    };

    return (
      <Animated.View
        style={[styles.container, animatedStyle]}
        accessible={true}
        accessibilityRole="image"
        accessibilityLabel={getAccessibilityLabel()}
      >
        {renderIcon()}
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 3,
  },
});
