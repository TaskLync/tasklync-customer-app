import { FC } from 'react';
import { StyleSheet, View, Text, Modal, Pressable, Platform } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { typography } from '../../design/typography';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface WorkerConflictModalProps {
  visible: boolean;
  onCancel: () => void;
  onReplace: () => void;
  currentWorkerName?: string | undefined;
  incomingWorkerName?: string | undefined;
}

export const WorkerConflictModal: FC<WorkerConflictModalProps> = ({
  visible,
  onCancel,
  onReplace,
  currentWorkerName = 'your current worker',
  incomingWorkerName = 'another worker',
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const handleCancel = () => {
    onCancel();
  };

  const handleReplace = () => {
    onReplace();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialogCard}>
          <View style={styles.iconCircle}>
            <AlertTriangle size={24} color={colors.warningMedium} />
          </View>

          {/* Poppins for dialog title */}
          <Text style={styles.titleText}>Start a new cart?</Text>

          {/* Plus Jakarta Sans for helper copy */}
          <Text style={styles.bodyText}>
            Your cart already contains services from <Text style={styles.boldName}>{currentWorkerName}</Text>.
            Adding services from <Text style={styles.boldName}>{incomingWorkerName}</Text> will replace your existing cart items.
          </Text>

          {/* Hick's Law: Exactly 2 clear choices */}
          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelPressed]}
              onPress={handleCancel}
              hitSlop={6}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.replaceButton, pressed && styles.replacePressed]}
              onPress={handleReplace}
              hitSlop={6}
            >
              <Text style={styles.replaceText}>Start new cart</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.modalBackground,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  titleText: {
    fontFamily: typography.fontFamily.poppins.bold, // Poppins font
    fontSize: typography.fontSize.h4,
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  bodyText: {
    fontFamily: typography.fontFamily.jakarta.regular, // Plus Jakarta Sans body
    fontSize: typography.fontSize.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  boldName: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    color: colors.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelPressed: {
    backgroundColor: colors.bgSection,
  },
  cancelText: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: typography.fontSize.caption,
    color: colors.textSecondary,
  },
  replaceButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replacePressed: {
    backgroundColor: colors.primaryDark,
  },
  replaceText: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: typography.fontSize.caption,
    color: colors.textOnGreen,
  },
});
