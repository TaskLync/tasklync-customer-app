import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontFamily } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface PaymentStickyFooterProps {
  total: number;
  loading?: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export const PaymentStickyFooter: React.FC<PaymentStickyFooterProps> = ({
  total,
  loading = false,
  onPress,
  disabled = false,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const displayTotal = total > 0 ? total : 1575;
  const formattedAmount = `Rs. ${displayTotal.toLocaleString()}`;
  const isInteractive = !disabled && !loading;

  const bottomPadding = insets.bottom > 0 ? insets.bottom + 14 : 20;

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      <View style={styles.contentRow}>
        {/* Left Column: Total */}
        <View style={styles.totalCol}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{formattedAmount}</Text>
        </View>

        {/* Right Action: Confirm Booking CTA */}
        <Pressable
          onPress={onPress}
          disabled={!isInteractive}
          style={({ pressed }) => [
            styles.ctaButton,
            !isInteractive && styles.ctaDisabled,
            pressed && isInteractive && styles.ctaPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Confirm Booking for ${formattedAmount}`}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.pureWhite} />
          ) : (
            <Text style={styles.ctaText}>Confirm Booking</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: 20,
    paddingTop: 14,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalCol: {
    justifyContent: 'center',
    marginRight: 16,
  },
  totalLabel: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  totalAmount: {
    fontFamily: fontFamily.inter.bold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.textPrimary,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  ctaButton: {
    backgroundColor: colors.primaryDark,
    height: 50,
    minWidth: 165,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  ctaDisabled: {
    backgroundColor: colors.textMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.pureWhite,
    letterSpacing: -0.2,
  },
});
