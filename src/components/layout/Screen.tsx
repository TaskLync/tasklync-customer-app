import React from 'react';
import { ViewStyle, StatusBar } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/useAppTheme';

export interface ScreenProps {
  children: React.ReactNode;
  bg?: string;
  /** Force a status bar style (e.g. light icons over a photo). Omit to follow the theme. */
  statusBarStyle?: 'light-content' | 'dark-content' | 'default';
  edges?: Edge[];
  style?: ViewStyle;
}

export const Screen = ({
  children,
  bg: bgProp,
  statusBarStyle,
  edges = ['top', 'bottom', 'left', 'right'],
  style,
}: ScreenProps) => {
  const { colors, isDark } = useAppTheme();
  const bg = bgProp ?? colors.bgApp;
  return (
    <SafeAreaView
      style={[{ flex: 1, backgroundColor: bg }, style]}
      edges={edges}
    >
      <StatusBar
        barStyle={statusBarStyle ?? (isDark ? 'light-content' : 'dark-content')}
        backgroundColor="transparent"
        translucent
      />
      {children}
    </SafeAreaView>
  );
};
