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

describe('bottom tab bar colours', () => {
  for (const [name, theme] of [['light', lightTheme], ['dark', darkTheme]] as const) {
    const c = theme.colors;
    test(`${name}: active and inactive labels meet WCAG AA (4.5:1) on the tab bar surface`, () => {
      assert.ok(ratio(c.tabBarActive, c.tabBarBackground) >= 4.5, 'active');
      assert.ok(ratio(c.tabBarInactive, c.tabBarBackground) >= 4.5, 'inactive');
    });
    test(`${name}: active is clearly stronger than inactive`, () => {
      assert.ok(ratio(c.tabBarActive, c.tabBarBackground) > ratio(c.tabBarInactive, c.tabBarBackground) * 1.5);
    });
    test(`${name}: no brand green in the tab bar`, () => {
      for (const v of [c.tabBarActive, c.tabBarInactive]) assert.notStrictEqual(v, c.primaryDark);
    });
    test(`${name}: separator differs from the surface`, () => {
      assert.ok(ratio(c.tabBarBorder, c.tabBarBackground) > 1.15);
    });
  }
  test('themes use different tokens (light dark, dark light)', () => {
    assert.strictEqual(lightTheme.colors.tabBarActive, '#374151');
    assert.strictEqual(darkTheme.colors.tabBarActive, '#E5E7EB');
  });
});
