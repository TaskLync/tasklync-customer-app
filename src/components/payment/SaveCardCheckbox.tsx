import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { fontFamily } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface SaveCardCheckboxProps {
  checked: boolean;
  onToggle: (checked: boolean) => void;
  label?: string;
}

export const SaveCardCheckbox: React.FC<SaveCardCheckboxProps> = ({
  checked,
  onToggle,
  label = 'Save this card for faster future checkout',
}) => {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const handlePress = () => {
    onToggle(!checked);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={styles.container}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.checkbox,
          checked ? styles.checkboxChecked : styles.checkboxUnchecked,
        ]}
      >
        {checked && <Check size={12} color={palette.pureWhite} strokeWidth={3} />}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxUnchecked: {
    borderWidth: 2,
    borderColor: palette.gray300,
    backgroundColor: palette.white,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  label: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    flex: 1,
  },
});
