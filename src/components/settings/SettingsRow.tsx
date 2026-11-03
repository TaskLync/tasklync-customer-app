import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, palette, fontFamily, spacing } from '../../design';

export interface SettingsRowProps {
  label: string;
  subtitle?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  label,
  subtitle,
  icon,
  rightElement,
  showChevron = false,
  onPress,
  accessibilityLabel,
}) => {
  const isInteractive = Boolean(onPress);

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  const Content = (
    <View style={styles.row}>
      {/* Optional Leading Icon */}
      {icon && <View style={styles.iconContainer}>{icon}</View>}

      {/* Label and Subtitle */}
      <View style={styles.textContainer}>
        <Text
          style={styles.label}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text
            style={styles.subtitle}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Trailing Slot or Chevron */}
      <View style={styles.trailingContainer}>
        {rightElement}
        {showChevron && (
          <ChevronRight size={18} color={palette.gray400} style={styles.chevron} />
        )}
      </View>
    </View>
  );

  if (isInteractive) {
    return (
      <TouchableOpacity
        activeOpacity={0.65}
        onPress={handlePress}
        style={styles.container}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label}
      >
        {Content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={styles.container}
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel || label}
    >
      {Content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 52,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
  },
  iconContainer: {
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: 20,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  label: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 2,
  },
  trailingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  chevron: {
    marginLeft: spacing.xs,
  },
});
