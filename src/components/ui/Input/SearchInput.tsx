import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TextInput as RNTextInput,
  StyleSheet,
  Pressable,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Search, X } from 'lucide-react-native';
import { colors } from '../../../design/colors';
import { typography } from '../../../design/typography';
import { springConfig, timingConfig } from '../../../design/animations';

export interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  onSubmitEditing?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  editable?: boolean;
  style?: ViewStyle;
  height?: number;
}

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChangeText,
  onClear,
  onSubmitEditing,
  placeholder = 'Search services, workers...',
  autoFocus = true,
  editable = true,
  style,
  height = 56,
}) => {
  const inputRef = useRef<RNTextInput>(null);
  const [isFocused, setIsFocused] = useState(autoFocus);
  
  const focusProgress = useSharedValue(autoFocus ? 1 : 0);
  const xOpacity = useSharedValue(value.length > 0 ? 1 : 0);
  const xScale = useSharedValue(value.length > 0 ? 1 : 0);

  useEffect(() => {
    if (value.length > 0) {
      xOpacity.value = withTiming(1, { duration: 150 });
      xScale.value = withSpring(1, springConfig.bouncy);
    } else {
      xOpacity.value = withTiming(0, { duration: 100 });
      xScale.value = withSpring(0, springConfig.stiff);
    }
  }, [value, xOpacity, xScale]);

  useEffect(() => {
    focusProgress.value = withTiming(isFocused ? 1 : 0, {
      duration: timingConfig.fast,
    });
  }, [isFocused, focusProgress]);

  const handleClear = () => {
    onClear();
    // Keep focus
    inputRef.current?.focus();
  };

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      borderColor: interpolateColor(
        focusProgress.value,
        [0, 1],
        [colors.border, colors.primaryDark]
      ),
      borderWidth: 1,
    };
  });

  const clearButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: xOpacity.value,
      transform: [{ scale: xScale.value }],
    };
  });

  return (
    <AnimatedView
      style={[
        styles.container,
        { height, minHeight: height },
        containerAnimatedStyle,
        style,
      ]}
    >
      <Animated.View style={[styles.iconContainer]}>
        <Search
          size={height >= 52 ? 20 : 18}
          color={isFocused ? colors.primary : colors.textMuted}
        />
      </Animated.View>

      <RNTextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoFocus={autoFocus}
        editable={editable}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onSubmitEditing={onSubmitEditing}
        style={[styles.input, { height: '100%' }]}
        selectionColor={colors.primary}
        returnKeyType="search"
        keyboardType="default"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
      />

      <AnimatedPressable
        style={[styles.clearButton, clearButtonAnimatedStyle]}
        onPress={handleClear}
        hitSlop={12}
        pointerEvents={value.length > 0 ? 'auto' : 'none'}
      >
        <X size={12} color={colors.textMuted} />
      </AnimatedPressable>
    </AnimatedView>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    flex: 1,
    backgroundColor: colors.bgInput,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    paddingLeft: 16,
    paddingRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 15.5,
    color: colors.textPrimary,
    paddingVertical: 0, // fix Android vertical alignment
  },
  clearButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.bgSection,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
});
