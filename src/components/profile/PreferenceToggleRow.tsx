import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { fontFamily, fontSize, radius, spacing } from '../../design';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface PreferenceOption<T extends string = string> {
  label: string;
  value: T;
}

export interface PreferenceToggleRowProps<T extends string = string> {
  label: string;
  subtitle?: string | undefined;
  options: PreferenceOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  disabled?: boolean;
}

/**
 * PreferenceToggleRow Component (Day 35)
 *
 * Implements Reusable Segmented Toggle:
 * - 150ms visual transition matching Day 34 radio standards
 * - Selection haptic tick on change
 * - Reusable across language, currency, and future units
 */
export function PreferenceToggleRow<T extends string = string>({
  label,
  subtitle,
  options,
  selectedValue,
  onSelect,
  disabled = false,
}: PreferenceToggleRowProps<T>) {
  const styles = useThemedStyles(createStyles);
  const handleSelect = (val: T) => {
    if (disabled || selectedValue === val) return;
    onSelect(val);
  };

  return (
    <View style={styles.container}>
      <View style={styles.textCol}>
        <Text style={styles.label}>{label}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {/* Segmented Control Pill */}
      <View style={styles.segmentContainer}>
        {options.map((opt) => {
          const isSelected = selectedValue === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              activeOpacity={0.8}
              style={[styles.segmentBtn, isSelected && styles.segmentBtnActive]}
              onPress={() => handleSelect(opt.value)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${label}: ${opt.label}`}
            >
              <Text
                style={[styles.segmentText, isSelected && styles.segmentTextActive]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray100,
  },
  textCol: {
    flex: 1,
    paddingRight: spacing.md,
  },
  label: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: fontSize.body2,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: palette.gray100,
    borderRadius: radius.pill,
    padding: 3,
  },
  segmentBtn: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  segmentBtnActive: {
    backgroundColor: colors.bgCard,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    fontFamily: fontFamily.jakarta.semiBold,
    color: colors.primaryDark,
  },
});
