import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Plus } from 'lucide-react-native';
import { colors, fontFamily, radius, spacing, shadows } from '../../design';

export interface AddCardButtonProps {
  onPress: () => void;
  label?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const AddCardButton: React.FC<AddCardButtonProps> = ({
  onPress,
  label = '+ Add New Payment Method',
  icon,
  style,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.button, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.contentGroup}>
        {icon ?? <Plus size={16} color={colors.textOnGreen} strokeWidth={2.2} />}
        <Text
          style={styles.buttonText}
          numberOfLines={1}
          ellipsizeMode="tail"
          maxFontSizeMultiplier={1.15}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.base,
    ...shadows.sm,
  },
  contentGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexShrink: 1,
  },
  buttonText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 13.5,
    color: colors.textOnGreen,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    flexShrink: 1,
  },
});
