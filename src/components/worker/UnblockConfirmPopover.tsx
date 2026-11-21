import { AppDialog } from '../feedback/AppDialog';

export interface UnblockConfirmPopoverProps {
  visible: boolean;
  workerName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/** Confirm unblocking a worker, on the shared centred dialog. */
export const UnblockConfirmPopover: React.FC<UnblockConfirmPopoverProps> = ({
  visible,
  workerName,
  onConfirm,
  onCancel,
  isLoading = false,
}) => (
  <AppDialog
    visible={visible}
    tone="confirm"
    title={`Unblock ${workerName}?`}
    message="They will show up in your search again and can get your booking requests."
    onRequestClose={onCancel}
    dismissOnBackdropPress
    actions={[
      { label: 'Cancel', onPress: onCancel, variant: 'secondary', disabled: isLoading },
      {
        label: 'Unblock',
        onPress: onConfirm,
        variant: 'primary',
        loading: isLoading,
        accessibilityLabel: `Confirm unblocking ${workerName}`,
      },
    ]}
  />
);
