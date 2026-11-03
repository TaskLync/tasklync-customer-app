import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Banknote, Check } from 'lucide-react-native';
import { colors, fontFamily } from '../../design';

export interface PaymentMethodSelectCardProps {
  onPress?: () => void;
}

export const PaymentMethodSelectCard: React.FC<PaymentMethodSelectCardProps> = ({
  onPress,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeading}>Payment method</Text>

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        accessibilityRole="radio"
        accessibilityState={{ selected: true }}
        accessibilityLabel="Cash, Pay after service"
      >
        {/* Left Icon */}
        <View style={styles.iconContainer}>
          <Banknote size={22} color={colors.primaryDark} strokeWidth={2} />
        </View>

        {/* Center Details */}
        <View style={styles.detailsCol}>
          <Text style={styles.methodTitle}>Cash</Text>
          <Text style={styles.methodSubtitle}>Pay after service</Text>
        </View>

        {/* Selected Checkmark Indicator */}
        <View style={styles.checkmarkBadge}>
          <Check size={13} color={colors.white} strokeWidth={2.8} />
        </View>
      </Pressable>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  sectionHeading: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSection,
    borderRadius: 14,
    padding: 16,
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.995 }],
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCol: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  methodTitle: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  methodSubtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 2,
  },
  checkmarkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportingMessage: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: 12,
    paddingHorizontal: 4,
  },
});
