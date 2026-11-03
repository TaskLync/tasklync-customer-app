import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontFamily } from '../../design';

export const AddressDefaultBadge: React.FC = () => {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>Default</Text>
    </View>
  );
};

const styles = StyleSheet.create({
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
