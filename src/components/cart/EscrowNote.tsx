import { FC } from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../../design/colors';
import { typography } from '../../design/typography';

export const EscrowNote: FC = () => {
  return (
    <Text style={styles.text}>
      Payment is held in escrow and released after job completion.
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    marginTop: 10,
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
});