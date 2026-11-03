import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Trash2, X, AlertTriangle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, palette, fontFamily, fontSize, radius, spacing, shadows } from '../../design';

export interface DeleteAccountModalProps {
  visible: boolean;
  onConfirmDelete: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

const CONFIRMATION_KEYWORD = 'DELETE';

/**
 * DeleteAccountModal Component (Day 35 Hard Problem #3)
 *
 * Implements High-Friction Typed Confirmation:
 * - Requires typing "DELETE" before destructive button enables
 * - Explains permanent data loss consequences explicitly
 * - Distinct pattern from lightweight booking cancellation
 */
export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  onConfirmDelete,
  onClose,
  isLoading = false,
}) => {
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState<string>('');

  const isConfirmed = inputText.trim().toUpperCase() === CONFIRMATION_KEYWORD;

  const handleConfirm = () => {
    if (!isConfirmed || isLoading) return;
    onConfirmDelete();
  };

  const handleClose = () => {
    if (isLoading) return;
    setInputText('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom > 0 ? insets.bottom + 18 : 28 },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <AlertTriangle size={22} color={colors.textDanger} />
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              disabled={isLoading}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Delete Account Permanently?</Text>

          {/* Consequence Copy */}
          <Text style={styles.consequenceText}>
            This action is <Text style={styles.boldText}>permanent and irreversible</Text>. All your active bookings, past receipts, chat histories, and saved addresses will be deleted immediately.
          </Text>

          {/* Typed Confirmation Gate */}
          <View style={styles.inputSection}>
            <Text style={styles.instructionText}>
              To confirm, please type <Text style={styles.keywordHighlight}>{CONFIRMATION_KEYWORD}</Text> below:
            </Text>
            <TextInput
              style={[
                styles.textInput,
                isConfirmed && styles.textInputConfirmed,
              ]}
              placeholder={`Type "${CONFIRMATION_KEYWORD}"`}
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsCol}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.deleteBtn,
                !isConfirmed && styles.deleteBtnDisabled,
                isLoading && styles.deleteBtnLoading,
              ]}
              onPress={handleConfirm}
              disabled={!isConfirmed || isLoading}
              accessibilityRole="button"
              accessibilityLabel="Permanently Delete Account"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={palette.white} />
              ) : (
                <View style={styles.btnRow}>
                  <Trash2 size={18} color={palette.white} />
                  <Text style={styles.deleteBtnText}>Permanently Delete My Account</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.cancelBtn}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelBtnText}>Keep My Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl + 12,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontFamily: fontFamily.poppins.bold,
    fontSize: fontSize.h3 - 1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  consequenceText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.body2,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  boldText: {
    fontFamily: fontFamily.jakarta.bold,
    color: colors.textDanger,
  },
  inputSection: {
    backgroundColor: palette.gray50,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  instructionText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs + 2,
  },
  keywordHighlight: {
    fontFamily: fontFamily.inter.bold,
    color: colors.textDanger,
    letterSpacing: 0.5,
  },
  textInput: {
    height: 48,
    backgroundColor: colors.bgCard,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    fontFamily: fontFamily.inter.semiBold,
    fontSize: fontSize.body1,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 2,
  },
  textInputConfirmed: {
    borderColor: colors.textDanger,
    backgroundColor: '#FEF2F2',
  },
  actionsCol: {
    gap: spacing.sm,
  },
  deleteBtn: {
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.textDanger,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.textDanger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  deleteBtnDisabled: {
    backgroundColor: palette.gray300,
    shadowOpacity: 0,
    elevation: 0,
  },
  deleteBtnLoading: {
    opacity: 0.8,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtnText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body1 - 1,
    color: palette.white,
  },
  cancelBtn: {
    height: 50,
    borderRadius: radius.pill,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: fontSize.body2 + 0.5,
    color: colors.textPrimary,
  },
});
