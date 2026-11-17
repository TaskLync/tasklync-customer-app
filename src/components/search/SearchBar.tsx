import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Search, X } from 'lucide-react-native';
import { typography } from '../../design/typography';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

/**
 * The ONE Tasklync search bar (Home + Explore). Borderless: a soft neutral surface with defined
 * rounded geometry; focus / press brings in a faint green ring. Two modes:
 *  - `field`  (Explore): a real input.
 *  - `button` (Home):    looks identical, opens the search screen on tap.
 */
export const SEARCH_BAR = {
  height: 56,
  radius: 18,
  paddingH: 18,
  iconSize: 21,
  gap: 12,
  fontSize: 15.5,
} as const;

export const SEARCH_PLACEHOLDER = 'What do you need help with?';

const FOCUS = { duration: 180 };

interface CommonProps {
  placeholder?: string;
  accessibilityLabel?: string;
}

interface FieldProps extends CommonProps {
  mode?: 'field';
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  onSubmit?: () => void;
  autoFocus?: boolean;
}

interface ButtonProps extends CommonProps {
  mode: 'button';
  onPress: () => void;
  accessibilityHint?: string;
}

export type SearchBarProps = FieldProps | ButtonProps;

export interface SearchBarRef {
  focus: () => void;
  blur: () => void;
}

export const SearchBar = forwardRef<SearchBarRef, SearchBarProps>((props, ref) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const inputRef = useRef<TextInput>(null);
  const [active, setActive] = useState(false); // focused (field) or pressed (button)
  const placeholder = props.placeholder ?? SEARCH_PLACEHOLDER;

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
  }));

  const progress = useSharedValue(0);
  const scale = useSharedValue(1);
  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, FOCUS);
  }, [active, progress]);

  const ringOff = colors.searchFieldBg;
  const ringOn = colors.primaryBorder;
  const surfaceStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(progress.value, [0, 1], [ringOff, ringOn]),
    transform: [{ scale: scale.value }],
  }));

  const iconColor = active ? colors.textPrimary : colors.textSecondary;

  if (props.mode === 'button') {
    return (
      <Pressable
        onPress={props.onPress}
        onPressIn={() => {
          setActive(true);
          scale.value = withSpring(0.985, { damping: 20, stiffness: 420 });
        }}
        onPressOut={() => {
          setActive(false);
          scale.value = withSpring(1, { damping: 16, stiffness: 320 });
        }}
        accessibilityRole="search"
        accessibilityLabel={props.accessibilityLabel ?? 'Search for services or professionals'}
        accessibilityHint={props.accessibilityHint ?? 'Opens search'}
      >
        <Animated.View style={[styles.surface, surfaceStyle]}>
          <Search size={SEARCH_BAR.iconSize} strokeWidth={2} color={iconColor} />
          <Text style={styles.placeholder} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {placeholder}
          </Text>
        </Animated.View>
      </Pressable>
    );
  }

  const { value, onChangeText, onClear, onSubmit, autoFocus = false } = props;
  const hasText = value.length > 0;

  return (
    <Pressable onPress={() => inputRef.current?.focus()} accessible={false}>
      <Animated.View style={[styles.surface, surfaceStyle]}>
        <Search size={SEARCH_BAR.iconSize} strokeWidth={2} color={active || hasText ? colors.textPrimary : colors.textSecondary} />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          onFocus={() => setActive(true)}
          onBlur={() => setActive(false)}
          onSubmitEditing={onSubmit}
          autoFocus={autoFocus}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never"
          selectionColor={colors.buttonPrimary}
          cursorColor={colors.buttonPrimary}
          style={styles.input}
          maxFontSizeMultiplier={1.3}
          accessibilityLabel={props.accessibilityLabel ?? 'Search services and professionals'}
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
              <X size={11} strokeWidth={2.6} color={colors.searchFieldBg} />
            </View>
          </Pressable>
        )}
      </Animated.View>
    </Pressable>
  );
});

SearchBar.displayName = 'SearchBar';

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    surface: {
      flexDirection: 'row',
      alignItems: 'center',
      height: SEARCH_BAR.height,
      borderRadius: SEARCH_BAR.radius,
      borderCurve: 'continuous',
      paddingHorizontal: SEARCH_BAR.paddingH,
      gap: SEARCH_BAR.gap,
      backgroundColor: colors.searchFieldBg,
      // The ring is always present (same colour as the surface when idle), so focus never shifts layout.
      borderWidth: 1,
    },
    placeholder: {
      flex: 1,
      fontFamily: typography.fontFamily.jakarta.regular,
      fontSize: SEARCH_BAR.fontSize,
      color: colors.placeholder,
      includeFontPadding: false,
    },
    input: {
      flex: 1,
      height: '100%',
      paddingVertical: 0,
      fontFamily: typography.fontFamily.jakarta.regular,
      fontSize: SEARCH_BAR.fontSize,
      color: colors.textPrimary,
      includeFontPadding: false,
      textAlignVertical: 'center',
    },
    clear: {
      height: SEARCH_BAR.height,
      justifyContent: 'center',
    },
    clearCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.textMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
