import { test, describe } from 'node:test';
import assert from 'node:assert';
import { lightTheme, darkTheme, type AppTheme } from '../../src/design/themes.ts';
import { lightPalette } from '../../src/design/colors.ts';
import { withAlpha } from '../../src/design/colorUtils.ts';

/** WCAG 2.x contrast ratio between two #RRGGBB colours. */
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

describe('theme structure', () => {
  test('light and dark define exactly the same palette and token keys', () => {
    assert.deepStrictEqual(Object.keys(darkTheme.palette).sort(), Object.keys(lightTheme.palette).sort());
    assert.deepStrictEqual(Object.keys(darkTheme.colors).sort(), Object.keys(lightTheme.colors).sort());
    assert.deepStrictEqual(Object.keys(darkTheme.companyTokens.colors).sort(), Object.keys(lightTheme.companyTokens.colors).sort());
  });

  test('the light theme is the unchanged Tasklync identity', () => {
    assert.strictEqual(lightTheme.palette, lightPalette);
    assert.strictEqual(lightTheme.colors.bgApp, '#FFFFFF');
    assert.strictEqual(lightTheme.colors.textPrimary, '#0F172A');
    assert.strictEqual(lightTheme.colors.primaryDark, '#16A34A');
    assert.strictEqual(lightTheme.colors.primaryTint, '#F0FDF4');
  });

  test('dark is not pure black / pure white', () => {
    assert.notStrictEqual(darkTheme.colors.bgApp.toUpperCase(), '#000000');
    assert.notStrictEqual(darkTheme.colors.textPrimary.toUpperCase(), '#FFFFFF');
  });

  test('brand green keeps its identity in dark', () => {
    assert.strictEqual(darkTheme.colors.primaryDark, lightTheme.colors.primaryDark);
    assert.strictEqual(darkTheme.colors.primary, lightTheme.colors.primary);
  });

  test('fixed colours do not change with the theme', () => {
    assert.strictEqual(darkTheme.colors.pureWhite, '#FFFFFF');
    assert.strictEqual(darkTheme.colors.onBrand, '#FFFFFF');
    assert.strictEqual(darkTheme.colors.black, '#000000');
  });
});

for (const [name, t] of themes) {
  const c = t.colors;
  describe(`${name} theme: WCAG contrast`, () => {
    const surfaces: [string, string][] = [
      ['bgApp', c.bgApp],
      ['bgCard', c.bgCard],
      ['bgSection', c.bgSection],
      ['bgInput', c.bgInput],
      ['bottomSheetBackground', c.bottomSheetBackground],
    ];

    for (const [surfaceName, bg] of surfaces) {
      test(`text on ${surfaceName}`, () => {
        assert.ok(contrast(c.textPrimary, bg) >= 7, `textPrimary ${contrast(c.textPrimary, bg).toFixed(2)}`);
        assert.ok(contrast(c.textSecondary, bg) >= 4.5, `textSecondary ${contrast(c.textSecondary, bg).toFixed(2)}`);
        // Light textMuted (#94A3B8, 2.5:1) is the established Tasklync caption colour and is intentionally unchanged;
        // it is pinned here as a known exception so any further drop is caught. Dark must clear 3:1.
        assert.ok(contrast(c.textMuted, bg) >= (name === 'light' ? 2.4 : 3), `textMuted ${contrast(c.textMuted, bg).toFixed(2)}`);
        assert.ok(contrast(c.placeholder, bg) >= 3, `placeholder ${contrast(c.placeholder, bg).toFixed(2)}`);
      });
    }

    test('status and brand text on the base surface', () => {
      assert.ok(contrast(c.primaryDark, c.bgApp) >= 3, 'brand green (large / interactive)');
      assert.ok(contrast(c.textGreen, c.bgApp) >= 4.5, `textGreen ${contrast(c.textGreen, c.bgApp).toFixed(2)}`);
      assert.ok(contrast(c.textDanger, c.bgApp) >= 4.5, `textDanger ${contrast(c.textDanger, c.bgApp).toFixed(2)}`);
      assert.ok(contrast(c.textInfo, c.bgApp) >= 4.5, `textInfo ${contrast(c.textInfo, c.bgApp).toFixed(2)}`);
      assert.ok(contrast(c.textWarningMedium, c.bgApp) >= 3, `textWarningMedium ${contrast(c.textWarningMedium, c.bgApp).toFixed(2)}`);
    });

    test('text on tinted status surfaces', () => {
      assert.ok(contrast(c.textGreen, c.primaryTint) >= 4.5, `green on tint ${contrast(c.textGreen, c.primaryTint).toFixed(2)}`);
      assert.ok(contrast(c.textDangerDark, c.dangerLight) >= 4.5, `danger on tint ${contrast(c.textDangerDark, c.dangerLight).toFixed(2)}`);
      assert.ok(contrast(c.textWarning, c.warningLight) >= 4.5, `warning on tint ${contrast(c.textWarning, c.warningLight).toFixed(2)}`);
      assert.ok(contrast(c.textInfoDark, c.infoLight) >= 4.5, `info on tint ${contrast(c.textInfoDark, c.infoLight).toFixed(2)}`);
    });

    test('white label on the brand button and the inverse chip pair', () => {
      assert.ok(contrast(c.pureWhite, c.primaryDark) >= 3, `white on primaryDark ${contrast(c.pureWhite, c.primaryDark).toFixed(2)}`);
      assert.ok(contrast(c.textInverse, c.inverseSurface) >= 7, `inverse chip ${contrast(c.textInverse, c.inverseSurface).toFixed(2)}`);
    });

    test('borders are visible but quiet', () => {
      const ratio = contrast(c.border, c.bgApp);
      assert.ok(ratio >= 1.15 && ratio <= 2.2, `border vs base ${ratio.toFixed(2)}`);
      assert.ok(contrast(c.borderStrong, c.bgApp) >= (name === 'light' ? 1.4 : 1.8), `borderStrong ${contrast(c.borderStrong, c.bgApp).toFixed(2)}`);
    });

    test('elevated surfaces are distinguishable from the base', () => {
      if (name === 'dark') {
        assert.notStrictEqual(c.bottomSheetBackground, c.bgApp);
        assert.ok(contrast(c.bottomSheetBackground, c.bgApp) > 1.05);
      }
    });
  });
}

describe('withAlpha', () => {
  test('applies alpha to hex and passes other formats through', () => {
    assert.strictEqual(withAlpha('#E2E8F0', 0.5), 'rgba(226, 232, 240, 0.5)');
    assert.strictEqual(withAlpha('#fff', 0), 'rgba(255, 255, 255, 0)');
    assert.strictEqual(withAlpha('rgba(1,2,3,1)', 0.5), 'rgba(1,2,3,1)');
  });
});
