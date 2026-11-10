/**
 * Theme tokens and theme color definition
 * Centralized design-token theme bridge for TaskLync Customer Mobile App.
 *
 * `Colors` is the legacy flat shape used by the Expo template components (themed-text, themed-view, app-tabs).
 * It is derived from the same semantic tokens as the rest of the app, so it cannot drift from them.
 */

import { fontFamily } from '../design/typography';
import { lightTheme, darkTheme, type AppTheme } from '../design/themes';

const legacy = ({ colors, palette }: AppTheme) => ({
  text: colors.textPrimary,
  textSecondary: colors.textSecondary,
  textMuted: colors.textMuted,
  textDisabled: colors.textDisabled,
  background: colors.bgApp,
  backgroundElement: colors.bgCard,
  backgroundSelected: colors.primaryTint,
  tint: colors.primaryDark,
  icon: colors.textSecondary,
  tabIconDefault: colors.textMuted,
  tabIconSelected: colors.primaryDark,
  border: colors.border,
  card: colors.bgCard,
  primary: colors.primary,
  primaryDark: colors.primaryDark,
  error: colors.danger,
  warning: colors.warning,
  success: colors.success,
  info: colors.info,
  onBrand: palette.pureWhite,
});

export const Colors = {
  light: legacy(lightTheme),
  dark: legacy(darkTheme),
};

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = {
  jakarta: fontFamily.jakarta,
  poppins: fontFamily.poppins,
  inter: fontFamily.inter,
};

export default Colors;
