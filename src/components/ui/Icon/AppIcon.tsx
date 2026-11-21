import React, { memo, useMemo } from 'react';
import type { ColorValue } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react-native';

import { toHugeiconsStrokeWidth } from '../../../design/iconography';

/**
 * Props shared by every app icon.
 *
 * - `size`        pixel size (default 24). Use the `iconSize` tokens from `design/iconography`.
 * - `color`       stroke colour. Pass a theme token (`colors.textPrimary`, `colors.primary`, …).
 * - `strokeWidth` weight on the app weight scale (2 = regular); mapped to Hugeicons' optical stroke.
 * - `fill`        solid fill for "on" states (rated star, favourited heart, verified badge).
 *                 `'none'` / `'transparent'` / undefined keep the outline glyph.
 */
export interface AppIconProps extends Omit<SvgProps, 'color' | 'fill' | 'strokeWidth' | 'width' | 'height'> {
  size?: number | string | undefined;
  color?: ColorValue | undefined;
  strokeWidth?: number | string | undefined;
  fill?: ColorValue | undefined;
}

export type AppIconComponent = React.NamedExoticComponent<AppIconProps>;

const isPaint = (fill: ColorValue | undefined): fill is ColorValue =>
  fill != null && fill !== 'none' && fill !== 'transparent';

/** Wraps a Hugeicons glyph in the app's icon contract. Created once per icon at module load. */
export function createAppIcon(displayName: string, glyph: IconSvgElement): AppIconComponent {
  const Icon = memo(function AppIcon({ size = 24, color = '#000', strokeWidth, fill, ...rest }: AppIconProps) {
    const icon = useMemo<IconSvgElement>(() => {
      if (!isPaint(fill)) return glyph;
      return glyph.map(([tag, attrs]) => [tag, { ...attrs, fill: fill as string }] as const);
    }, [fill]);

    return (
      <HugeiconsIcon
        {...rest}
        icon={icon}
        size={size}
        color={color}
        strokeWidth={toHugeiconsStrokeWidth(strokeWidth == null ? undefined : Number(strokeWidth))}
      />
    );
  });
  Icon.displayName = displayName;
  return Icon;
}
