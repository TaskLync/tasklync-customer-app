import React from 'react';
import { RefreshControl, RefreshControlProps } from 'react-native';
import { useAppTheme } from '../../theme/useAppTheme';

export const CustomRefreshControl: React.FC<RefreshControlProps> = (props) => {
  const { colors } = useAppTheme();
  return (
    <RefreshControl
      tintColor={colors.primary}
      colors={[colors.primary]}
      progressBackgroundColor={colors.bgCard}
      {...props}
    />
  );
};
