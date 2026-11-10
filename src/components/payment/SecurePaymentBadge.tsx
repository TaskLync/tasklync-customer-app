import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lock, ShieldCheck } from 'lucide-react-native';
import { fontFamily } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export const SecurePaymentBadge: React.FC = () => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <View style={styles.badgeRow}>
        <Lock size={12} color={colors.primaryDark} strokeWidth={2.4} />
        <Text style={styles.badgeText}>
          256-Bit Bank-Grade Encryption • Escrow Protected
        </Text>
      </View>
      <Text style={styles.subtext}>
        Your payment details are never stored unencrypted. Cancel anytime before job start.
      </Text>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 11,
    lineHeight: 16,
    color: colors.primaryDark,
  },
  subtext: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
