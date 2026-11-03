import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AlertTriangle } from 'lucide-react-native';
import { colors, palette, fontFamily, fontSize, radius, spacing, shadows } from '../../design';

export interface DeleteAccountConfirmStepProps {
  onConfirmDelete: () => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
}

export const DeleteAccountConfirmStep: React.FC<DeleteAccountConfirmStepProps> = ({
  onConfirmDelete,
  onBack,
  isLoading = false,
}) => {
  const [confirmInput, setConfirmInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const shakeTranslateX = useSharedValue(0);

  const isMatched = confirmInput.trim() === 'DELETE';

  const triggerShake = () => {
    shakeTranslateX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-4, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };

  const animatedShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeTranslateX.value }],
  }));

  const handleDeletePress = async () => {
    if (!isMatched) {
      triggerShake();
      setErrorMsg('Please type DELETE exactly in uppercase to confirm.');
      return;
    }

    if (isLoading) return;

    try {
      setErrorMsg(null);
      await onConfirmDelete();
    } catch (err: any) {
      triggerShake();
      setErrorMsg(err?.message || 'Something went wrong. Your account has not been deleted.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title} maxFontSizeMultiplier={1.3}>
        Delete Account
      </Text>

      {/* Warning Box */}
      <View style={styles.warningBox}>
        <AlertTriangle size={20} color={colors.dangerMedium} style={styles.warningIcon} />
        <View style={styles.warningTextContainer}>
          <Text style={styles.warningTitle}>This action is permanent and irreversible</Text>
          <Text style={styles.warningBody}>
            Your profile, saved addresses, payment methods, and reviews will be permanently deleted. Past invoices and transactional records are retained solely for tax & legal compliance.
          </Text>
        </View>
      </View>

      {/* Confirmation Input Field */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel} maxFontSizeMultiplier={1.2}>
          TO CONFIRM, TYPE <Text style={styles.inputLabelBold}>DELETE</Text> BELOW:
        </Text>

        <Animated.View style={animatedShakeStyle}>
          <TextInput
            style={[
              styles.textInput,
              isMatched && styles.textInputMatched,
              Boolean(errorMsg) && styles.textInputError,
            ]}
            value={confirmInput}
            onChangeText={(text) => {
              setConfirmInput(text);
              setErrorMsg(null);
            }}
            placeholder="Type DELETE to confirm"
            placeholderTextColor={palette.gray400}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isLoading}
          />
        </Animated.View>

        {errorMsg && (
          <Text style={styles.errorText} maxFontSizeMultiplier={1.2}>
            {errorMsg}
          </Text>
        )}
      </View>

      {/* Buttons */}
      <View style={styles.actionsBox}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleDeletePress}
          style={[styles.deleteBtn, !isMatched && styles.deleteBtnMuted]}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityState={{ disabled: !isMatched }}
          accessibilityLabel="Permanently Delete My Account"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={palette.white} />
          ) : (
            <Text style={styles.deleteBtnText}>Permanently Delete My Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onBack}
          style={styles.backBtn}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel="Go back to reason step"
        >
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
  },
  title: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: palette.red200,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  warningIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
    flexShrink: 0,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 13,
    color: palette.red800,
    marginBottom: 4,
  },
  warningBody: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    lineHeight: 17,
    color: palette.red700,
  },
  inputGroup: {
    marginBottom: spacing.xl,
  },
  inputLabel: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: spacing.xs + 2,
  },
  inputLabelBold: {
    fontFamily: fontFamily.jakarta.bold,
    color: colors.dangerMedium,
  },
  textInput: {
    height: 52,
    backgroundColor: palette.iceGray,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: palette.softGray,
    paddingHorizontal: spacing.base,
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.body1,
    color: colors.textPrimary,
  },
  textInputMatched: {
    borderColor: palette.danger,
    backgroundColor: colors.dangerLight,
  },
  textInputError: {
    borderColor: palette.danger,
  },
  errorText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 12,
    color: palette.danger,
    marginTop: 4,
  },
  actionsBox: {
    gap: spacing.xs,
  },
  deleteBtn: {
    height: 52,
    backgroundColor: palette.danger,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  deleteBtnMuted: {
    backgroundColor: palette.red300,
  },
  deleteBtnText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body1,
    color: palette.white,
  },
  backBtn: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
