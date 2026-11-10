import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { X, Smartphone, CreditCard, Check } from 'lucide-react-native';
import { BottomSheet, BottomSheetScrollView } from '../layout/BottomSheet';
import { AddPaymentMethodType, AddWalletDTO, AddCardDTO } from '../../types/payment.types';
import { SecurePaymentNotice } from './SecurePaymentNotice';
import { fontFamily, fontSize, radius, spacing, shadows } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface AddCardSheetProps {
  visible: boolean;
  onClose: () => void;
  onAddWallet: (dto: AddWalletDTO) => Promise<any>;
  onAddCard: (dto: AddCardDTO) => Promise<any>;
  isLoading?: boolean;
}

export const AddCardSheet: React.FC<AddCardSheetProps> = ({
  visible,
  onClose,
  onAddWallet,
  onAddCard,
  isLoading = false,
}) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [selectedType, setSelectedType] = useState<AddPaymentMethodType>('jazzcash');

  // Wallet fields
  const [walletPhone, setWalletPhone] = useState<string>('');
  const [walletTitle, setWalletTitle] = useState<string>('');

  // Card fields
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvc, setCardCvc] = useState<string>('');
  const [cardName, setCardName] = useState<string>('');

  // Options
  const [isDefault, setIsDefault] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = () => {
    setWalletPhone('');
    setWalletTitle('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvc('');
    setCardName('');
    setErrorMsg(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Card input formatters
  const handleCardNumberChange = (text: string) => {
    const raw = text.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);
    setErrorMsg(null);
  };

  const handleExpiryChange = (text: string) => {
    const raw = text.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2, 4)}`);
    } else {
      setCardExpiry(raw);
    }
    setErrorMsg(null);
  };

  const handleCvcChange = (text: string) => {
    const raw = text.replace(/\D/g, '').slice(0, 4);
    setCardCvc(raw);
    setErrorMsg(null);
  };

  const handlePhoneChange = (text: string) => {
    const raw = text.replace(/\D/g, '').slice(0, 11);
    setWalletPhone(raw);
    setErrorMsg(null);
  };

  // Validation
  const isWalletValid =
    walletPhone.length === 11 &&
    walletPhone.startsWith('03') &&
    walletTitle.trim().length >= 3;

  const isCardValid =
    cardNumber.replace(/\s/g, '').length >= 15 &&
    cardExpiry.length === 5 &&
    cardCvc.length >= 3 &&
    cardName.trim().length >= 3;

  const isValid = selectedType === 'card' ? isCardValid : isWalletValid;

  const handleSubmit = async () => {
    if (!isValid || isLoading) return;

    try {
      if (selectedType === 'jazzcash' || selectedType === 'easypaisa') {
        await onAddWallet({
          provider: selectedType,
          accountNumber: walletPhone.trim(),
          accountTitle: walletTitle.trim(),
          isDefault,
        });
      } else {
        const [expM, expY] = cardExpiry.split('/').map((s) => parseInt(s, 10));
        await onAddCard({
          cardNumber: cardNumber.replace(/\s/g, ''),
          expMonth: expM || 12,
          expYear: expY ? 2000 + expY : 2028,
          cvc: cardCvc.trim(),
          cardholderName: cardName.trim(),
          isDefault,
        });
      }

      handleClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to add payment method. Please check details.');
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      snapPoints={['80%', '92%']}
      contentPadding={true}
    >
      <View style={styles.sheetContent}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Add Payment Method</Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close sheet"
          >
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
            {/* Online Methods Disabled Notice */}
            <View style={styles.disabledNoticeBox}>
              <Text style={styles.disabledNoticeTitle}>Online Gateways Temporarily Offline</Text>
              <Text style={styles.disabledNoticeText}>
                TaskLync is currently operating exclusively on Cash on Delivery (COD). Adding online payment methods is temporarily paused.
              </Text>
            </View>

            {/* Method Type Selector Segment */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.typeTab,
                  selectedType === 'jazzcash' && styles.typeTabActive,
                ]}
                onPress={() => {
                  setSelectedType('jazzcash');
                }}
              >
                <Smartphone
                  size={15}
                  color={selectedType === 'jazzcash' ? colors.primaryDark : colors.textMuted}
                />
                <Text
                  style={[
                    styles.typeTabText,
                    selectedType === 'jazzcash' && styles.typeTabTextActive,
                  ]}
                >
                  JazzCash
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.typeTab,
                  selectedType === 'easypaisa' && styles.typeTabActive,
                ]}
                onPress={() => {
                  setSelectedType('easypaisa');
                }}
              >
                <Smartphone
                  size={15}
                  color={selectedType === 'easypaisa' ? colors.primaryDark : colors.textMuted}
                />
                <Text
                  style={[
                    styles.typeTabText,
                    selectedType === 'easypaisa' && styles.typeTabTextActive,
                  ]}
                >
                  EasyPaisa
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.typeTab,
                  selectedType === 'card' && styles.typeTabActive,
                ]}
                onPress={() => {
                  setSelectedType('card');
                }}
              >
                <CreditCard
                  size={15}
                  color={selectedType === 'card' ? colors.primaryDark : colors.textMuted}
                />
                <Text
                  style={[
                    styles.typeTabText,
                    selectedType === 'card' && styles.typeTabTextActive,
                  ]}
                >
                  Debit/Credit
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Banner */}
            {errorMsg && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* Form Fields: JazzCash / EasyPaisa */}
            {(selectedType === 'jazzcash' || selectedType === 'easypaisa') && (
              <View style={styles.fieldsGroup}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {selectedType === 'jazzcash' ? 'JAZZCASH' : 'EASYPAISA'} MOBILE NUMBER
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={walletPhone}
                    onChangeText={handlePhoneChange}
                    placeholder="03001234567"
                    placeholderTextColor={palette.gray400}
                    keyboardType="phone-pad"
                    maxLength={11}
                  />
                  <Text style={styles.hintText}>Enter your 11-digit registered mobile wallet number</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>ACCOUNT TITLE / NAME</Text>
                  <TextInput
                    style={styles.textInput}
                    value={walletTitle}
                    onChangeText={(t) => {
                      setWalletTitle(t);
                      setErrorMsg(null);
                    }}
                    placeholder="e.g. Muhammad Uzair"
                    placeholderTextColor={palette.gray400}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            {/* Form Fields: Card */}
            {selectedType === 'card' && (
              <View style={styles.fieldsGroup}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CARDHOLDER NAME</Text>
                  <TextInput
                    style={styles.textInput}
                    value={cardName}
                    onChangeText={(t) => {
                      setCardName(t);
                      setErrorMsg(null);
                    }}
                    placeholder="e.g. Uzair Ahmed"
                    placeholderTextColor={palette.gray400}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CARD NUMBER</Text>
                  <TextInput
                    style={styles.textInput}
                    value={cardNumber}
                    onChangeText={handleCardNumberChange}
                    placeholder="4532 •••• •••• 8888"
                    placeholderTextColor={palette.gray400}
                    keyboardType="number-pad"
                    maxLength={19}
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.half]}>
                    <Text style={styles.inputLabel}>EXPIRY (MM/YY)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={cardExpiry}
                      onChangeText={handleExpiryChange}
                      placeholder="08/28"
                      placeholderTextColor={palette.gray400}
                      keyboardType="number-pad"
                      maxLength={5}
                    />
                  </View>

                  <View style={[styles.inputGroup, styles.half]}>
                    <Text style={styles.inputLabel}>CVC / CVV</Text>
                    <TextInput
                      style={styles.textInput}
                      value={cardCvc}
                      onChangeText={handleCvcChange}
                      placeholder="123"
                      placeholderTextColor={palette.gray400}
                      keyboardType="number-pad"
                      secureTextEntry
                      maxLength={4}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Save as Default Checkbox */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.checkboxRow}
              onPress={() => {
                setIsDefault(!isDefault);
              }}
            >
              <View style={[styles.checkbox, isDefault && styles.checkboxActive]}>
                {isDefault && <Check size={14} color={palette.pureWhite} strokeWidth={3} />}
              </View>
              <Text style={styles.checkboxLabel}>Set as default payment method</Text>
            </TouchableOpacity>

            {/* Trust Notice */}
            <View style={styles.noticeContainer}>
              <SecurePaymentNotice />
            </View>

            {/* Submit Button (Permanently disabled while online platforms are inactive) */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.submitBtn, styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={true}
              accessibilityRole="button"
              accessibilityLabel="Online payment methods disabled"
            >
              <Text style={styles.submitBtnText}>Online Registration Disabled</Text>
            </TouchableOpacity>
          </BottomSheetScrollView>
      </View>
    </BottomSheet>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  sheetContent: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.h3,
    color: colors.textPrimary,
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
    paddingBottom: spacing.md,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: palette.iceGray,
    borderRadius: radius.pill,
    padding: 3,
    marginBottom: spacing.md,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    borderRadius: radius.pill,
    gap: 4,
  },
  typeTabActive: {
    backgroundColor: colors.bgCard,
    ...shadows.xs,
  },
  typeTabText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.micro + 1,
    color: colors.textMuted,
  },
  typeTabTextActive: {
    fontFamily: fontFamily.jakarta.bold,
    color: colors.primaryDark,
  },
  errorBanner: {
    backgroundColor: palette.dangerLight,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 12,
    color: palette.danger,
    textAlign: 'center',
  },
  fieldsGroup: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  inputGroup: {
    gap: 4,
  },
  half: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inputLabel: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 10.5,
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  textInput: {
    height: 48,
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.softGray,
    paddingHorizontal: 14,
    fontFamily: fontFamily.inter.medium,
    fontSize: fontSize.body2 + 1,
    color: colors.textPrimary,
  },
  hintText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 11,
    color: palette.gray400,
    marginTop: 2,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: palette.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.body2,
    color: colors.textPrimary,
  },
  noticeContainer: {
    marginVertical: spacing.md,
  },
  submitBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    ...shadows.sm,
  },
  submitBtnDisabled: {
    backgroundColor: palette.gray300,
  },
  submitBtnText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body1,
    color: colors.textOnGreen,
  },
  disabledNoticeBox: {
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: palette.amber200,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  disabledNoticeTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 13,
    color: palette.amber800,
    marginBottom: 2,
  },
  disabledNoticeText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    lineHeight: 16,
    color: palette.amber900,
  },
});
