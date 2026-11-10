import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DeleteAccountReason, DeleteAccountReasonOption } from '../../types/moderation.types';
import { fontFamily, fontSize, radius, spacing, shadows } from '../../design';
import { Check } from 'lucide-react-native';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface DeleteAccountReasonStepProps {
  onContinue: (reason?: DeleteAccountReason) => void;
  onSkip: () => void;
}

const REASONS: DeleteAccountReasonOption[] = [
  { key: 'found_better_app', label: 'Found another app/service' },
  { key: 'too_expensive', label: 'Service costs are too high' },
  { key: 'did_not_need', label: "Don't need home services right now" },
  { key: 'privacy_concerns', label: 'Privacy or security concerns' },
  { key: 'other', label: 'Other personal reasons' },
];

export const DeleteAccountReasonStep: React.FC<DeleteAccountReasonStepProps> = ({
  onContinue,
  onSkip,
}) => {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [selectedReason, setSelectedReason] = useState<DeleteAccountReason | null>(null);

  const handleSelect = (reason: DeleteAccountReason) => {
    setSelectedReason((prev) => (prev === reason ? null : reason));
  };

  const handleContinue = () => {
    onContinue(selectedReason || undefined);
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title} maxFontSizeMultiplier={1.3}>
        We're sorry to see you go
      </Text>
      <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
        Please tell us why you are leaving so we can improve Tasklync:
      </Text>

      {/* Radio options */}
      <View style={styles.reasonsList} accessibilityRole="radiogroup">
        {REASONS.map((item) => {
          const isSelected = selectedReason === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.75}
              onPress={() => handleSelect(item.key)}
              style={[styles.reasonRow, isSelected && styles.reasonRowSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={item.label}
            >
              <View
                style={[
                  styles.radioCircle,
                  isSelected && styles.radioCircleSelected,
                ]}
              >
                {isSelected && <Check size={12} color={palette.pureWhite} strokeWidth={3} />}
              </View>
              <Text
                style={[
                  styles.reasonLabel,
                  isSelected && styles.reasonLabelSelected,
                ]}
                maxFontSizeMultiplier={1.3}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* CTA Buttons */}
      <View style={styles.actionsBox}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleContinue}
          style={styles.continueBtn}
          accessibilityRole="button"
          accessibilityLabel="Continue to account deletion confirmation"
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleSkip}
          style={styles.skipBtn}
          accessibilityRole="button"
          accessibilityLabel="Skip feedback and continue"
        >
          <Text style={styles.skipBtnText}>Skip feedback</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
  },
  title: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.h3,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  reasonsList: {
    gap: spacing.xs + 2,
    marginBottom: spacing.lg,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.iceGray,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 3,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.softGray,
  },
  reasonRowSelected: {
    backgroundColor: palette.green50,
    borderColor: palette.green300,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: palette.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  radioCircleSelected: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  reasonLabel: {
    flex: 1,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13.5,
    color: colors.textPrimary,
  },
  reasonLabelSelected: {
    fontFamily: fontFamily.jakarta.semiBold,
    color: colors.textPrimary,
  },
  actionsBox: {
    gap: spacing.xs,
  },
  continueBtn: {
    height: 52,
    backgroundColor: colors.primaryDark,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  continueBtnText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body1,
    color: colors.textOnGreen,
  },
  skipBtn: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
});
