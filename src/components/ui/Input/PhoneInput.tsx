import { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput as RNTextInput } from 'react-native';
import { Text } from '@components/ui/Text';
import { colors, radius } from '@design/index';
import { ChevronDown } from 'lucide-react-native';

interface PhoneInputProps {
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  countryCode?: string;
  countryFlag?: string;
  onCountryPress?: () => void;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const PhoneInput = ({
  value,
  onChangeText,
  error,
  countryCode = '+92',
  countryFlag = '🇵🇰',
  onCountryPress,
  autoFocus = true,
  onSubmitEditing,
  onFocus,
  onBlur,
}: PhoneInputProps) => {
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error
    ? colors.borderError
    : isFocused
    ? colors.primaryDark
    : colors.border;
  const backgroundColor = isFocused ? colors.bgCard : colors.bgInput;

  return (
    <View>
      <View style={[styles.container, { borderColor, backgroundColor }]}>
        <Pressable 
          style={styles.countrySection} 
          onPress={onCountryPress ? onCountryPress : () => console.log('Country picker pressed')}
        >
          <Text style={styles.flag}>{countryFlag}</Text>
          <Text style={styles.code}>{countryCode}</Text>
          <ChevronDown size={14} color={colors.textMuted} />
        </Pressable>
        <View style={styles.divider} />
        <RNTextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType="phone-pad"
          placeholder="3XX XXXXXXX"
          placeholderTextColor={colors.textMuted}
          maxLength={10}
          autoFocus={autoFocus}
          onFocus={() => {
            setIsFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          returnKeyType="done"
          onSubmitEditing={onSubmitEditing}
        />
      </View>
      {!!error && (
        <Text variant="caption" style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  countrySection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: '100%',
  },
  flag: {
    fontSize: 20,
    marginRight: 6,
  },
  code: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    marginRight: 4,
  },
  divider: {
    width: 1,
    height: '52%',
    backgroundColor: colors.border,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: colors.textPrimary,
  },
  errorText: {
    color: colors.textDanger,
    marginTop: 8,
    marginLeft: 4,
  },
});