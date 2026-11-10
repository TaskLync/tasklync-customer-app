import { FC } from 'react';
import { StyleSheet, Text } from 'react-native';
import { typography } from '../../design/typography';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export const EscrowNote: FC = () => {
  const styles = useThemedStyles(createStyles);
  return (
    <Text style={styles.text}>
      Payment is held in escrow and released after job completion.
    </Text>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  text: {
    marginTop: 10,
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
});