import { Platform, ActionSheetIOS } from 'react-native';
import { LogoutIcon } from '../ui/Icon/icons';
import { AppDialog } from './AppDialog';
import { useAppTheme } from '../../theme/useAppTheme';

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
        title: 'Log out',
        message: 'Are you sure you want to log out of your account?',
        options: ['Cancel', 'Log out'],
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

/** Android / fallback logout confirmation, built on the shared centred dialog. */
export const LogoutConfirmSheet: React.FC<LogoutConfirmSheetProps> = ({
  visible,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const { colors } = useAppTheme();
  return (
    <AppDialog
      visible={visible}
      icon={<LogoutIcon size={22} color={colors.textDanger} strokeWidth={2} />}
      title="Log out?"
      message="You will need to sign in again to book or chat."
      onRequestClose={onCancel}
      actions={[
        { label: 'Cancel', onPress: onCancel, variant: 'secondary', disabled: isLoading },
        { label: 'Log out', onPress: onConfirm, variant: 'destructive', loading: isLoading },
      ]}
    />
  );
};
