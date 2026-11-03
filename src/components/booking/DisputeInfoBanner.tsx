import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldAlert } from 'lucide-react-native';
import { palette, fontFamily, fontSize, radius, spacing, colors } from '../../design';

export interface DisputeInfoBannerProps {
  title?: string;
  subtitle?: string;
}

/**
 * DisputeInfoBanner Component
 *
 * Implements Zero-Anxiety Design:
 * - Placed structurally first at the top of the dispute flow
 * - Sets calm, transparent expectations before asking for complaint input
 * - Reassures that funds remain protected in escrow
 */
export const DisputeInfoBanner: React.FC<DisputeInfoBannerProps> = ({
  title = "We're here to help protect your booking",
  subtitle = 'Disputes are reviewed by our Trust & Safety team within 24 hours. Your payment remains safely locked in escrow while we investigate.',
}) => {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <View style={styles.iconCircle}>
        <ShieldAlert size={20} color={palette.infoDark} />
      </View>

      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: palette.infoLight,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderInfoLight, // Soft info border
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.blue100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 4,
    marginTop: 2,
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body2 + 0.5,
    color: palette.infoDark,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.caption,
    color: '#1E3A8A',
    lineHeight: 18,
  },
});
