import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { fontFamily } from '../../../design';
import { useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

export interface SuccessHeadlineProps {
  title?: string;
}

export const SuccessHeadline: React.FC<SuccessHeadlineProps> = ({
  title = 'Booking Confirmed!',
}) => {
  const styles = useThemedStyles(createStyles);
  return (
  <Text style={styles.headline} accessibilityRole="header">
    {title}
  </Text>
);
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  headline: {
    fontFamily: fontFamily.poppins.bold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
