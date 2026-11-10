import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { typography } from '../../../design/typography';
import { shadows } from '../../../design/shadows';
import { springConfig } from '../../../design/animations';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

interface ToggleOption {
  label: string;
  value: string;
}

interface TabToggleProps {
  options: ToggleOption[];
  activeValue: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const TabToggle: React.FC<TabToggleProps> = ({
  options,
  activeValue,
  onChange,
  disabled = false,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [containerWidth, setContainerWidth] = useState(0);
  const activeIndex = options.findIndex((o) => o.value === activeValue);

  const indicatorX = useSharedValue(3);
  const isInitialized = useRef(false);

  const innerWidth = containerWidth > 6 ? containerWidth - 6 : 0;
  const optionWidth = options.length > 0 ? innerWidth / options.length : 0;

  useEffect(() => {
    if (containerWidth > 0 && activeIndex !== -1) {
      const targetX = 3 + activeIndex * optionWidth;
      if (!isInitialized.current) {
        indicatorX.value = targetX;
        isInitialized.current = true;
      } else {
        indicatorX.value = withSpring(targetX, springConfig.gentle);
      }
    }
  }, [activeIndex, containerWidth, optionWidth, indicatorX]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    setContainerWidth(width);
  };

  const handlePress = (value: string) => {
    if (disabled) return;
    onChange(value);
  };

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      left: indicatorX.value,
      width: optionWidth,
    };
  });

  const getLabelStyle = (index: number) => {
    const isActive = index === activeIndex;
    return {
      fontFamily: isActive
        ? typography.fontFamily.poppins.semiBold
        : typography.fontFamily.jakarta.medium,
      color: isActive ? colors.textPrimary : colors.textMuted,
    };
  };

  return (
    <View
      style={[styles.container, disabled && styles.disabled]}
      onLayout={handleLayout}
      accessibilityRole="tablist"
    >
      {containerWidth > 0 && (
        <Animated.View style={[styles.indicator, indicatorStyle]} />
      )}

      {options.map((option, index) => {
        const isActive = index === activeIndex;

        return (
          <Pressable
            key={option.value}
            onPress={() => handlePress(option.value)}
            disabled={disabled}
            style={styles.tabButton}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            {({ pressed }) => {
              const scale = pressed ? 0.98 : 1.0;
              return (
                <Animated.View style={{ transform: [{ scale }] }}>
                  <Text style={[styles.labelText, getLabelStyle(index)]}>
                    {option.label}
                  </Text>
                </Animated.View>
              );
            }}
          </Pressable>
        );
      })}
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    height: 38,
    flexDirection: 'row',
    backgroundColor: colors.bgSection,
    borderRadius: 100,
    padding: 3,
    position: 'relative',
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    backgroundColor: colors.bgCard,
    borderRadius: 100,
    ...shadows.sm,
  },
  tabButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  labelText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
