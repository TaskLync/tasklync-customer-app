import { useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Text,
} from 'react-native';
import { Search, X, Edit3 } from 'lucide-react-native';
import { fontFamily, radius, fontSize, shadows } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface AddressSearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  isLoading?: boolean | undefined;
  onManualAddressPress?: (() => void) | undefined;
  placeholder?: string | undefined;
}

export const AddressSearchInput: React.FC<AddressSearchInputProps> = ({
  value,
  onChangeText,
  onClear,
  isLoading = false,
  onManualAddressPress,
  placeholder = 'Search area, street, or landmark...',
}) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const inputRef = useRef<TextInput | null>(null);

  const handleClear = () => {
    onClear();
    inputRef.current?.focus();
  };

  const handleManualPress = () => {
    if (onManualAddressPress) {
      onManualAddressPress();
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <Search size={18} color={palette.gray500} strokeWidth={2.2} />

        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.gray400}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="never"
          maxFontSizeMultiplier={1.3}
          accessibilityRole="search"
          accessibilityLabel="Search address or landmark"
          accessibilityHint="Type at least 2 characters to see address suggestions"
        />

        {isLoading && (
          <ActivityIndicator
            size="small"
            color={colors.primaryDark}
            style={styles.loadingIndicator}
          />
        )}

        {Boolean(value.length > 0) && !isLoading && (
          <Pressable
            onPress={handleClear}
            hitSlop={10}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel="Clear search text"
          >
            <View style={styles.clearCircle}>
              <X size={13} color={palette.gray600} strokeWidth={2.5} />
            </View>
          </Pressable>
        )}
      </View>

      {/* WCAG Screen-reader / Motor Accessibility: Manual Address Type Shortcut */}
      {onManualAddressPress && (
        <Pressable
          onPress={handleManualPress}
          style={styles.manualEntryLink}
          accessibilityRole="button"
          accessibilityLabel="Type address details manually without using the map"
        >
          <Edit3 size={12} color={colors.primaryDark} strokeWidth={2.2} />
          <Text style={styles.manualEntryText} maxFontSizeMultiplier={1.3}>
            Type address manually
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    width: '100%',
  },
  searchBar: {
    height: 48,
    backgroundColor: palette.white,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: palette.gray200,
    ...shadows.md,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.body2,
    color: colors.textPrimary,
    marginLeft: 10,
    marginRight: 6,
    paddingVertical: 0,
  },
  loadingIndicator: {
    marginLeft: 6,
  },
  clearBtn: {
    padding: 4,
  },
  clearCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: palette.iceGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualEntryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  manualEntryText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 12,
    color: colors.primaryDark,
    textDecorationLine: 'underline',
  },
});
