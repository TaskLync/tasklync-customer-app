import { View, Text, TextInput, StyleSheet, Platform, Keyboard } from 'react-native';
import { fontFamily, fontSize } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface AddressNotesInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onFocus?: (() => void) | undefined;
  onBlur?: (() => void) | undefined;
  /** Defaults describe the "directions for the professional" field. */
  label?: string | undefined;
  placeholder?: string | undefined;
  maxLength?: number | undefined;
  optional?: boolean | undefined;
  accessibilityLabel?: string | undefined;
  accessibilityHint?: string | undefined;
}

/**
 * Single-line address input with the sheet's input styling. Used for the directions field and
 * the structured address parts (house / street / block / landmark).
 */
export const AddressNotesInput: React.FC<AddressNotesInputProps> = ({
  value,
  onChangeText,
  onFocus,
  onBlur,
  label = 'Directions for the professional',
  placeholder = 'e.g. Blue gate opposite the mosque, 2nd floor, ring twice',
  maxLength = 300,
  optional = true,
  accessibilityLabel,
  accessibilityHint = 'Optional directions to help the professional find your door',
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label]} maxFontSizeMultiplier={1.3}>
          {label}
        </Text>
        {optional && (
          <Text style={[styles.optionalText]} maxFontSizeMultiplier={1.3}>
            Optional
          </Text>
        )}
      </View>
      <TextInput
        style={[styles.input]}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        maxLength={maxLength}
        multiline={false}
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
        maxFontSizeMultiplier={1.3}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
      />
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
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
  optionalText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
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
});
