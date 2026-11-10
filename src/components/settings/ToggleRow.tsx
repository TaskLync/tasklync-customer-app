import React from 'react';
import { View, Text, Switch, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { fontFamily, spacing } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface ToggleRowProps {
  label: string;
  subtitle?: string;
  icon?: React.ReactNode;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

/**
 * ToggleRow Component
 *
 * Implements high-standard native switch patterns:
 * - Neutral light-grey OFF track and consistent brand-green ON track.
 * - Crisp white thumb on both Android and iOS with native drop shadow.
 * - Entire row is a pressable touch target (>= 44x44pt).
 * - Fixed right-aligned switch container preventing distortion or text overlap.
 */
export const ToggleRow: React.FC<ToggleRowProps> = ({
  label,
  subtitle,
  icon,
  value,
  onValueChange,
  disabled = false,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const accessibilityState = { checked: value, disabled };
  const a11yAnnouncement = `${label}${subtitle ? ', ' + subtitle : ''}, switch ${value ? 'on' : 'off'}`;

  const handleRowPress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.65}
      onPress={handleRowPress}
      disabled={disabled}
      style={styles.container}
      accessible={true}
      accessibilityRole="switch"
      accessibilityState={accessibilityState}
      accessibilityLabel={a11yAnnouncement}
    >
      {/* Optional Leading Icon */}
      {icon && <View style={styles.iconContainer}>{icon}</View>}

      {/* Label and optional single-line subtitle */}
      <View style={styles.textContainer}>
        <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Modern, Consistently Sized Native Switch */}
      <View style={styles.switchContainer} pointerEvents="none">
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{
            false: Platform.OS === 'android' ? colors.borderStrong : colors.border,
            true: colors.primaryDark,
          }}
          thumbColor={colors.pureWhite}
          ios_backgroundColor={colors.border}
          style={Platform.OS === 'ios' ? styles.iosSwitch : undefined}
        />
      </View>
    </TouchableOpacity>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    minHeight: 52,
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
    marginRight: spacing.md,
    justifyContent: 'center',
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
  switchContainer: {
    width: 48,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iosSwitch: {
    transform: [{ scaleX: 0.88 }, { scaleY: 0.88 }],
  },
});
