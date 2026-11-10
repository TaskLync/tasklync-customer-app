import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { fontFamily, fontSize, radius, spacing, shadows } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface LogoutConfirmDialogProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * LogoutConfirmDialog Component (Day 35 Hard Problem #5)
 *
 * Implements Lightweight Confirmation:
 * - Clear distinction from destructive delete account
 * - Reassures user that logging back in is simple
 */
export const LogoutConfirmDialog: React.FC<LogoutConfirmDialogProps> = ({
  visible,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <LogOut size={24} color={colors.textDanger} />
          </View>

          <Text style={styles.title}>Log Out?</Text>
          <Text style={styles.subtitle}>
            Are you sure you want to sign out? You can log back into your account anytime with your phone number.
          </Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.btn, styles.cancelBtn]}
              onPress={onCancel}
              disabled={isLoading}
            >
              <Text style={styles.cancelBtnText}>Stay Signed In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.btn, styles.logoutBtn]}
              onPress={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={palette.pureWhite} />
              ) : (
                <Text style={styles.logoutBtnText}>Log Out</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.modalBackground,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.lg,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.h4 + 1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: palette.gray100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: fontSize.caption + 1,
    color: colors.textPrimary,
  },
  logoutBtn: {
    backgroundColor: colors.textDanger,
  },
  logoutBtnText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.caption + 1,
    color: palette.pureWhite,
  },
});
