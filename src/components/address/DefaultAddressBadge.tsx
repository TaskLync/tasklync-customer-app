import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, fontFamily } from '../../design';

export const DefaultAddressBadge: React.FC = () => {
  return (
    <View style={styles.badge} accessibilityLabel="Default address">
      <Text style={styles.badgeText} maxFontSizeMultiplier={1.3}>
        Default
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'center',
  },
  badgeText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 11,
    lineHeight: 14,
    color: palette.green800,
  },
});
