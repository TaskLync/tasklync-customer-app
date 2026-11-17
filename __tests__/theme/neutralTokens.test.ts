import { test, describe } from 'node:test';
import assert from 'node:assert';
import { lightTheme, darkTheme, type AppTheme } from '../../src/design/themes.ts';

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const themes: [string, AppTheme][] = [['light', lightTheme], ['dark', darkTheme]];

for (const [name, { colors: c }] of themes) {
  describe(`${name} theme: neutral (grayscale) tokens`, () => {
    test('primary ink is AA on the background and on fills', () => {
      for (const s of [c.neutralBg, c.neutralFill, c.neutralFillPressed]) {
        assert.ok(contrast(c.neutralInk, s) >= 4.5, `neutralInk on ${s}`);
      }
    });

    test('secondary ink is AA body text on the background', () => {
      assert.ok(contrast(c.neutralInkSecondary, c.neutralBg) >= 4.5);
    });

    test('secondary ink stays >= 3:1 on fills (placeholders, inactive tabs)', () => {
      assert.ok(contrast(c.neutralInkSecondary, c.neutralFill) >= 3);
    });

    test('badge text on an ink fill is AA', () => {
      assert.ok(contrast(c.neutralOnInk, c.neutralInk) >= 4.5);
    });

    test('fills and dividers are visible but quiet (not borders)', () => {
      const r = contrast(c.neutralFill, c.neutralBg);
      assert.ok(r > 1.03 && r < 1.6, `fill contrast ${r}`);
    });
  });
}
