import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { X, HeartHandshake } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet, BottomSheetScrollView } from '../layout/BottomSheet';
import { DeleteAccountReason } from '../../types/moderation.types';
import { DeleteAccountReasonStep } from './DeleteAccountReasonStep';
import { DeleteAccountConfirmStep } from './DeleteAccountConfirmStep';
import { fontFamily, fontSize, spacing } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface DeleteAccountSheetProps {
  visible: boolean;
  onClose: () => void;
  onDeleteAccount: (reason?: DeleteAccountReason) => Promise<void>;
  isLoading?: boolean;
}

export const DeleteAccountSheet: React.FC<DeleteAccountSheetProps> = ({
  visible,
  onClose,
  onDeleteAccount,
  isLoading = false,
}) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<1 | 2>(1);
  const [chosenReason, setChosenReason] = useState<DeleteAccountReason | undefined>(undefined);
  const [isDeletedSuccess, setIsDeletedSuccess] = useState<boolean>(false);

  const resetAndClose = () => {
    if (isLoading || isDeletedSuccess) return;
    setStep(1);
    setChosenReason(undefined);
    onClose();
  };

  const handleReasonContinue = (reason?: DeleteAccountReason) => {
    setChosenReason(reason);
    setStep(2);
  };

  const handleConfirmDelete = async () => {
    await onDeleteAccount(chosenReason);
    setIsDeletedSuccess(true);
  };

  if (!visible) return null;

  // Peak-End Rule: Calm, respectful goodbye screen before automatic redirect
  if (isDeletedSuccess) {
    return (
      <Modal visible={true} transparent={false} animationType="fade">
        <View
          style={[
            styles.goodbyeContainer,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <View style={styles.goodbyeIconBox}>
            <HeartHandshake size={36} color={palette.gray700} />
          </View>
          <Text style={styles.goodbyeTitle} maxFontSizeMultiplier={1.3}>
            Account Deleted
          </Text>
          <Text style={styles.goodbyeSubtitle} maxFontSizeMultiplier={1.3}>
            Your account has been deleted. We're sorry to see you go and thank you for being a part of Tasklync.
          </Text>
        </View>
      </Modal>
    );
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={isLoading ? undefined : resetAndClose}
      snapPoints={['75%', '92%']}
      contentPadding={true}
    >
      <View style={styles.sheetContent}>
        {/* Close button */}
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={resetAndClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close account deletion sheet"
            disabled={isLoading}
          >
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {step === 1 ? (
            <DeleteAccountReasonStep
              onContinue={handleReasonContinue}
              onSkip={() => setStep(2)}
            />
          ) : (
            <DeleteAccountConfirmStep
              onConfirmDelete={handleConfirmDelete}
              onBack={() => setStep(1)}
              isLoading={isLoading}
            />
          )}
        </BottomSheetScrollView>
      </View>
    </BottomSheet>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  sheetContent: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.xs,
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
    paddingBottom: spacing.base,
  },
  goodbyeContainer: {
    flex: 1,
    backgroundColor: colors.bgApp,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  goodbyeIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.iceGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  goodbyeTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  goodbyeSubtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.body1,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
