import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme } from './useAppTheme';

/**
 * Status bar content that follows the active theme: dark icons on light screens, light icons on dark ones.
 * Edge-to-edge (Android 15+, Expo 57): the bar has no background of its own, the screen shows through.
 * Image-led screens that need fixed light icons should render expo's <StatusBar style="light" /> instead.
 */
export const ThemedStatusBar: React.FC = () => {
  const { isDark } = useAppTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
};
