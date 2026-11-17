import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { typography } from '../../design/typography';
import { radius } from '../../design/radius';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface FilterChipOption<T extends string> {
  value: T;
  label: string;
  count?: number | undefined;
}

interface FilterChipsProps<T extends string> {
  options: FilterChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * Quiet single-select chips. Inactive: soft grey fill. Active: white surface, charcoal text and a
 * small green dot (restrained accent, never a bright green pill). Pressed: a neutral fill, no
 * opacity fade, so nothing ever flashes white.
 */
export function FilterChips<T extends string>({ options, value, onChange }: FilterChipsProps<T>) {
  const styles = useThemedStyles(createStyles);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
      accessibilityRole="tablist"
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => !selected && onChange(o.value)}
            hitSlop={{ top: 4, bottom: 4 }}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.chipSelected,
              pressed && !selected && styles.chipPressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={typeof o.count === 'number' ? `${o.label}, ${o.count}` : o.label}
          >
            {selected && <View style={styles.dot} />}
            <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {o.label}
            </Text>
            {typeof o.count === 'number' && (
              <Text style={[styles.count, selected && styles.countSelected]} maxFontSizeMultiplier={1.3}>
                {o.count}
              </Text>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const createStyles = ({ colors, palette }: AppTheme) =>
  StyleSheet.create({
    scroll: {
      flexGrow: 0,
    },
    row: {
      paddingHorizontal: 20,
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 36,
      paddingHorizontal: 14,
      borderRadius: radius.pill,
      backgroundColor: colors.searchFieldBg,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    chipSelected: {
      backgroundColor: colors.segmentThumb,
      borderColor: colors.border,
    },
    chipPressed: {
      backgroundColor: colors.buttonSecondaryPressed,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: palette.green600,
    },
    label: {
      fontFamily: typography.fontFamily.jakarta.medium,
      fontSize: 13.5,
      color: colors.textSecondary,
    },
    labelSelected: {
      fontFamily: typography.fontFamily.jakarta.semiBold,
      color: colors.textPrimary,
    },
    count: {
      fontFamily: typography.fontFamily.inter.medium,
      fontSize: 12.5,
      color: colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    countSelected: {
      color: colors.textSecondary,
    },
  });
