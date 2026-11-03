import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { X, ShieldAlert, Check, AlertCircle } from 'lucide-react-native';
import { BottomSheet, BottomSheetScrollView } from '../layout/BottomSheet';
import { BlockReason, BlockReasonOption } from '../../types/moderation.types';
import { colors, palette, fontFamily, fontSize, radius, spacing, shadows } from '../../design';

export interface BlockWorkerSheetProps {
  visible: boolean;
  workerId: string;
  workerName: string;
  hasActiveBooking?: boolean;
  onClose: () => void;
  onBlock: (workerId: string, reason?: BlockReason) => Promise<void>;
  isLoading?: boolean;
}

const BLOCK_REASONS: BlockReasonOption[] = [
  { key: 'unprofessional', label: 'Unprofessional behavior or attitude' },
  { key: 'made_me_uncomfortable', label: 'Made me feel uncomfortable' },
  { key: 'poor_quality_work', label: 'Poor quality service or incomplete work' },
  { key: 'other', label: 'Other personal reasons' },
];

export const BlockWorkerSheet: React.FC<BlockWorkerSheetProps> = ({
  visible,
  workerId,
  workerName,
  hasActiveBooking = false,
  onClose,
  onBlock,
  isLoading = false,
}) => {
  const [selectedReason, setSelectedReason] = useState<BlockReason | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSelectReason = (reason: BlockReason) => {
    setSelectedReason((prev) => (prev === reason ? null : reason));
    setErrorMsg(null);
  };

  const handleConfirmBlock = async () => {
    if (isLoading) return;
    try {
      await onBlock(workerId, selectedReason || undefined);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to block worker. Please try again.');
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={isLoading ? undefined : onClose}
      snapPoints={['75%', '92%']}
      contentPadding={true}
    >
      <View style={styles.sheetContent}>
        {/* Sheet Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitleBox}>
            <ShieldAlert size={20} color={palette.danger} style={styles.shieldIcon} />
            <Text style={styles.headerTitle} maxFontSizeMultiplier={1.3}>
              Block {workerName}?
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close sheet"
            disabled={isLoading}
          >
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Explanatory Trust Notice */}
          <Text style={styles.infoText} maxFontSizeMultiplier={1.3}>
            They won't be able to see your profile, message you, or receive your future booking requests. This won't notify them.
          </Text>

          {/* Edge Case Warning: Active Booking */}
          {hasActiveBooking && (
            <View style={styles.activeBookingWarning}>
              <AlertCircle size={18} color="#B45309" style={styles.warningIcon} />
              <Text style={styles.activeBookingText} maxFontSizeMultiplier={1.3}>
                You still have an active booking with this worker — blocking won't cancel or affect your ongoing service.
              </Text>
            </View>
          )}

          {/* Reason Selection Header */}
          <Text style={styles.reasonHeader} maxFontSizeMultiplier={1.2}>
            REASON (OPTIONAL)
          </Text>

          {/* Radio Reasons List */}
          <View style={styles.reasonsList} accessibilityRole="radiogroup">
            {BLOCK_REASONS.map((item) => {
              const isSelected = selectedReason === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.75}
                  onPress={() => handleSelectReason(item.key)}
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
                    {isSelected && <Check size={12} color={palette.white} strokeWidth={3} />}
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

          {/* Error Message Banner */}
          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsBox}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleConfirmBlock}
              style={styles.blockBtn}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel={`Confirm block ${workerName}`}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={palette.white} />
              ) : (
                <Text style={styles.blockBtnText}>Block Service Provider</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onClose}
              style={styles.cancelBtn}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Cancel blocking"
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetScrollView>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetContent: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shieldIcon: {
    marginRight: spacing.xs + 2,
  },
  headerTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.h3,
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.sm,
  },
  infoText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  activeBookingWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  warningIcon: {
    marginRight: spacing.xs + 2,
    marginTop: 1,
    flexShrink: 0,
  },
  activeBookingText: {
    flex: 1,
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 12,
    lineHeight: 16,
    color: '#92400E',
  },
  reasonHeader: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.textMuted,
    marginBottom: spacing.xs + 2,
  },
  reasonsList: {
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.iceGray,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
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
    fontSize: 13,
    color: colors.textPrimary,
  },
  reasonLabelSelected: {
    fontFamily: fontFamily.jakarta.semiBold,
    color: colors.textPrimary,
  },
  errorBox: {
    backgroundColor: palette.dangerLight,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 12,
    color: palette.danger,
    textAlign: 'center',
  },
  actionsBox: {
    gap: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  blockBtn: {
    height: 50,
    backgroundColor: palette.danger,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.xs,
  },
  blockBtnText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body1,
    color: palette.white,
  },
  cancelBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
