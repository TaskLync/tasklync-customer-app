import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  LayoutChangeEvent,
  ViewStyle,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { ChevronDown } from 'lucide-react-native';
import { radius } from '../../../design/radius';
import { shadows } from '../../../design/shadows';
import { springConfig } from '../../../design/animations';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';
import { withAlpha } from '../../../design/colorUtils';

interface AccordionItemProps {
  title: React.ReactNode;
  children: React.ReactNode;
  initialOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
  headerStyle?: ViewStyle;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({
  title,
  children,
  initialOpen = false,
  onToggle,
  disabled = false,
  style,
  headerStyle,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [bodyHeight, setBodyHeight] = useState(0);

  const heightVal = useSharedValue(initialOpen ? 1 : 0);
  const rotationVal = useSharedValue(initialOpen ? 180 : 0);
  const opacityVal = useSharedValue(initialOpen ? 1 : 0);

  // Sync state on toggle
  useEffect(() => {
    if (isOpen) {
      rotationVal.value = withSpring(180, springConfig.gentle);
      opacityVal.value = withTiming(1, { duration: 150 });
      if (bodyHeight > 0) {
        heightVal.value = withSpring(bodyHeight, springConfig.gentle);
      }
    } else {
      rotationVal.value = withSpring(0, springConfig.gentle);
      opacityVal.value = withTiming(0, { duration: 100 });
      heightVal.value = withSpring(0, springConfig.stiff);
    }
  }, [isOpen, bodyHeight]);

  const handleToggle = () => {
    if (disabled) return;
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (onToggle) onToggle(nextState);
  };

  const handleBodyLayout = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    if (height > 0 && height !== bodyHeight) {
      setBodyHeight(height);
      if (isOpen) {
        heightVal.value = height;
      }
    }
  };

  // Animated styles
  const bodyAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: heightVal.value,
      opacity: opacityVal.value,
    };
  });

  const chevronAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotationVal.value}deg` }],
    };
  });

  const containerAnimatedStyle = useAnimatedStyle(() => {
    // Animate border color transparent -> colors.border based on opening progress
    // Since heightVal goes from 0 to bodyHeight, we interpolate relative to bodyHeight
    const progress = bodyHeight > 0 ? heightVal.value / bodyHeight : 0;
    const borderOpacity = interpolate(progress, [0, 1], [0, 1]);

    return {
      borderColor: withAlpha(colors.border, borderOpacity),
      borderWidth: 1,
    };
  });

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle, style]}>
      {/* Header pressable */}
      <Pressable
        onPress={handleToggle}
        disabled={disabled}
        style={[styles.headerRow, headerStyle]}
        accessibilityRole="button"
        accessibilityLabel={isOpen ? 'Collapse details' : 'Expand details'}
        accessibilityState={{ expanded: isOpen }}
      >
        <View style={styles.titleContainer}>{title}</View>

        <Animated.View style={[styles.chevronContainer, chevronAnimatedStyle]}>
          <ChevronDown
            size={18}
            color={isOpen ? colors.primary : colors.textMuted}
          />
        </Animated.View>
      </Pressable>

      {/* Body expandable */}
      <Animated.View style={[styles.bodyWrapper, bodyAnimatedStyle]}>
        <View
          style={styles.bodyContent}
          onLayout={handleBodyLayout}
        >
          {children}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    width: '100%',
  },
  titleContainer: {
    flex: 1,
  },
  chevronContainer: {
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bodyWrapper: {
    overflow: 'hidden',
    width: '100%',
  },
  bodyContent: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
});
