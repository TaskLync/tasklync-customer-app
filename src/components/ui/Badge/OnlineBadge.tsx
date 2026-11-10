import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

interface OnlineBadgeProps {
  status: 'online' | 'busy' | 'offline';
  size?: number;
  style?: ViewStyle;
}

export const OnlineBadge: React.FC<OnlineBadgeProps> = ({
  status,
  size = 10,
  style,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const getStatusColor = () => {
    switch (status) {
      case 'online': return colors.online; // Green
      case 'busy': return colors.busy;
      default: return colors.offline;
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <View
        style={[
          styles.solidDot,
          {
            backgroundColor: getStatusColor(),
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      />
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  solidDot: {
    borderWidth: 2,
    borderColor: colors.white,
  },
});
