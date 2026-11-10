import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fontFamily } from '../../design';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export const DefaultAddressBadge: React.FC = () => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.badge} accessibilityLabel="Default address">
      <Text style={styles.badgeText} maxFontSizeMultiplier={1.3}>
        Default
      </Text>
    </View>
  );
};

const createStyles = ({ palette }: AppTheme) => StyleSheet.create({
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
