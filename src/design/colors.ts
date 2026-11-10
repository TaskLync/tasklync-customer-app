/**
 * Raw colour scales. The LIGHT palette is the Tasklync identity and is exported as `palette` for static
 * (non-React) use. Components must not import it directly: they read the active theme with
 * `useAppTheme()` / `useThemedStyles()` (src/theme), which resolves these same keys against the
 * dark palette in src/design/themes.ts when the device is in dark mode.
 */
export const lightPalette = {
  // Fixed colours: identical in every theme. Use for text/icons ON brand or photo surfaces.
  pureWhite: '#FFFFFF',

  // Overlay surfaces and inverse (high-contrast chip) pair
  elevated: '#FFFFFF', // modals, bottom sheets, popovers
  inverse: '#0F172A', // high-contrast chip / toast surface
  onInverse: '#FFFFFF', // content on `inverse`

  // Primary (Green scale)
  green50: '#F0FDF4',
  green100: '#DCFCE7',
  green200: '#BBF7D0',
  green300: '#86EFAC',
  green400: '#4ADE80',
  green500: '#22C55E', // primary
  green600: '#16A34A', // primaryDark
  green700: '#15803D',
  green800: '#166534',
  green900: '#14532D',

  // Neutrals / Slate scale
  white: '#FFFFFF',
  black: '#000000',
  zenWhite: '#FFFFFF', // bgApp canvas
  canvasGray: '#FFFFFF', // #F6F7F9 universal app canvas
  lowGray: '#F8FAFC', // bgSection
  iceGray: '#F8FAFC', // bgInput
  mintHaze: '#F1F5F9', // bgSkeleton
  softGray: '#E2E8F0', // border

  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1', // textDisabled
  gray400: '#94A3B8', // textMuted
  gray500: '#64748B',
  gray600: '#475569', // textSecondary
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#0F172A', // textPrimary

  // Red / Danger scale
  red50: '#FEF2F2',
  red100: '#FEE2E2',
  red200: '#FECACA',
  red300: '#FCA5A5',
  red400: '#F87171',
  red500: '#EF4444',
  red600: '#DC2626',
  red700: '#B91C1C',
  red800: '#991B1B',
  red900: '#7F1D1D',

  // Amber / Warning scale
  amber50: '#FFFBEB',
  amber100: '#FEF3C7',
  amber200: '#FDE68A',
  amber300: '#FCD34D',
  amber400: '#FBBF24',
  amber500: '#F59E0B',
  amber600: '#D97706',
  amber700: '#B45309',
  amber800: '#92400E',
  amber900: '#78350F',

  // Blue / Info scale
  blue50: '#EFF6FF',
  blue100: '#DBEAFE',
  blue200: '#BFDBFE',
  blue300: '#93C5FD',
  blue400: '#60A5FA',
  blue500: '#3B82F6',
  blue600: '#2563EB',
  blue700: '#1D4ED8',
  blue800: '#1E40AF',
  blue900: '#1E3A8A',

  // Purple / Violet scale
  purple50: '#FAF5FF',
  purple100: '#F3E8FF',
  purple200: '#E9D5FF',
  purple300: '#D8B4FE',
  purple400: '#C084FC',
  purple500: '#A855F7',
  purple600: '#9333EA',
  purple700: '#7E22CE',
  purple800: '#6B21A8',
  purple900: '#581C87',

  // Sky scale
  sky50: '#F0F9FF',
  sky100: '#E0F2FE',
  sky500: '#0EA5E9',
  sky600: '#0284C7',
  sky700: '#0369A1',

  // Orange scale
  orange50: '#FFF7ED',
  orange100: '#FFEDD5',
  orange500: '#F97316',
  orange600: '#EA580C',
  orange700: '#C2410C',

  // Legacy semantic aliases for backward compatibility
  warningLight: '#FEF3C7',
  warning: '#F59E0B',
  warningDark: '#92400E',
  amberLight: '#FEF3C7',
  amberDark: '#92400E',
  amberBorder: '#FDE68A',
  dangerLight: '#FEF2F2',
  danger: '#EF4444',
  dangerDark: '#991B1B',
  infoLight: '#EFF6FF',
  info: '#3B82F6',
  infoDark: '#1E40AF',

  // Overlays
  overlay: 'rgba(15, 23, 42, 0.55)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(15, 23, 42, 0.3)',
};

export type Palette = typeof lightPalette;
export type ThemeMode = 'light' | 'dark';

/**
 * Semantic colour tokens. The same builder serves both themes: every token is derived from the palette it
 * is given, so a theme is defined once (its palette) and cannot drift from the other.
 */
export const buildColors = (palette: Palette, mode: ThemeMode) => ({
  // ── Semantic tokens (preferred in new code) ──
  background: palette.canvasGray,
  surface: palette.white,
  surfaceSecondary: palette.gray50,
  surfaceElevated: palette.elevated,
  textTertiary: palette.gray400,
  textInverse: palette.onInverse,
  primaryPressed: mode === 'dark' ? '#15803D' : palette.green700,
  primarySubtle: palette.green50,
  divider: palette.gray100,
  success: palette.green600,
  error: palette.red500,
  inputBackground: palette.iceGray,
  inputBorder: palette.softGray,
  // Light: a step darker than textMuted so empty fields read at >= 3:1 (WCAG non-text/UI). Dark: gray400 already clears it.
  placeholder: mode === 'light' ? '#7B8AA0' : palette.gray400,
  cardBackground: palette.white,
  modalBackground: palette.elevated,
  bottomSheetBackground: palette.elevated,
  tabBarBackground: palette.white,
  // Bottom tab bar: neutral greys, never brand green. Contrast on the tab bar surface:
  //   light  active #374151 10.3:1 | inactive #6B7280 4.8:1 (#9CA3AF is only 2.5:1, below AA for 11px labels)
  //   dark   active #E5E7EB 14.9:1 | inactive #7C8593 5.0:1 (#6B7280 is only 3.8:1)
  tabBarActive: mode === 'light' ? '#374151' : '#E5E7EB',
  tabBarInactive: mode === 'light' ? '#6B7280' : '#7C8593',
  tabBarBorder: mode === 'light' ? '#E5E7EB' : '#2A2F36',
  iconPrimary: palette.gray900,
  iconSecondary: palette.gray600,
  inverseSurface: palette.inverse,
  onBrand: palette.pureWhite,
  pureWhite: palette.pureWhite,

  // ── Existing tokens (kept: ~300 files use them) ──
  // Brand
  primary: palette.green500, // #22C55E
  primaryDark: palette.green600, // #16A34A (high contrast on white for text & icons)
  primaryLight: palette.green400, // #4ADE80
  primaryTint: palette.green50, // #F0FDF4
  primaryBorder: palette.green200, // #BBF7D0
  primaryBorderSubtle: palette.green100, // #DCFCE7

  // Backgrounds
  canvasGray: palette.canvasGray, // #F6F7F9 universal app canvas
  lightGreen: palette.green100, // #DCFCE7 distinct light green
  lightGreenBorder: palette.green200, // #BBF7D0
  lightGreenText: palette.green700, // #15803D
  bgApp: palette.canvasGray, // #F6F7F9 universal app background
  bgHome: palette.canvasGray, // #F6F7F9
  bgCard: palette.white,
  bgInput: palette.iceGray,
  bgSection: palette.lowGray,
  bgSubtle: palette.gray50, // #F8FAFC
  bgHover: palette.gray100, // #F1F5F9
  bgSuccess: palette.green50,
  bgSuccessSubtle: palette.green100,
  bgSkeleton: palette.mintHaze,

  // Text
  textPrimary: palette.gray900, // #0F172A
  textSecondary: palette.gray600, // #475569
  textMuted: palette.gray400, // #94A3B8
  textDisabled: palette.gray300, // #CBD5E1
  textOnGreen: palette.white,
  textGreen: palette.green700, // #15803D
  textGreenDark: palette.green900, // #14532D
  textDanger: palette.red600, // #DC2626
  textDangerDark: palette.red800, // #991B1B
  textWarning: palette.amber800, // #92400E
  textWarningMedium: palette.amber700, // #B45309
  textInfo: palette.blue600, // #2563EB
  textInfoDark: palette.blue800, // #1E40AF

  // Borders
  border: palette.softGray, // #E2E8F0
  borderLight: palette.gray100, // #F1F5F9
  borderStrong: palette.gray300, // #CBD5E1
  borderFocus: palette.green600, // #16A34A
  borderError: palette.red500, // #EF4444
  borderErrorLight: palette.red200, // #FECACA
  borderWarning: palette.amber500, // #F59E0B
  borderWarningLight: palette.amber200, // #FDE68A
  borderSuccess: palette.green500, // #22C55E
  borderSuccessLight: palette.green200, // #BBF7D0
  borderInfo: palette.blue500, // #3B82F6
  borderInfoLight: palette.blue200, // #BFDBFE

  // Semantic States
  danger: palette.red500, // #EF4444
  dangerMedium: palette.red600, // #DC2626
  dangerDark: palette.red800, // #991B1B
  dangerLight: palette.red50, // #FEF2F2
  dangerBorder: palette.red200, // #FECACA

  warning: palette.amber500, // #F59E0B
  warningMedium: palette.amber600, // #D97706
  warningDark: palette.amber800, // #92400E
  warningLight: palette.amber100, // #FEF3C7
  warningBorder: palette.amber200, // #FDE68A

  info: palette.blue500, // #3B82F6
  infoMedium: palette.blue600, // #2563EB
  infoDark: palette.blue800, // #1E40AF
  infoLight: palette.blue50, // #EFF6FF
  infoBorder: palette.blue200, // #BFDBFE

  // Status indicators
  online: palette.green500,
  offline: palette.gray400,
  busy: palette.amber500,

  // Common UI
  white: palette.white,
  black: palette.black,
  overlay: palette.overlay,
  shadow: mode === 'dark' ? palette.black : palette.gray900,
  starFilled: palette.amber500,
  starEmpty: palette.gray300,
});

export const buildBookingStatusColors = (palette: Palette) => ({
  PENDING: {
    bg: palette.amber100,
    border: palette.amber500,
    text: palette.amber800,
    dot: palette.amber500,
  },
  ACCEPTED: {
    bg: palette.blue50,
    border: palette.blue500,
    text: palette.blue800,
    dot: palette.blue500,
  },
  IN_PROGRESS: {
    bg: palette.green50,
    border: palette.green500,
    text: palette.green900,
    dot: palette.green500,
  },
  COMPLETED: {
    bg: palette.gray50,
    border: palette.gray300,
    text: palette.gray600,
    dot: palette.gray400,
  },
  CANCELLED: {
    bg: palette.red50,
    border: palette.red500,
    text: palette.red800,
    dot: palette.red500,
  },
  DISPUTED: {
    bg: palette.red100,
    border: palette.red600,
    text: palette.red900,
    dot: palette.red600,
  },
});

/** Static LIGHT instances for non-React code and as the backwards-compatible default. */
export const palette: Palette = lightPalette;
export const colors = buildColors(lightPalette, 'light');
export const bookingStatusColors = buildBookingStatusColors(lightPalette);

export type ColorKey = keyof typeof colors;
