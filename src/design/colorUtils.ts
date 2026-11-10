/**
 * Applies an alpha to a #RRGGBB (or #RGB) colour: `withAlpha(colors.border, 0.5)` → 'rgba(r, g, b, 0.5)'.
 * Used where a theme colour must fade (animated borders, gradient scrims) without hard-coding an rgb triple.
 * Non-hex inputs (rgba(), names) are returned unchanged.
 */
export function withAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return color;
  let hex = m[1] as string;
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const n = parseInt(hex, 16);
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
