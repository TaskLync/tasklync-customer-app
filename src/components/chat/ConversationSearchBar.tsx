import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { CloseIcon, SearchIcon } from '../ui/Icon/icons';
import { fontFamily } from '../../design/typography';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface ConversationSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  placeholder?: string;
}

/**
 * Borderless inbox search. A quiet neutral fill that deepens slightly on focus; no outline, no
 * brand colour. Clear button appears only when there is text.
 */
export const ConversationSearchBar: React.FC<ConversationSearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  placeholder = 'Search conversations or workers',
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);

  useEffect(() => {
    focus.value = withTiming(focused ? 1 : 0, { duration: 160 });
  }, [focused, focus]);

  const fillFrom = colors.neutralFill;
  const fillTo = colors.neutralFillPressed;
  const animatedFill = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(focus.value, [0, 1], [fillFrom, fillTo]),
  }));

  const hasText = value.length > 0;

  return (
    <Pressable onPress={() => inputRef.current?.focus()} accessible={false}>
      <Animated.View style={[styles.container, animatedFill]}>
        <SearchIcon size={18} strokeWidth={2} color={focused || hasText ? colors.neutralInk : colors.neutralInkSecondary} />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.neutralInkSecondary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
          selectionColor={colors.neutralInk}
          cursorColor={colors.neutralInk}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never"
          maxFontSizeMultiplier={1.3}
          accessibilityLabel="Search conversations"
        />
        {hasText && (
          <Pressable
            onPress={() => {
              onClear();
              inputRef.current?.focus();
            }}
            hitSlop={10}
            style={styles.clear}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <View style={styles.clearCircle}>
              <CloseIcon size={11} strokeWidth={2.6} color={colors.neutralBg} />
            </View>
          </Pressable>
        )}
      </Animated.View>
    </Pressable>
  );
};

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 44,
      borderRadius: 12,
      paddingHorizontal: 14,
      gap: 10,
    },
    input: {
      flex: 1,
      minHeight: 44,
      paddingVertical: 10,
      fontFamily: fontFamily.jakarta.regular,
      fontSize: 15,
      color: colors.neutralInk,
      includeFontPadding: false,
    },
    clear: {
      height: 44,
      justifyContent: 'center',
    },
    clearCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.neutralInkTertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
