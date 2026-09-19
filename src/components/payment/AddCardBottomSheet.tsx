import { forwardRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BottomSheet, BottomSheetRef } from '../layout/BottomSheet/BottomSheet';
import { CardInputForm } from './CardInputForm';
import { SaveCardCheckbox } from './SaveCardCheckbox';
import { colors, palette, fontFamily } from '../../design';

export interface AddCardBottomSheetProps {
  onAddCard: (cardDetails: any) => void;
}

export const AddCardBottomSheet = forwardRef<BottomSheetRef, AddCardBottomSheetProps>(
  ({ onAddCard }, ref) => {
    const [cardDetails, setCardDetails] = useState<any>(null);
    const [isComplete, setIsComplete] = useState<boolean>(false);
    const [saveCard, setSaveCard] = useState<boolean>(true);

    const handleFormChange = (complete: boolean, details: any) => {
      setIsComplete(complete);
      setCardDetails(details);
    };

    const handleSave = () => {
      if (!isComplete) return;

      const newMethod = {
        id: `pm_new_${Date.now()}`,
        brand: cardDetails?.cardNumber?.startsWith('5') ? 'mastercard' : 'visa',
        last4: cardDetails?.cardNumber?.slice(-4) || '4242',
        expMonth: parseInt(cardDetails?.expiry?.split('/')[0] || '12', 10),
        expYear: 2000 + parseInt(cardDetails?.expiry?.split('/')[1] || '28', 10),
        isDefault: Boolean(saveCard),
        holderName: cardDetails?.name || 'Primary Card',
      };

      onAddCard(newMethod);

      // Close bottom sheet
      if (ref && 'current' in ref && ref.current) {
        ref.current.close();
      }
    };

    return (
      <BottomSheet ref={ref} contentPadding={true}>
        <View style={styles.header}>
          <Text style={styles.title}>Add New Card</Text>
          <Text style={styles.subtitle}>
            Enter your card details for instant & secure payments.
          </Text>
        </View>

        {/* Card Form */}
        <CardInputForm onCardChange={handleFormChange} />

        {/* Save Card Checkbox */}
        <SaveCardCheckbox checked={saveCard} onToggle={setSaveCard} />

        {/* Submit Action Button */}
        <Pressable
          onPress={handleSave}
          disabled={!isComplete}
          style={({ pressed }) => [
            styles.submitButton,
            !isComplete && styles.submitDisabled,
            pressed && isComplete && styles.submitPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Add card and select as payment method"
        >
          <Text style={styles.submitText}>Add & Use Card</Text>
        </Pressable>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  header: {
    marginBottom: 14,
  },
  title: {
    fontFamily: fontFamily.poppins.bold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 2,
  },
  submitButton: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  submitDisabled: {
    backgroundColor: palette.gray300,
    opacity: 0.7,
  },
  submitPressed: {
    opacity: 0.9,
  },
  submitText: {
    fontFamily: fontFamily.poppins.bold,
    fontSize: 15,
    color: palette.white,
  },
});
