import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { palette, colors } from '../../design';

interface DeclineQuoteModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}

const PRESET_REASONS = [
  'Price is higher than my budget',
  'Scope does not cover all required tasks',
  'Estimated duration / timing does not suit me',
  'Issue already resolved',
  'Other reason',
];

export function DeclineQuoteModal({
  visible,
  onClose,
  onConfirm,
  isLoading,
}: DeclineQuoteModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedReason, setSelectedReason] = useState(PRESET_REASONS[0]);
  const [customText, setCustomText] = useState('');

  const handleDecline = () => {
    const finalReason =
      selectedReason === 'Other reason'
        ? customText.trim() || 'Other reason'
        : customText.trim()
        ? `${selectedReason}: ${customText.trim()}`
        : selectedReason;

    onConfirm(finalReason);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable
            style={[
              styles.sheet,
              { paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24 },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.headerRow}>
              <Text style={styles.title}>Decline Quote</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={palette.gray400} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.subtitle}>
                Please select a reason for declining. The professional will be notified and can optionally submit a revised quote.
              </Text>

              <View style={styles.reasonsList}>
                {PRESET_REASONS.map((reason) => {
                  const isSelected = selectedReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      style={[styles.reasonItem, isSelected && styles.reasonItemActive]}
                      onPress={() => setSelectedReason(reason)}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={[styles.reasonText, isSelected && styles.reasonTextActive]}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                style={styles.customInput}
                placeholder="Additional feedback or requested price (optional)"
                placeholderTextColor={palette.gray400}
                value={customText}
                onChangeText={setCustomText}
                maxLength={500}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Go Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.declineButton, isLoading && styles.declineButtonDisabled]}
                onPress={handleDecline}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.declineButtonText}>Confirm Decline</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '88%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 17,
    color: palette.gray900,
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: palette.gray500,
    lineHeight: 18,
    marginBottom: 16,
  },
  reasonsList: {
    marginBottom: 14,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    backgroundColor: colors.bgApp,
  },
  reasonItemActive: {
    borderColor: palette.green600,
    backgroundColor: colors.primaryTint,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  radioCircleActive: {
    borderColor: palette.green600,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: palette.green600,
  },
  reasonText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: palette.gray700,
    flex: 1,
  },
  reasonTextActive: {
    color: palette.gray900,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  customInput: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    padding: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: palette.gray900,
    backgroundColor: colors.bgApp,
    minHeight: 70,
    marginBottom: 16,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.bgHover,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: palette.gray700,
  },
  declineButton: {
    flex: 1.3,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: palette.red500,
    alignItems: 'center',
  },
  declineButtonDisabled: {
    opacity: 0.6,
  },
  declineButtonText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    color: colors.white,
  },
});
