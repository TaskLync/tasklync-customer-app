/**
 * Company & Agency Design Tokens
 * Standardized color palette, typography scales, and shadows for corporate service providers.
 * Aligned with TaskLync Customer App design system and CUSTOMER_APP_COMPANY_HANDYMAN_IMPLEMENTATION_SPEC.md.
 */

import { lightPalette, type Palette, type ThemeMode } from '../design/colors';
import { fontFamily } from '../design/typography';

export const buildCompanyTokens = (palette: Palette, mode: ThemeMode) => ({
  colors: {
    // Corporate primary (Navy / Deep Slate)
    corporatePrimary: palette.gray900,
    corporateSecondary: palette.gray700,
    corporateMuted: palette.gray500,

    // Verified Blue (Enterprise trust)
    verifiedBlue: palette.blue600,
    verifiedBlueDark: palette.blue700,
    verifiedBlueTint: palette.blue50,
    verifiedBlueBorder: palette.blue200,

    // Escrow Emerald (Safety & guarantee)
    escrowGreen: mode === 'dark' ? palette.green500 : '#059669',
    escrowGreenDark: mode === 'dark' ? palette.green700 : '#047857',
    escrowGreenTint: mode === 'dark' ? palette.green50 : '#ECFDF5',
    escrowGreenBorder: mode === 'dark' ? palette.green200 : '#A7F3D0',

    // Rating gold
    ratingGold: palette.amber500,
    ratingGoldTint: palette.amber100,

    // Surfaces
    surfaceWhite: palette.white,
    surfaceSubtle: palette.gray50,
    surfaceHover: palette.gray100,
    surfaceCard: palette.white,

    // Borders
    borderSubtle: palette.gray200,
    borderStrong: palette.gray300,

    // Carrier Badges (Pakistan Networks)
    jazzRed: palette.red600,
    jazzTint: palette.red50,
    zongGreen: palette.green600,
    zongTint: palette.green50,
    telenorBlue: palette.sky600,
    telenorTint: palette.sky50,
    ufoneOrange: palette.orange600,
    ufoneTint: palette.orange50,
  },

  dimensions: {
    // Circular logo dimensions for single horizontal row
    homeLogoSize: 64,
    homeLogoRadius: 32,
    homeItemWidth: 78,

    // Detail header logo dimensions
    detailLogoSize: 80,
    detailLogoRadius: 40,
    detailCoverHeight: 196,

    // Card dimensions for All Companies grid/list
    gridLogoSize: 52,
    gridLogoRadius: 26,
  },

  shadows: {
    logoCard: {
      shadowColor: palette.gray900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    coverLogo: {
      shadowColor: palette.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 6,
    },
    trustCard: {
      shadowColor: palette.gray900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
  },

  typography: {
    homeItemLabel: {
      fontFamily: fontFamily.jakarta.medium,
      fontSize: 12.5,
      lineHeight: 16,
      color: palette.gray900,
    },
    cardCompanyName: {
      fontFamily: fontFamily.poppins.semiBold,
      fontSize: 15,
      lineHeight: 20,
      color: palette.gray900,
    },
    cardServiceCount: {
      fontFamily: fontFamily.jakarta.regular,
      fontSize: 12,
      lineHeight: 16,
      color: palette.gray500,
    },
    detailHeroName: {
      fontFamily: fontFamily.poppins.bold,
      fontSize: 22,
      lineHeight: 28,
      color: palette.gray900,
    },
    detailHeroTagline: {
      fontFamily: fontFamily.jakarta.regular,
      fontSize: 13.5,
      lineHeight: 18,
      color: palette.gray600,
    },
  },
}) as const;

/** Static LIGHT instance, kept for non-React code. Components read `companyTokens` from the active theme. */
export const companyTokens = buildCompanyTokens(lightPalette, 'light');
