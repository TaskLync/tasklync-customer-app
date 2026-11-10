import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { fontFamily } from '../../../design';
import { useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

export const AcceptanceWindowBanner: React.FC = () => {
  const styles = useThemedStyles(createStyles);
  return (
    <Text style={styles.text}>
      The provider has 30 minutes to accept. You won&apos;t be charged until they do.
    </Text>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  text: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textSecondary,
    paddingTop: 16,
    marginBottom: 8,
  },
});