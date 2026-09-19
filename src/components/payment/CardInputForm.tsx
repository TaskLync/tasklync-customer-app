import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { CreditCard, Calendar, Lock } from 'lucide-react-native';
import { colors, palette, fontFamily } from '../../design';

export interface CardInputFormProps {
  onCardChange?: (complete: boolean, details: any) => void;
}

export const CardInputForm: React.FC<CardInputFormProps> = ({ onCardChange }) => {
  const [cardNumber, setCardNumber] = useState<string>('');
  const [expiry, setExpiry] = useState<string>('');
  const [cvc, setCvc] = useState<string>('');
  const [name, setName] = useState<string>('');

  const handleCardNumberChange = (text: string) => {
    const formatted = text.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
    setCardNumber(formatted);
    notifyChange(formatted, expiry, cvc, name);
  };

  const handleExpiryChange = (text: string) => {
    const clean = text.replace(/\D/g, '');
    let formatted = clean;
    if (clean.length >= 2) {
      formatted = `${clean.slice(0, 2)}/${clean.slice(2, 4)}`;
    }
    setExpiry(formatted.slice(0, 5));
    notifyChange(cardNumber, formatted, cvc, name);
  };

  const handleCvcChange = (text: string) => {
    const clean = text.replace(/\D/g, '').slice(0, 4);
    setCvc(clean);
    notifyChange(cardNumber, expiry, clean, name);
  };

  const handleNameChange = (text: string) => {
    setName(text);
    notifyChange(cardNumber, expiry, cvc, text);
  };

  const notifyChange = (cn: string, exp: string, c: string, n: string) => {
    if (onCardChange) {
      const isComplete = cn.replace(/\s/g, '').length === 16 && exp.length === 5 && c.length >= 3;
      onCardChange(isComplete, { cardNumber: cn, expiry: exp, cvc: c, name: n });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.formTitle}>Enter Card Details</Text>

      {/* Cardholder Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>CARDHOLDER NAME</Text>
        <TextInput
          style={styles.textInput}
          value={name}
          onChangeText={handleNameChange}
          placeholder="e.g. Uzair Ahmed"
          placeholderTextColor={palette.gray400}
          autoCapitalize="words"
        />
      </View>

      {/* Card Number */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>CARD NUMBER</Text>
        <View style={styles.iconInputRow}>
          <CreditCard size={18} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.textInputWithIcon}
            value={cardNumber}
            onChangeText={handleCardNumberChange}
            placeholder="4532 •••• •••• 8888"
            placeholderTextColor={palette.gray400}
            keyboardType="number-pad"
            maxLength={19}
          />
        </View>
      </View>

      {/* Expiry & CVC Row */}
      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.inputLabel}>EXPIRY DATE</Text>
          <View style={styles.iconInputRow}>
            <Calendar size={16} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.textInputWithIcon}
              value={expiry}
              onChangeText={handleExpiryChange}
              placeholder="MM/YY"
              placeholderTextColor={palette.gray400}
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
        </View>

        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.inputLabel}>CVC / CVV</Text>
          <View style={styles.iconInputRow}>
            <Lock size={16} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.textInputWithIcon}
              value={cvc}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.gray200,
    padding: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  formTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  halfWidth: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputLabel: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: palette.iceGray,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.softGray,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fontFamily.inter.medium,
    fontSize: 14,
    color: colors.textPrimary,
  },
  iconInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.iceGray,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.softGray,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInputWithIcon: {
    flex: 1,
    paddingVertical: 10,
    fontFamily: fontFamily.inter.medium,
    fontSize: 14,
    color: colors.textPrimary,
  },
});
