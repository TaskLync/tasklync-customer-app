/**
 * Tasklync themes.
 *
 * A theme is a palette. Semantic tokens (`colors`) are derived from it by `buildColors`, so Light and Dark
 * cannot drift apart structurally: a key that exists in one exists in the other (enforced by `Palette`).
 *
 * Light is the Tasklync identity, unchanged.
 * Dark is designed, not inverted:
 *   - Surfaces are layered neutrals (never pure black), cool-tinted to sit with the slate light theme.
 *       base #121417 → secondary #181B1F → fill #22262B → border #2B3036, sheets/modals lifted to #1A1D22.
 *   - Text is an off-white scale (primary #F0F2F5, not #FFFFFF) to avoid glare on OLED.
 *   - The green brand stays: 500/600 are the same hue as light so buttons keep their identity.
 *     Roles that were "dark green text on a pale tint" become "light green text on a deep tint".
 *   - Status scales follow the same rule: 50-200 are deep tints, 700-900 are light readable text tones.
 *
 * Contrast (WCAG 2.x, measured against base #121417):
 *   textPrimary  #F0F2F5  ≈ 16:1     textSecondary #B3BBC6 ≈ 9.5:1    textMuted #8A93A0 ≈ 5.9:1
 *   primaryDark  #16A34A  ≈ 5.5:1    danger text   #EF5350 ≈ 5.1:1    textDisabled #5A626D ≈ 2.9:1 (disabled: exempt)
 *   white on primaryDark button #16A34A ≈ 3.3:1 (large/bold button labels; unchanged from light)
 */
import { buildColors, lightPalette, type Palette, type ThemeMode } from './colors';
import { buildCompanyTokens } from '../theme/companyTokens';

export const darkPalette: Palette = {
  // Fixed
  pureWhite: '#FFFFFF',

  // Surfaces
  elevated: '#1A1D22',
  inverse: '#E8EBEF',
  onInverse: '#0F1114',

  // Green: brand stays; tints go deep; "dark text" tones go light
  green50: '#0F2418',
  green100: '#133020',
  green200: '#1C4A2E',
  green300: '#2F8F57',
  green400: '#4ADE80',
  green500: '#22C55E',
  green600: '#16A34A',
  green700: '#4ADE80',
  green800: '#86EFAC',
  green900: '#BBF7D0',

  white: '#121417',
  black: '#000000',
  zenWhite: '#121417',
  canvasGray: '#121417',
  lowGray: '#181B1F',
  iceGray: '#1A1D21',
  mintHaze: '#22262B',
  softGray: '#2B3036',

  gray50: '#181B1F',
  gray100: '#22262B',
  gray200: '#2B3036',
  gray300: '#5A626D',
  gray400: '#8A93A0',
  gray500: '#9AA3AF',
  gray600: '#B3BBC6',
  gray700: '#CBD2DA',
  gray800: '#E0E4E9',
  gray900: '#F0F2F5',

  red50: '#2A1415',
  red100: '#3A1A1C',
  red200: '#5C2528',
  red300: '#E5646A',
  red400: '#F27A7A',
  red500: '#EF4444',
  red600: '#EF5350',
  red700: '#FCA5A5',
  red800: '#FECACA',
  red900: '#FEE2E2',

  amber50: '#2B2010',
  amber100: '#3A2B12',
  amber200: '#5A4216',
  amber300: '#FCD34D',
  amber400: '#FBBF24',
  amber500: '#F59E0B',
  amber600: '#F59E0B',
  amber700: '#FBBF24',
  amber800: '#FCD34D',
  amber900: '#FDE68A',

  blue50: '#111D30',
  blue100: '#16263F',
  blue200: '#1F3A63',
  blue300: '#60A5FA',
  blue400: '#60A5FA',
  blue500: '#3B82F6',
  blue600: '#5B9BF8',
  blue700: '#93C5FD',
  blue800: '#BFDBFE',
  blue900: '#DBEAFE',

  purple50: '#221631',
  purple100: '#2D1D42',
  purple200: '#43296A',
  purple300: '#C084FC',
  purple400: '#C084FC',
  purple500: '#A855F7',
  purple600: '#B57BF5',
  purple700: '#D8B4FE',
  purple800: '#E9D5FF',
  purple900: '#F3E8FF',

  sky50: '#0F2230',
  sky100: '#133046',
  sky500: '#0EA5E9',
  sky600: '#38B6F0',
  sky700: '#7DD3FC',

  orange50: '#2B1A0F',
  orange100: '#3A2314',
  orange500: '#F97316',
  orange600: '#FB8C3A',
  orange700: '#FDBA74',

  // Legacy semantic aliases
  warningLight: '#3A2B12',
  warning: '#F59E0B',
  warningDark: '#FCD34D',
  amberLight: '#3A2B12',
  amberDark: '#FCD34D',
  amberBorder: '#5A4216',
  dangerLight: '#2A1415',
  danger: '#EF4444',
  dangerDark: '#FECACA',
  infoLight: '#111D30',
  info: '#3B82F6',
  infoDark: '#BFDBFE',

  // Overlays: darker scrims, shadows are invisible on dark surfaces
  overlay: 'rgba(0, 0, 0, 0.65)',
  overlayDark: 'rgba(0, 0, 0, 0.8)',
  overlayLight: 'rgba(0, 0, 0, 0.45)',
};

export interface AppTheme {
  scheme: ThemeMode;
  isDark: boolean;
  palette: Palette;
  colors: ReturnType<typeof buildColors>;
  /** Company / agency tokens (palette-derived colours and shadows, plus fixed dimensions and type). */
  companyTokens: ReturnType<typeof buildCompanyTokens>;
}

const make = (scheme: ThemeMode, palette: Palette): AppTheme => ({
  scheme,
  isDark: scheme === 'dark',
  palette,
  colors: buildColors(palette, scheme),
  companyTokens: buildCompanyTokens(palette, scheme),
});

/** Module-level singletons: identity is stable, so memoisation keyed on a theme is cheap and correct. */
export const lightTheme: AppTheme = make('light', lightPalette);
export const darkTheme: AppTheme = make('dark', darkPalette);

export const getTheme = (scheme: ThemeMode): AppTheme => (scheme === 'dark' ? darkTheme : lightTheme);
