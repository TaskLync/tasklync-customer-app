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
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

describe('button tokens: one primary colour', () => {
  test('primary button fill and label are identical in light and dark', () => {
    assert.strictEqual(lightTheme.colors.buttonPrimary, darkTheme.colors.buttonPrimary);
    assert.strictEqual(lightTheme.colors.buttonPrimaryPressed, darkTheme.colors.buttonPrimaryPressed);
    assert.strictEqual(lightTheme.colors.buttonPrimaryText, '#FFFFFF');
    assert.strictEqual(darkTheme.colors.textOnGreen, '#FFFFFF');
  });

  for (const [name, t] of [['light', lightTheme], ['dark', darkTheme]] as const) {
    test(`${name}: primary label is AA on the fill; fill is visible on the base surface`, () => {
      assert.ok(contrast(t.colors.buttonPrimaryText, t.colors.buttonPrimary) >= 4.5);
      assert.ok(contrast(t.colors.buttonPrimary, t.colors.bgApp) >= 3);
    });
    test(`${name}: destructive label is readable and never the brand colour`, () => {
      assert.ok(contrast(t.colors.buttonDestructiveText, t.colors.buttonDestructive) >= 4.5);
      assert.notStrictEqual(t.colors.buttonDestructive, t.colors.buttonPrimary);
    });
    test(`${name}: secondary label is readable on its fill`, () => {
      assert.ok(contrast(t.colors.buttonSecondaryText, t.colors.buttonSecondary) >= 7);
    });
  }
});
