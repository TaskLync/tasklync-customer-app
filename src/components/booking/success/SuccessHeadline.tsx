import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors, fontFamily } from '../../../design';

export interface SuccessHeadlineProps {
  title?: string;
}

export const SuccessHeadline: React.FC<SuccessHeadlineProps> = ({
  title = 'Booking Confirmed!',
}) => (
  <Text style={styles.headline} accessibilityRole="header">
    {title}
  </Text>
);

const styles = StyleSheet.create({
  headline: {
    fontFamily: fontFamily.poppins.bold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
