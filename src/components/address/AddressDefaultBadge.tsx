import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fontFamily } from '../../design';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export const AddressDefaultBadge: React.FC = () => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>Default</Text>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  badge: {
    marginLeft: 8,
  },
  text: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 10,
    lineHeight: 14,
    color: colors.primaryDark,
  },
});
