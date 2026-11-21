/**
 * Geometry for the Home category carousel, derived from the carousel's measured width.
 *
 *   | gutter | slot | slot | slot | slot | gutter |   ← exactly VISIBLE_COUNT full slots on screen
 *
 * Every category gets an identical slot and centres its tile and label inside it, so the left and
 * right outer spacing are equal by construction. Spacing between tiles comes from the slot width,
 * not from separators. The gutter matches the search bar above (16), so the section lines up with it.
 */
export const CATEGORY_VISIBLE_COUNT = 4;
export const CATEGORY_GUTTER = 16;

const TILE_MAX = 68;
const TILE_MIN = 48;
/** Smallest space kept between two neighbouring tiles. */
const TILE_MIN_SPACING = 12;
/** Proportions of the original 68px tile: 32px icon, 20px corner radius. */
const ICON_RATIO = 32 / 68;
const RADIUS_RATIO = 20 / 68;

export interface CategoryCarouselLayout {
  /** Width allocated to each category; also the snap interval. */
  itemWidth: number;
  tileSize: number;
  iconSize: number;
  tileRadius: number;
  gutter: number;
}

export function getCategoryCarouselLayout(containerWidth: number): CategoryCarouselLayout {
  const available = Math.max(0, containerWidth - CATEGORY_GUTTER * 2);
  const itemWidth = available / CATEGORY_VISIBLE_COUNT;
  const tileSize = Math.round(Math.max(TILE_MIN, Math.min(TILE_MAX, itemWidth - TILE_MIN_SPACING)));
  return {
    itemWidth,
    tileSize,
    iconSize: Math.round(tileSize * ICON_RATIO),
    tileRadius: Math.round(tileSize * RADIUS_RATIO),
    gutter: CATEGORY_GUTTER,
  };
}
