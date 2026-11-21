import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldAlertIcon } from '../ui/Icon/icons';
import { fontFamily, fontSize, radius, spacing } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

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
  subtitle = 'Our support team reviews every report within 24 hours and will contact you.',
}) => {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <View style={styles.iconCircle}>
        <ShieldAlertIcon size={20} color={palette.infoDark} />
      </View>

      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
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
    color: colors.infoDark,
    lineHeight: 18,
  },
});
