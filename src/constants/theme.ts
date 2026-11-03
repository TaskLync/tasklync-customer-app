/**
 * Theme tokens and theme color definition
 * Centralized design-token theme bridge for TaskLync Customer Mobile App.
 */

import { colors, palette } from '../design/colors';
import { fontFamily } from '../design/typography';

export const Colors = {
  light: {
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
    success: colors.primaryDark,
    info: colors.info,
  },
  dark: {
    text: palette.gray50,
    textSecondary: palette.gray300,
    textMuted: palette.gray400,
    textDisabled: palette.gray600,
    background: palette.gray900,
    backgroundElement: palette.gray800,
    backgroundSelected: '#163322',
    tint: colors.primaryLight,
    icon: palette.gray300,
    tabIconDefault: palette.gray500,
    tabIconSelected: colors.primaryLight,
    border: palette.gray700,
    card: palette.gray800,
    primary: colors.primaryLight,
    primaryDark: colors.primary,
    error: palette.red400,
    warning: palette.amber400,
    success: palette.green400,
    info: palette.blue400,
  },
};

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = {
  jakarta: fontFamily.jakarta,
  poppins: fontFamily.poppins,
  inter: fontFamily.inter,
};

export default Colors;
