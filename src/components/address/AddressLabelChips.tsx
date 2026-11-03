import { View, Text, StyleSheet, Pressable, TextInput, useColorScheme, Platform, Keyboard } from 'react-native';
import { Home, Building2, MapPin } from 'lucide-react-native';
import { colors, palette, fontFamily, radius } from '../../design';

export interface AddressLabelChipsProps {
  selectedLabel: string;
  customLabel?: string | undefined;
  onSelectLabel: (label: string) => void;
  onChangeCustomLabel?: ((custom: string) => void) | undefined;
  onFocusCustomLabel?: (() => void) | undefined;
  onBlurCustomLabel?: (() => void) | undefined;
}

const CHIP_OPTIONS: Array<{
  id: 'Home' | 'Office' | 'Other';
  title: string;
  Icon: typeof Home;
}> = [
  { id: 'Home', title: 'Home', Icon: Home },
  { id: 'Office', title: 'Office', Icon: Building2 },
  { id: 'Other', title: 'Other', Icon: MapPin },
];

export const AddressLabelChips: React.FC<AddressLabelChipsProps> = ({
  selectedLabel,
  customLabel = '',
  onSelectLabel,
  onChangeCustomLabel,
  onFocusCustomLabel,
  onBlurCustomLabel,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const isOtherSelected =
    selectedLabel === 'Other' ||
    (!['Home', 'Office'].includes(selectedLabel) && Boolean(selectedLabel));

  const handleSelect = (id: 'Home' | 'Office' | 'Other') => {
    onSelectLabel(id);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionHeading, isDark && styles.sectionHeadingDark]} maxFontSizeMultiplier={1.3}>
        Save address as
      </Text>

      {/* 3 Horizontal Chips */}
      <View style={styles.chipsRow} accessibilityRole="radiogroup">
        {CHIP_OPTIONS.map((opt) => {
          const isSelected =
            opt.id === 'Other'
              ? isOtherSelected
              : selectedLabel === opt.id;
          const { Icon } = opt;

          return (
            <Pressable
              key={opt.id}
              onPress={() => handleSelect(opt.id)}
              style={[
                styles.chip,
                isSelected
                  ? [styles.chipSelected, isDark && styles.chipSelectedDark]
                  : [styles.chipUnselected, isDark && styles.chipUnselectedDark],
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={opt.title}
            >
              <Icon
                size={16}
                color={
                  isSelected
                    ? (isDark ? palette.green400 : colors.primaryDark)
                    : (isDark ? palette.slate400 : palette.gray500)
                }
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.chipText,
                  isSelected
                    ? [styles.chipTextSelected, isDark && styles.chipTextSelectedDark]
                    : [styles.chipTextUnselected, isDark && styles.chipTextUnselectedDark],
                ]}
                maxFontSizeMultiplier={1.3}
              >
                {opt.title}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Inline Custom Label Input if "Other" is chosen */}
      {isOtherSelected && (
        <View style={styles.customInputContainer}>
          <TextInput
            style={[styles.customInput, isDark && styles.customInputDark]}
            value={customLabel}
            onChangeText={onChangeCustomLabel}
            onFocus={onFocusCustomLabel}
            onBlur={onBlurCustomLabel}
            placeholder="e.g. Mom's House, Gym, Warehouse"
            placeholderTextColor={isDark ? palette.slate500 : palette.gray400}
            maxLength={30}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            maxFontSizeMultiplier={1.3}
            accessibilityLabel="Custom address label name"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  sectionHeading: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  chipUnselected: {
    backgroundColor: palette.iceGray,
    borderWidth: 1,
    borderColor: palette.iceGray,
  },
  chipSelected: {
    backgroundColor: palette.green100,
    borderWidth: 1.5,
    borderColor: palette.green600,
  },
  chipText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 13,
    lineHeight: 16,
  },
  chipTextUnselected: {
    color: palette.gray600,
  },
  chipTextSelected: {
    color: palette.green800,
    fontFamily: fontFamily.jakarta.semiBold,
  },
  customInputContainer: {
    marginTop: 10,
  },
  customInput: {
    height: 44,
    backgroundColor: palette.iceGray,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  sectionHeadingDark: {
    color: colors.textMuted,
  },
  chipUnselectedDark: {
    backgroundColor: palette.gray700,
    borderColor: palette.gray600,
  },
  chipSelectedDark: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderColor: palette.green400,
  },
  chipTextUnselectedDark: {
    color: colors.textDisabled,
  },
  chipTextSelectedDark: {
    color: palette.green400,
  },
  customInputDark: {
    backgroundColor: palette.gray900,
    borderColor: palette.gray700,
    color: palette.gray50,
  },
});
