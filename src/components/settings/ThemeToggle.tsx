import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { fontFamily, radius } from '../../design';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';
import type { ThemePreference } from '../../store/theme.store';

export interface ThemeToggleProps {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
}

const OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

/**
 * Appearance selector. "System" (the default) follows the device live; Light / Dark pin the app.
 * Same pill language as the language and currency toggles.
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({ value, onChange }) => {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container} accessibilityRole="radiogroup" accessibilityLabel="App appearance">
      {OPTIONS.map((opt) => {
        const selected = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            onPress={() => !selected && onChange(opt.id)}
            style={[styles.option, selected && styles.optionActive]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={opt.id === 'system' ? 'Match device appearance' : `${opt.label} appearance`}
          >
            <Text
              style={[styles.optionText, selected && styles.optionTextActive]}
              maxFontSizeMultiplier={1.2}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 34,
      padding: 2,
      backgroundColor: palette.gray100,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: palette.gray200,
    },
    option: {
      minWidth: 58,
      height: '100%',
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
    },
    optionActive: {
      backgroundColor: colors.primaryDark,
    },
    optionText: {
      fontFamily: fontFamily.jakarta.medium,
      fontSize: 12,
      color: colors.textSecondary,
    },
    optionTextActive: {
      fontFamily: fontFamily.jakarta.semiBold,
      color: palette.pureWhite,
    },
  });
