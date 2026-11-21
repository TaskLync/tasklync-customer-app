import { test, describe } from 'node:test';
import assert from 'node:assert';
import { sanitizeOtpInput, maskPhoneNumber, phoneLastDigits, formatCountdown } from '../../src/utils/otp.ts';
import { OTP_CONFIG, OTP_COPY } from '../../src/config/otp.config.ts';
import { lightTheme, darkTheme } from '../../src/design/themes.ts';

const VISIBLE = OTP_CONFIG.visiblePhoneDigits;
const NATIONAL = OTP_CONFIG.nationalNumberLength;

describe('OTP input sanitisation (typing, paste, SMS autofill)', () => {
  test('keeps typed digits and clamps to length', () => {
    assert.strictEqual(sanitizeOtpInput('1', 6), '1');
    assert.strictEqual(sanitizeOtpInput('123456', 6), '123456');
    assert.strictEqual(sanitizeOtpInput('1234567', 6), '123456');
  });

  test('backspace (shorter value) passes through', () => {
    assert.strictEqual(sanitizeOtpInput('12345', 6), '12345');
    assert.strictEqual(sanitizeOtpInput('', 6), '');
  });

  test('strips non-digits from spaced or dashed pastes', () => {
    assert.strictEqual(sanitizeOtpInput('482 913', 6), '482913');
    assert.strictEqual(sanitizeOtpInput('482-913', 6), '482913');
  });

  test('extracts the 6-digit code from a pasted SMS sentence', () => {
    assert.strictEqual(sanitizeOtpInput('Your TaskLync code is 482913. Valid for 5 min.', 6), '482913');
  });

  test('ignores letters', () => {
    assert.strictEqual(sanitizeOtpInput('12a', 6), '12');
  });
});

describe('Phone masking', () => {
  test('reveals only the last two digits; country code is read from the number', () => {
    assert.strictEqual(maskPhoneNumber('+923001234567', VISIBLE, NATIONAL), '+92 3•• ••• ••67');
    assert.strictEqual(maskPhoneNumber('+971501234589', VISIBLE, 9), '+971 5•• ••• •89');
  });
  test('number without a country code is still masked', () => {
    assert.strictEqual(maskPhoneNumber('3001234567', VISIBLE, NATIONAL), '3•• ••• ••67');
  });
  test('empty input yields empty string', () => {
    assert.strictEqual(maskPhoneNumber(undefined, VISIBLE, NATIONAL), '');
    assert.strictEqual(maskPhoneNumber('', VISIBLE, NATIONAL), '');
  });
  test('last digits for the accessibility label', () => {
    assert.strictEqual(phoneLastDigits('+923001234567', VISIBLE), '67');
  });
});

describe('OTP config', () => {
  test('length and cooldown are positive, copy follows the length', () => {
    assert.ok(OTP_CONFIG.length > 0);
    assert.ok(OTP_CONFIG.resendCooldownSeconds > 0);
    assert.ok(OTP_COPY.subtitle(OTP_CONFIG.length).includes(`${OTP_CONFIG.length}-digit`));
  });
});

describe('Countdown formatting', () => {
  test('formats as MM:SS', () => {
    assert.strictEqual(formatCountdown(55), '00:55');
    assert.strictEqual(formatCountdown(60), '01:00');
    assert.strictEqual(formatCountdown(5), '00:05');
    assert.strictEqual(formatCountdown(-3), '00:00');
  });
});

describe('OTP neutral tokens: WCAG contrast in light and dark', () => {
  const lum = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
  };
  const ratio = (a: string, b: string) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi! + 0.05) / (lo! + 0.05);
  };

  for (const [name, t] of [['light', lightTheme], ['dark', darkTheme]] as const) {
    const c = t.colors;
    test(`${name}: text on page and on code cells meets AA`, () => {
      assert.ok(ratio(c.textStrong, c.bgCard) >= 4.5);
      assert.ok(ratio(c.textSubtle, c.bgCard) >= 4.5, `textSubtle ${ratio(c.textSubtle, c.bgCard).toFixed(2)}`);
      assert.ok(ratio(c.textStrong, c.fieldSurface) >= 4.5);
      assert.ok(ratio(c.textStrong, c.fieldSurfaceActive) >= 4.5);
      assert.ok(ratio(c.textDangerDark, c.dangerLight) >= 4.5); // error digits
      assert.ok(ratio(c.textDanger, c.bgCard) >= 4.5); // error message
      assert.ok(ratio(c.textGreen, c.fieldSurface) >= 4.5); // success digits
      assert.ok(ratio(c.primaryDark, c.bgCard) >= 3); // "Resend code" link (semibold)
    });
    test(`${name}: icon on its tile meets the 3:1 graphics minimum`, () => {
      assert.ok(ratio(c.iconSubtle, c.fieldSurface) >= 3);
    });
  }
});
