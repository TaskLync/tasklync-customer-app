import { FC } from 'react';
import { StyleSheet, Text } from 'react-native';
import { AppDialog } from '../feedback/AppDialog';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface WorkerConflictModalProps {
  visible: boolean;
  onCancel: () => void;
  onReplace: () => void;
  currentWorkerName?: string | undefined;
  incomingWorkerName?: string | undefined;
}

/** Cart holds one worker's services: confirm before replacing them with another worker's. */
export const WorkerConflictModal: FC<WorkerConflictModalProps> = ({
  visible,
  onCancel,
  onReplace,
  currentWorkerName = 'your current worker',
  incomingWorkerName = 'another worker',
}) => {
  const styles = useThemedStyles(createStyles);

  return (
    <AppDialog
      visible={visible}
      tone="warning"
      title="Start a new cart?"
      message={
        <Text style={styles.body} maxFontSizeMultiplier={1.3}>
          Your cart has services from <Text style={styles.name}>{currentWorkerName}</Text>. Adding services
          from <Text style={styles.name}>{incomingWorkerName}</Text> will replace them.
        </Text>
      }
      onRequestClose={onCancel}
      dismissOnBackdropPress
      actions={[
        { label: 'Cancel', onPress: onCancel, variant: 'secondary' },
        { label: 'Start new cart', onPress: onReplace, variant: 'primary' },
      ]}
    />
  );
};

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    body: {
      fontFamily: 'PlusJakartaSans-Regular',
      fontSize: 14.5,
      lineHeight: 21,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    name: {
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: colors.textPrimary,
    },
  });
