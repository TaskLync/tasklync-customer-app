import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { fontFamily, spacing } from '../../design';
import { Switch } from '../ui/Switch';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface ToggleRowProps {
  label: string;
  subtitle?: string;
  icon?: React.ReactNode;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

/**
 * Settings row with a Tasklync switch. The whole row is the touch target and the accessible
 * "switch"; pressing anywhere gives the thumb its press stretch, releasing toggles.
 */
export const ToggleRow: React.FC<ToggleRowProps> = ({
  label,
  subtitle,
  icon,
  value,
  onValueChange,
  disabled = false,
}) => {
  const styles = useThemedStyles(createStyles);
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      style={({ pressed: isDown }) => [styles.container, isDown && styles.containerPressed]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      accessibilityHint={subtitle}
    >
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}

      <View style={styles.textContainer}>
        <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2} maxFontSizeMultiplier={1.3}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <Switch value={value} disabled={disabled} pressed={pressed} />
    </Pressable>
  );
};

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    container: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.sm + 2,
    },
    containerPressed: {
      backgroundColor: colors.bgHover,
    },
    iconContainer: {
      width: 20,
      marginRight: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
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
      marginTop: 2,
      fontFamily: fontFamily.jakarta.regular,
      fontSize: 12.5,
      lineHeight: 17,
      color: colors.textMuted,
    },
  });
