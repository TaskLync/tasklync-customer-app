import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Flag } from 'lucide-react-native';
import { ReportReason, REPORT_REASONS, ReportReviewPayload } from '../../types/review.types';
import { reviewApi, extractReviewErrorMessage } from '../../services/api/review.api';
import { fontFamily, fontSize, radius, spacing } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';
import { showAlert } from '../feedback/AppAlert';

export interface ReportReviewModalProps {
  visible: boolean;
  reviewId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const REPORT_REASON_KEYS: ReportReason[] = [
  'SPAM',
  'OFFENSIVE_LANGUAGE',
  'FAKE_REVIEW',
  'UNRELATED_CONTENT',
  'PERSONAL_INFO',
  'OTHER',
];

export const ReportReviewModal: React.FC<ReportReviewModalProps> = ({
  visible,
  reviewId,
  onClose,
  onSuccess,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [selectedReason, setSelectedReason] = useState<ReportReason>('OFFENSIVE_LANGUAGE');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!reviewId || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const trimmedNote = note.trim();
      const payload: ReportReviewPayload = {
        reason: selectedReason,
        ...(trimmedNote ? { note: trimmedNote } : {}),
      };

      await reviewApi.reportReview(reviewId, payload);

      showAlert(
        'Report Submitted',
        'Thank you for bringing this to our attention. Our trust and safety moderation team will review this report promptly.',
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
              if (onSuccess) onSuccess();
            },
          },
        ]
      );
    } catch (err: any) {
      const msg = extractReviewErrorMessage(err);
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [reviewId, isSubmitting, selectedReason, note, onClose, onSuccess]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.backdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityLabel="Dismiss report dialog"
          />

          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.headerTitleRow}>
                <View style={styles.flagIconCircle}>
                  <Flag size={16} color={colors.textDanger} strokeWidth={2.4} />
                </View>
                <Text style={styles.title}>Report Review</Text>
              </View>

              <Pressable
                onPress={onClose}
                hitSlop={8}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scrollArea}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.subtitle}>
                Why are you reporting this review? We investigate all reports against our community standards.
              </Text>

              {/* Reasons list */}
              <View style={styles.reasonsList}>
                {REPORT_REASON_KEYS.map((key) => {
                  const meta = REPORT_REASONS[key];
                  const isSelected = selectedReason === key;

                  return (
                    <Pressable
                      key={key}
                      onPress={() => setSelectedReason(key)}
                      style={({ pressed }) => [
                        styles.reasonRow,
                        isSelected && styles.reasonRowSelected,
                        pressed && styles.reasonRowPressed,
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`${meta.label}: ${meta.description}`}
                    >
                      <View style={styles.radioCircle}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>

                      <View style={styles.reasonTextWrap}>
                        <Text style={[styles.reasonLabel, isSelected && styles.reasonLabelSelected]}>
                          {meta.label}
                        </Text>
                        <Text style={styles.reasonDesc}>{meta.description}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Additional Details Textarea */}
              <View style={styles.noteContainer}>
                <Text style={styles.noteTitle}>Additional details (optional)</Text>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Provide context or specifics to help our moderation team..."
                  placeholderTextColor={colors.textSecondary}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{note.length} / 500</Text>
              </View>

              {/* Error banner */}
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}
            </ScrollView>

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <Pressable
                style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
                onPress={onClose}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.submitBtn,
                  isSubmitting && styles.submitBtnDisabled,
                  pressed && !isSubmitting && styles.btnPressed,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Submit Report"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Report</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bottomSheetBackground,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray100,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flagIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.h4,
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    marginTop: spacing.sm,
  },
  subtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.dataSM,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  reasonsList: {
    gap: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.bgApp,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  reasonRowSelected: {
    borderColor: colors.primary,
    backgroundColor: palette.green50,
  },
  reasonRowPressed: {
    opacity: 0.8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: palette.gray400,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: 12,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  reasonTextWrap: {
    flex: 1,
  },
  reasonLabel: {
    fontFamily: fontFamily.poppins.medium,
    fontSize: fontSize.body2,
    color: colors.textPrimary,
  },
  reasonLabelSelected: {
    color: colors.primaryDark,
    fontFamily: fontFamily.poppins.semiBold,
  },
  reasonDesc: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.dataSM,
    color: colors.textSecondary,
    marginTop: 2,
  },
  noteContainer: {
    marginTop: spacing.md,
  },
  noteTitle: {
    fontFamily: fontFamily.poppins.medium,
    fontSize: fontSize.dataSM,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  noteInput: {
    backgroundColor: colors.bgApp,
    borderRadius: radius.md,
    padding: 12,
    height: 80,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.body2,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  charCount: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: palette.dangerLight,
    padding: 10,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  errorText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.dataSM,
    color: colors.textDanger,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: fontSize.body2,
    color: colors.textSecondary,
  },
  submitBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.textDanger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  btnPressed: {
    opacity: 0.8,
  },
  submitBtnText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body2,
    color: '#FFFFFF',
  },
});
