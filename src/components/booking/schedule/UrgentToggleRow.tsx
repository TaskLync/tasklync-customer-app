import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { UrgentPriceBadge } from './UrgentPriceBadge';
import { fontFamily } from '../../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

export interface UrgentToggleRowProps {
  isUrgent: boolean;
  onToggle: (value: boolean) => void;
}

export const UrgentToggleRow: React.FC<UrgentToggleRowProps> = ({
  isUrgent,
  onToggle,
}) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const handleValueChange = (value: boolean) => {
    onToggle(value);
  };

  return (
    <View style={styles.card}>
      <View style={styles.leftContainer}>

        <View style={styles.textContainer}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Urgent (within 2 hrs)</Text>
            <UrgentPriceBadge visible={isUrgent} badgeText="+30%" />
          </View>
        </View>
      </View>

      <Switch
        value={isUrgent}
        onValueChange={handleValueChange}
        trackColor={{ false: palette.gray200, true: colors.primary }}
        thumbColor={palette.white}
        ios_backgroundColor={palette.gray200}
        accessibilityRole="switch"
        accessibilityLabel="Urgent booking toggle"
        accessibilityState={{ checked: isUrgent }}
      />
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginVertical: 14,
    paddingVertical: 16,
    backgroundColor: palette.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  sublabel: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
    marginTop: 2,
  },
});
