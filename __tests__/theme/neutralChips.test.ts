import { test, describe } from 'node:test';
import assert from 'node:assert';
import { lightTheme, darkTheme } from '../../src/design/themes.ts';

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

// Neutral chips (Chip tone="neutral", ProviderTypeFilterChips) and the neutral empty-state button.
describe('neutral chip / button colours', () => {
  for (const [name, t] of [['light', lightTheme], ['dark', darkTheme]] as const) {
    const c = t.colors;
    test(`${name}: unselected label is readable on the grey chip (AA 4.5:1)`, () => {
      assert.ok(ratio(c.textSecondary, c.bgInput) >= 4.5);
    });
    test(`${name}: selected label and outline are strong on the card surface`, () => {
      assert.ok(ratio(c.textPrimary, c.bgCard) >= 7);
    });
    test(`${name}: selected chip is distinguishable from unselected (outline vs fill)`, () => {
      assert.ok(ratio(c.textPrimary, c.bgInput) >= 3, 'outline against the unselected fill');
      assert.notStrictEqual(c.bgCard, c.bgInput);
    });
    test(`${name}: neutral button label is readable on its grey fill`, () => {
      assert.ok(ratio(c.textPrimary, c.bgInput) >= 7);
    });
  }
});
