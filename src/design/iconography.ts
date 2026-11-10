import { palette, colors } from './colors';
import { withAlpha } from './colorUtils';
import type { AppTheme } from './themes';
import { radius } from './radius';

/**
 * Standardized icon size tiers adhering to cognitive visual hierarchy and Miller's law of chunking.
 */
export const iconSize = {
  nano: 12,        // Micro indicators, inline rating stars, badge attachments
  micro: 14,       // Caption accents, inline table metadata
  subtle: 16,      // Body metadata, input trailing icons, chips
  body: 18,        // Search inputs, secondary button icons, dense list icons
  action: 20,      // Primary interactive icon buttons, sheet action rows
  standard: 22,    // Standalone header icons, modal controls
  nav: 24,         // Navigation bars, screen headers
  feature: 28,     // Service highlight icons, category highlights
  display: 32,     // Category tiles, empty-state anchors
  hero: 40,        // Modal announcement headers, payment verification anchors
  monumental: 48,  // Full-page empty states, order completion celebrations
} as const;

export type IconSizeKey = keyof typeof iconSize;

/**
 * Optical stroke width compensation matrix.
 * In high-end minimalist design (Braun/Dieter Rams, Apple HIG, Linear):
 * - Smaller icons need slightly stronger relative stroke to prevent counter-space choking.
 * - Larger icons must reduce relative stroke weight so they do not overpower typography.
 */
export const getOpticalStrokeWidth = (
  size: number,
  preset: 'hairline' | 'refined' | 'balanced' | 'strong' = 'refined'
): number => {
  if (preset === 'hairline') {
    return 1.25;
  }
  if (preset === 'strong') {
    return 2.0;
  }

  // Refined / Balanced luxury standard
  if (size <= 14) return 1.6;
  if (size <= 18) return 1.65;
  if (size <= 22) return 1.7;
  if (size <= 26) return 1.65;
  if (size <= 32) return 1.5;
  if (size <= 42) return 1.4;
  return 1.3;
};

/**
 * Optical centering offsets for directional icons.
 * Geometric centers often fail human perception (e.g. play triangle or chevrons appear pushed left).
 */
export const iconOpticalOffsets: Record<string, { x: number; y: number }> = {
  ChevronRight: { x: 1, y: 0 },
  ChevronLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  Play: { x: 1.5, y: 0 },
  Check: { x: 0, y: 0.5 },
};

/**
 * Premium enclosure styles for minimalist icon badges, squircle containers, and action frames.
 */
export const iconEnclosures = {
  sizes: {
    sm: { container: 32, icon: iconSize.subtle, radius: radius.sm },
    md: { container: 40, icon: iconSize.action, radius: radius.md },
    lg: { container: 48, icon: iconSize.nav, radius: radius.lg },
    xl: { container: 56, icon: iconSize.feature, radius: radius.xl },
    hero: { container: 72, icon: iconSize.hero, radius: radius['2xl'] },
  },
  variants: {
    naked: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      borderWidth: 0,
    },
    subtle: {
      backgroundColor: palette.iceGray,
      borderColor: 'transparent',
      borderWidth: 0,
    },
    surface: {
      backgroundColor: palette.white,
      borderColor: palette.softGray,
      borderWidth: 1,
    },
    tintedPrimary: {
      backgroundColor: 'rgba(34, 197, 94, 0.08)',
      borderColor: 'rgba(34, 197, 94, 0.16)',
      borderWidth: 1,
    },
    tintedInfo: {
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
      borderColor: 'rgba(59, 130, 246, 0.16)',
      borderWidth: 1,
    },
    tintedWarning: {
      backgroundColor: 'rgba(245, 158, 11, 0.08)',
      borderColor: 'rgba(245, 158, 11, 0.16)',
      borderWidth: 1,
    },
    tintedDanger: {
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
      borderColor: 'rgba(239, 68, 68, 0.16)',
      borderWidth: 1,
    },
    frosted: {
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      borderColor: 'rgba(255, 255, 255, 0.6)',
      borderWidth: 1,
    },
    filledBrand: {
      backgroundColor: colors.primary,
      borderColor: 'transparent',
      borderWidth: 0,
    },
    filledDark: {
      backgroundColor: palette.gray900,
      borderColor: 'transparent',
      borderWidth: 0,
    },
  },
};

/** Enclosure fills resolved against a theme (the static `iconEnclosures.variants` above are the light values and the type source). */
export const createEnclosureVariants = ({ colors, palette }: AppTheme): typeof iconEnclosures.variants => ({
  naked: { backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 0 },
  subtle: { backgroundColor: palette.iceGray, borderColor: 'transparent', borderWidth: 0 },
  surface: { backgroundColor: palette.white, borderColor: palette.softGray, borderWidth: 1 },
  tintedPrimary: { backgroundColor: withAlpha(palette.green500, 0.12), borderColor: withAlpha(palette.green500, 0.24), borderWidth: 1 },
  tintedInfo: { backgroundColor: withAlpha(palette.blue500, 0.12), borderColor: withAlpha(palette.blue500, 0.24), borderWidth: 1 },
  tintedWarning: { backgroundColor: withAlpha(palette.amber500, 0.12), borderColor: withAlpha(palette.amber500, 0.24), borderWidth: 1 },
  tintedDanger: { backgroundColor: withAlpha(palette.red500, 0.12), borderColor: withAlpha(palette.red500, 0.24), borderWidth: 1 },
  frosted: { backgroundColor: withAlpha(colors.bgCard, 0.85), borderColor: withAlpha(colors.bgCard, 0.6), borderWidth: 1 },
  filledBrand: { backgroundColor: colors.primary, borderColor: 'transparent', borderWidth: 0 },
  filledDark: { backgroundColor: colors.inverseSurface, borderColor: 'transparent', borderWidth: 0 },
});

export const iconography = {
  size: iconSize,
  getOpticalStrokeWidth,
  offsets: iconOpticalOffsets,
  enclosures: iconEnclosures,
};
