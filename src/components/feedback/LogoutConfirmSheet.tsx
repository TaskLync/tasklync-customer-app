import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  ActionSheetIOS,
  ActivityIndicator,
} from 'react-native';
import { LogOut } from 'lucide-react-native';
import { fontFamily, fontSize, radius, spacing, shadows } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface LogoutConfirmSheetProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Platform-aware helper to trigger iOS native ActionSheet
 */
export function showNativeLogoutActionSheet(
  onConfirm: () => void,
  onCancel?: () => void
) {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Log Out',
        message: 'Are you sure you want to log out of your account?',
        options: ['Cancel', 'Log Out'],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 0,
      },
      (buttonIndex) => {
        if (buttonIndex === 1) {
          onConfirm();
        } else if (onCancel) {
          onCancel();
        }
      }
    );
    return true;
  }
  return false;
}

export const LogoutConfirmSheet: React.FC<LogoutConfirmSheetProps> = ({
  visible,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.dismissOverlay}
          activeOpacity={1}
          onPress={onCancel}
        />

        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <LogOut size={24} color={palette.danger} />
          </View>

          <Text style={styles.title} maxFontSizeMultiplier={1.3}>
            Log Out
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
            Are you sure you want to log out of your account?
          </Text>

          <View style={styles.actions}>
            {/* Destructive Log Out CTA */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.btn, styles.logoutBtn]}
              onPress={onConfirm}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Confirm Log Out"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={palette.pureWhite} />
              ) : (
                <Text style={styles.logoutBtnText}>Log Out</Text>
              )}
            </TouchableOpacity>

            {/* Neutral Cancel CTA */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.btn, styles.cancelBtn]}
              onPress={onCancel}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Cancel Log Out"
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
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
  dismissOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.bottomSheetBackground,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    zIndex: 10,
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
    fontSize: fontSize.h3,
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
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
  btn: {
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    backgroundColor: palette.danger,
  },
  logoutBtnText: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: fontSize.body2 + 1,
    color: palette.pureWhite,
  },
  cancelBtn: {
    backgroundColor: palette.gray100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: fontSize.body2 + 1,
    color: colors.textPrimary,
  },
});
