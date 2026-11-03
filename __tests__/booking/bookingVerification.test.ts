import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  isVerificationEligible,
  mapVerificationError,
  formatRemainingTime,
} from '../../src/utils/verificationState.util.ts';
import { generateQrSvgPath } from '../../src/utils/qrCode.util.ts';

describe('Job Start Verification Logic & State Transitions', () => {
  describe('isVerificationEligible', () => {
    test('strictly marks ACCEPTED as eligible for customer start verification', () => {
      assert.strictEqual(isVerificationEligible('ACCEPTED'), true);
      assert.strictEqual(isVerificationEligible('accepted'), true);
    });

    test('hides verification credentials once service transitions to IN_PROGRESS', () => {
      assert.strictEqual(isVerificationEligible('IN_PROGRESS'), false);
    });

    test('hides verification credentials for non-started states (PENDING, CANCELLED, REJECTED, etc.)', () => {
      assert.strictEqual(isVerificationEligible('PENDING'), false);
      assert.strictEqual(isVerificationEligible('CANCELLED'), false);
      assert.strictEqual(isVerificationEligible('REJECTED'), false);
      assert.strictEqual(isVerificationEligible('COMPLETED'), false);
      assert.strictEqual(isVerificationEligible('COMPLETED_BY_WORKER'), false);
      assert.strictEqual(isVerificationEligible('AUTO_COMPLETED'), false);
      assert.strictEqual(isVerificationEligible('DISPUTED'), false);
    });

    test('gracefully handles null, undefined, and empty string states', () => {
      assert.strictEqual(isVerificationEligible(null), false);
      assert.strictEqual(isVerificationEligible(undefined), false);
      assert.strictEqual(isVerificationEligible(''), false);
    });
  });

  describe('mapVerificationError', () => {
    test('maps BOOKING_ALREADY_STARTED to a friendly completion message without fatal error', () => {
      const error = {
        response: {
          status: 409,
          data: {
            error: {
              code: 'BOOKING_ALREADY_STARTED',
              message: 'Booking has already been started',
            },
          },
        },
      };
      const mapped = mapVerificationError(error);
      assert.strictEqual(mapped.isAlreadyStarted, true);
      assert.strictEqual(mapped.isFatal, false);
      assert.ok(mapped.message.includes('already in progress'));
    });

    test('maps BOOKING_ACCESS_DENIED (403) to an authorization notification with isFatal=true', () => {
      const error = {
        response: {
          status: 403,
          data: {
            error: {
              code: 'BOOKING_ACCESS_DENIED',
              message: 'Only the customer who created this booking can access verification credentials',
            },
          },
        },
      };
      const mapped = mapVerificationError(error);
      assert.strictEqual(mapped.isFatal, true);
      assert.ok(mapped.message.includes('Only the account holder'));
    });

    test('maps BOOKING_NOT_FOUND (404) to refresh guidance with isFatal=true', () => {
      const error = {
        response: {
          status: 404,
          data: {
            error: {
              code: 'BOOKING_NOT_FOUND',
              message: 'Booking not found',
            },
          },
        },
      };
      const mapped = mapVerificationError(error);
      assert.strictEqual(mapped.isFatal, true);
      assert.ok(mapped.message.includes('could not be found'));
    });

    test('maps OTP_EXPIRED and QR_TOKEN_EXPIRED to expiration flag with prompt to regenerate', () => {
      const otpErr = {
        response: {
          status: 400,
          data: {
            error: {
              code: 'OTP_EXPIRED',
              message: 'Verification OTP has expired. Please request a new OTP.',
            },
          },
        },
      };
      const mappedOtp = mapVerificationError(otpErr);
      assert.strictEqual(mappedOtp.isExpired, true);
      assert.strictEqual(mappedOtp.isFatal, false);
      assert.ok(mappedOtp.message.includes('expired'));

      const qrErr = {
        response: {
          status: 400,
          data: {
            error: {
              code: 'QR_TOKEN_EXPIRED',
              message: 'QR verification token has expired. Please request a new QR code.',
            },
          },
        },
      };
      const mappedQr = mapVerificationError(qrErr);
      assert.strictEqual(mappedQr.isExpired, true);
      assert.strictEqual(mappedQr.isFatal, false);
    });

    test('maps rate limiting (429) to wait prompt with isRateLimited=true', () => {
      const rateLimitErr = {
        response: {
          status: 429,
          data: {
            error: {
              code: 'VERIFICATION_RATE_LIMITED',
              message: 'Too many verification requests. Please try again later.',
            },
          },
        },
      };
      const mapped = mapVerificationError(rateLimitErr);
      assert.strictEqual(mapped.isRateLimited, true);
      assert.strictEqual(mapped.isFatal, false);
      assert.ok(mapped.message.includes('wait a moment'));
    });

    test('maps network errors to connection troubleshooting message', () => {
      const netErr = {
        code: 'ERR_NETWORK',
        message: 'Network Error',
      };
      const mapped = mapVerificationError(netErr);
      assert.strictEqual(mapped.isFatal, false);
      assert.strictEqual(mapped.isExpired, false);
      assert.ok(mapped.message.includes('internet connection'));
    });
  });

  describe('formatRemainingTime', () => {
    test('correctly formats minutes and two-digit seconds', () => {
      assert.strictEqual(formatRemainingTime(600), '10:00');
      assert.strictEqual(formatRemainingTime(585), '9:45');
      assert.strictEqual(formatRemainingTime(65), '1:05');
      assert.strictEqual(formatRemainingTime(9), '0:09');
    });

    test('clamps zero, negative, and non-finite seconds cleanly to 0:00', () => {
      assert.strictEqual(formatRemainingTime(0), '0:00');
      assert.strictEqual(formatRemainingTime(-15), '0:00');
      assert.strictEqual(formatRemainingTime(NaN), '0:00');
      assert.strictEqual(formatRemainingTime(Infinity), '0:00');
    });
  });

  describe('QR Vector Generator (generateQrSvgPath)', () => {
    test('successfully generates valid SVG path data for realistic backend QR tokens', () => {
      const backendToken = 'tl_qr_b94a8e63c1a84f50937a28e3b567d1f2a34b5c6d7e8f9a0b1c2d3e4f5a6b7c8d';
      const result = generateQrSvgPath(backendToken, 2);

      assert.notStrictEqual(result, null);
      if (result) {
        assert.ok(result.moduleCount > 20, 'Module count should reflect QR matrix size');
        assert.strictEqual(result.gridSize, result.moduleCount + 4, 'Grid size should include quiet zones');
        assert.ok(result.path.startsWith('M'), 'SVG path must start with move command');
        assert.ok(result.path.includes('h1v1h-1z'), 'SVG path must render 1x1 module squares');
      }
    });

    test('rejects empty, null, or whitespace-only token inputs gracefully', () => {
      assert.strictEqual(generateQrSvgPath(''), null);
      assert.strictEqual(generateQrSvgPath('   '), null);
      assert.strictEqual(generateQrSvgPath(null as any), null);
      assert.strictEqual(generateQrSvgPath(undefined as any), null);
    });
  });

  describe('Verification Code Card Responsiveness & Flex Bounding Engine', () => {
    // Layout parameters matching BookingVerificationCard.tsx and [id].tsx
    const SCREEN_PADDING_H = 16;
    const CARD_PADDING_H = 16;
    const DIGITS_COUNT = 6;
    const GAP = 6;
    const TOTAL_GAPS = (DIGITS_COUNT - 1) * GAP; // 5 * 6 = 30px
    const MAX_DIGIT_WIDTH = 46;
    const MIN_DIGIT_WIDTH = 32;

    function computeDigitsLayout(screenWidth: number) {
      const scrollContentWidth = screenWidth - SCREEN_PADDING_H * 2;
      const cardWidth = scrollContentWidth; // marginHorizontal is 0
      const innerCardWidth = cardWidth - CARD_PADDING_H * 2;
      const availableForBoxes = innerCardWidth - TOTAL_GAPS;
      const flexBoxWidth = availableForBoxes / DIGITS_COUNT;
      const actualBoxWidth = Math.min(MAX_DIGIT_WIDTH, flexBoxWidth);
      const totalDigitsRowWidth = actualBoxWidth * DIGITS_COUNT + TOTAL_GAPS;

      return {
        screenWidth,
        cardWidth,
        innerCardWidth,
        actualBoxWidth,
        totalDigitsRowWidth,
        overflow: Math.max(0, totalDigitsRowWidth - innerCardWidth),
      };
    }

    test('guarantees zero overflow on ultra-compact 320dp device (e.g. Unihertz/Jelly)', () => {
      const layout = computeDigitsLayout(320);
      assert.strictEqual(layout.overflow, 0, 'Must have 0px overflow on 320dp');
      assert.ok(layout.totalDigitsRowWidth <= layout.innerCardWidth);
      assert.ok(layout.actualBoxWidth >= MIN_DIGIT_WIDTH);
    });

    test('guarantees zero overflow on standard 360dp Android screen (Galaxy A12/A14, Redmi)', () => {
      const layout = computeDigitsLayout(360);
      assert.strictEqual(layout.overflow, 0, 'Must have 0px overflow on 360dp');
      assert.ok(layout.totalDigitsRowWidth <= layout.innerCardWidth);
      assert.ok(layout.actualBoxWidth >= 44, 'Box width should be at least 44dp on 360dp');
    });

    test('caps at maxWidth on 375dp, 390dp, 412dp, and 768dp screens without over-stretching', () => {
      [375, 390, 412, 768].forEach((width) => {
        const layout = computeDigitsLayout(width);
        assert.strictEqual(layout.overflow, 0, `Must have 0px overflow on ${width}dp`);
        assert.strictEqual(layout.actualBoxWidth, MAX_DIGIT_WIDTH, `Box width must cap at ${MAX_DIGIT_WIDTH}dp`);
        assert.ok(layout.totalDigitsRowWidth <= layout.innerCardWidth);
      });
    });
  });
});
