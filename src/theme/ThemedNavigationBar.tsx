import React from 'react';
import { NavigationBar } from 'expo-navigation-bar';
import { useAppTheme } from './useAppTheme';

/**
 * Android system navigation buttons follow the APP theme (which the user can set independently of the OS):
 * light icons over the dark tab bar surface, dark icons over the light one. The bar itself is transparent
 * (edge-to-edge, contrast scrim disabled by plugins/withTransparentNavigationBar.js), so the tab bar's own
 * background shows through and the two read as one surface. No-op on iOS and web.
 */
export const ThemedNavigationBar: React.FC = () => {
  const { isDark } = useAppTheme();
  return <NavigationBar style={isDark ? 'dark' : 'light'} />;
};
