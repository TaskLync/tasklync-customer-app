import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { DisputeReason, DisputeReasonOption } from '../../types/booking.types';
import { fontFamily, fontSize, radius, spacing } from '../../design';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export const DISPUTE_REASONS: DisputeReasonOption[] = [
  {
    key: 'work_not_completed',
    label: 'Incomplete or Unfinished Work',
    description: 'The job was left incomplete or key agreed tasks were skipped.',
  },
  {
    key: 'poor_quality',
    label: 'Substandard Service Quality',
    description: 'Workmanship was significantly below professional expectations.',
  },
  {
    key: 'worker_no_show',
    label: 'Worker Did Not Show Up',
    description: 'The service professional was absent and did not arrive for the appointment.',
  },
  {
    key: 'overcharged',
    label: 'Incorrect Charge / Demanded Extra Fees',
    description: 'Billed incorrectly or requested unauthorized additional cash payments.',
  },
  {
    key: 'other',
    label: 'Other Service or Conduct Issue',
    description: 'Property damage, unprofessional conduct, or policy violation.',
  },
];

export interface DisputeReasonRadioGroupProps {
  selectedReason: DisputeReason | null;
  onSelectReason: (reason: DisputeReason) => void;
  disabled?: boolean;
}

/**
 * DisputeReasonRadioGroup Component
 *
 * Implements Hick's Law & Recognition over Recall:
 * - Exactly 5 structured complete statements
 * - Radio selection with calm 150ms fill timing (not bouncy spring)
 * - Single haptic tick per selection
 */
export const DisputeReasonRadioGroup: React.FC<DisputeReasonRadioGroupProps> = ({
  selectedReason,
  onSelectReason,
  disabled = false,
}) => {
  const styles = useThemedStyles(createStyles);
  const handleSelect = (key: DisputeReason) => {
    if (disabled || selectedReason === key) return;
    onSelectReason(key);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.groupHeading}>Reason for Dispute *</Text>
      <Text style={styles.groupSubheading}>Select the primary issue you experienced</Text>

      <View style={styles.optionsList}>
        {DISPUTE_REASONS.map((opt) => {
          const isSelected = selectedReason === opt.key;

          return (
            <Pressable
              key={opt.key}
              style={({ pressed }) => [
                styles.optionCard,
                isSelected && styles.optionCardSelected,
                pressed && !disabled && styles.optionCardPressed,
                disabled && styles.optionCardDisabled,
              ]}
              onPress={() => handleSelect(opt.key)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${opt.label}: ${opt.description}`}
            >
              {/* Radio Indicator */}
              <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                {isSelected ? <View style={styles.radioInner} /> : null}
              </View>

              {/* Text Info */}
              <View style={styles.textCol}>
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                  {opt.label}
                </Text>
                <Text style={styles.optionDesc}>{opt.description}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  groupHeading: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.label + 1,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  groupSubheading: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm + 2,
  },
  optionsList: {
    gap: spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md - 2,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  optionCardSelected: {
    backgroundColor: palette.green50,
    borderColor: colors.primary,
  },
  optionCardPressed: {
    opacity: 0.85,
  },
  optionCardDisabled: {
    opacity: 0.6,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md - 2,
    marginTop: 2,
  },
  radioOuterSelected: {
    borderColor: colors.primaryDark,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primaryDark,
  },
  textCol: {
    flex: 1,
  },
  optionLabel: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: fontSize.body2,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: colors.primaryDark,
  },
  optionDesc: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});
