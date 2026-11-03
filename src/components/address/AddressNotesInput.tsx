import { View, Text, TextInput, StyleSheet, useColorScheme, Platform, Keyboard } from 'react-native';
import { colors, palette, fontFamily, fontSize } from '../../design';

export interface AddressNotesInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onFocus?: (() => void) | undefined;
  onBlur?: (() => void) | undefined;
}

export const AddressNotesInput: React.FC<AddressNotesInputProps> = ({
  value,
  onChangeText,
  onFocus,
  onBlur,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, isDark && styles.labelDark]} maxFontSizeMultiplier={1.3}>
          Delivery & Entry Notes
        </Text>
        <Text style={[styles.optionalText, isDark && styles.optionalTextDark]} maxFontSizeMultiplier={1.3}>
          Optional
        </Text>
      </View>
      <TextInput
        style={[styles.input, isDark && styles.inputDark]}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="e.g. Flat 3B, blue gate, near the mosque"
        placeholderTextColor={isDark ? '#64748B' : palette.gray400}
        maxLength={120}
        multiline={false}
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
        maxFontSizeMultiplier={1.3}
        accessibilityLabel="Delivery and entry notes"
        accessibilityHint="Optional specific details to help the worker find your door"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  labelDark: {
    color: colors.textMuted,
  },
  optionalText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  optionalTextDark: {
    color: colors.textSecondary,
  },
  input: {
    height: 48,
    backgroundColor: colors.bgInput,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.body2,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  inputDark: {
    backgroundColor: palette.gray900,
    borderColor: palette.gray700,
    color: palette.gray50,
  },
});

