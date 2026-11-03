import { test, describe } from 'node:test';
import assert from 'node:assert';
import { mapOtpVerificationError, mapOtpResendError } from '../../src/utils/authError.ts';

describe('OTP Verification State Machine & Error Mapping Engine', () => {
  describe('Backend Error Mapping to Human-Friendly Messages', () => {
    test('maps 401 Incorrect OTP to user-friendly message and flags isOtpError=true', () => {
      const err = { status: 401, code: 'INVALID_OTP', message: 'The provided OTP is invalid.' };
      const mapped = mapOtpVerificationError(err);

      assert.strictEqual(mapped.message, 'Incorrect verification code. Please try again.');
      assert.strictEqual(mapped.isOtpError, true);
      assert.strictEqual(mapped.status, 401);
    });

    test('maps 410 Expired OTP to prompt for new code and flags isOtpError=true', () => {
      const err = { status: 410, code: 'EXPIRED_OTP', message: 'The code has expired.' };
      const mapped = mapOtpVerificationError(err);

      assert.strictEqual(mapped.message, 'Your code has expired. Request a new code.');
      assert.strictEqual(mapped.isOtpError, true);
    });

    test('maps 429 Rate Limit to wait message and flags isOtpError=true', () => {
      const err = { status: 429, code: 'RATE_LIMIT', message: 'Too many requests' };
      const mapped = mapOtpVerificationError(err);

      assert.strictEqual(mapped.message, 'Too many attempts. Please wait before trying again.');
      assert.strictEqual(mapped.isOtpError, true);
    });

    test('maps network failure to connection troubleshooting message and flags isOtpError=false', () => {
      const err = { isNetworkError: true, code: 'NETWORK_ERROR', message: 'Network Error' };
      const mapped = mapOtpVerificationError(err);

      assert.strictEqual(mapped.message, 'Connection problem. Check your internet and try again.');
      assert.strictEqual(mapped.isOtpError, false);
    });

    test('maps timeout error to connection problem message', () => {
      const err = { isTimeout: true, code: 'TIMEOUT', message: 'Request timed out' };
      const mapped = mapOtpVerificationError(err);

      assert.strictEqual(mapped.message, 'Connection problem. Check your internet and try again.');
      assert.strictEqual(mapped.isOtpError, false);
    });

    test('maps 500 server error to safe message without leaking internal details', () => {
      const err = {
        status: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'NullPointerException at AuthController.java:142',
      };
      const mapped = mapOtpVerificationError(err);

      // Must never expose stack traces or java/server exceptions
      assert.strictEqual(mapped.message, "We couldn't verify your code right now. Please try again.");
      assert.strictEqual(mapped.isOtpError, false);
    });

    test('handles raw axios error structures (err.response.status)', () => {
      const err = {
        response: {
          status: 401,
          data: { code: 'OTP_MISMATCH', message: 'Invalid OTP' },
        },
      };
      const mapped = mapOtpVerificationError(err);

      assert.strictEqual(mapped.message, 'Incorrect verification code. Please try again.');
      assert.strictEqual(mapped.isOtpError, true);
    });
  });

  describe('OTP Resend Error Mapping', () => {
    test('maps network failure on resend', () => {
      const err = { isNetworkError: true };
      const mapped = mapOtpResendError(err);

      assert.strictEqual(mapped.message, 'Connection problem. Check your internet and try again.');
      assert.strictEqual(mapped.isRateLimited, false);
    });

    test('maps rate limit (429) on resend', () => {
      const err = { status: 429, message: 'Too many attempts' };
      const mapped = mapOtpResendError(err);

      assert.strictEqual(mapped.message, 'Too many attempts. Please wait before trying again.');
      assert.strictEqual(mapped.isRateLimited, true);
    });

    test('maps generic resend failure', () => {
      const err = { status: 500 };
      const mapped = mapOtpResendError(err);

      assert.strictEqual(mapped.message, "Couldn't resend the code. Please try again.");
      assert.strictEqual(mapped.isRateLimited, false);
    });
  });

  describe('State Machine & Verification Lock Logic', () => {
    /**
     * Simulates the OTP verification coordinator state machine
     */
    class OTPCoordinator {
      public state: 'idle' | 'verifying' | 'error' | 'success' = 'idle';
      public otp: string = '';
      public inFlight: boolean = false;
      public attemptCount: number = 0;
      public requestExecutions: number = 0;
      public errorMessage: string | null = null;
      public navigationCount: number = 0;

      public onOtpChange(newVal: string) {
        if (this.state === 'error') {
          this.state = 'idle';
          this.errorMessage = null;
        }
        this.otp = newVal.slice(0, 6);
      }

      public async submitVerification(apiFn: (code: string) => Promise<{ success: boolean; error?: string }>) {
        if (this.inFlight || this.state === 'verifying' || this.state === 'success') {
          return; // Prevent duplicate execution
        }
        if (this.otp.length < 6) {
          return; // Do not submit incomplete codes
        }

        this.inFlight = true;
        const currentAttempt = ++this.attemptCount;
        this.state = 'verifying';
        this.errorMessage = null;

        try {
          this.requestExecutions++;
          const result = await apiFn(this.otp);

          if (currentAttempt !== this.attemptCount) {
            return; // Discard stale response
          }

          if (result.success) {
            this.state = 'success';
            this.navigationCount++;
          } else {
            this.state = 'error';
            this.errorMessage = result.error || 'Incorrect verification code. Please try again.';
          }
        } finally {
          this.inFlight = false;
        }
      }
    }

    test('does not submit verification when OTP is incomplete (less than 6 digits)', async () => {
      const coord = new OTPCoordinator();
      coord.onOtpChange('12345');

      await coord.submitVerification(async () => ({ success: true }));

      assert.strictEqual(coord.requestExecutions, 0);
      assert.strictEqual(coord.state, 'idle');
    });

    test('prevents duplicate requests when submit is invoked concurrently or rapidly', async () => {
      const coord = new OTPCoordinator();
      coord.onOtpChange('123456');

      // Simulate a 50ms asynchronous backend verification
      const slowApi = () => new Promise<{ success: boolean }>((resolve) => {
        setTimeout(() => resolve({ success: true }), 50);
      });

      // Rapidly fire multiple submission calls simultaneously
      const p1 = coord.submitVerification(slowApi);
      const p2 = coord.submitVerification(slowApi);
      const p3 = coord.submitVerification(slowApi);

      await Promise.all([p1, p2, p3]);

      // Exactly 1 backend call must have executed
      assert.strictEqual(coord.requestExecutions, 1);
      assert.strictEqual(coord.state, 'success');
      assert.strictEqual(coord.navigationCount, 1);
    });

    test('transitions to error state without fake success on incorrect OTP', async () => {
      const coord = new OTPCoordinator();
      coord.onOtpChange('000000');

      await coord.submitVerification(async () => ({
        success: false,
        error: 'Incorrect verification code. Please try again.',
      }));

      // State MUST be error, NOT success
      assert.strictEqual(coord.state, 'error');
      assert.strictEqual(coord.inFlight, false);
      assert.strictEqual(coord.errorMessage, 'Incorrect verification code. Please try again.');
      assert.strictEqual(coord.navigationCount, 0);
    });

    test('clears error state to idle immediately when user edits or deletes a digit', async () => {
      const coord = new OTPCoordinator();
      coord.onOtpChange('000000');

      await coord.submitVerification(async () => ({
        success: false,
        error: 'Incorrect verification code. Please try again.',
      }));

      assert.strictEqual(coord.state, 'error');

      // User presses backspace to delete the last digit
      coord.onOtpChange('00000');

      assert.strictEqual(coord.state, 'idle');
      assert.strictEqual(coord.errorMessage, null);
      assert.strictEqual(coord.otp, '00000');
    });

    test('discards stale response if user initiated a newer attempt', async () => {
      const coord = new OTPCoordinator();
      coord.onOtpChange('111111');

      let resolveFirstAttempt: (res: { success: boolean; error?: string }) => void = () => {};
      const delayedFirstApi = () => new Promise<{ success: boolean; error?: string }>((resolve) => {
        resolveFirstAttempt = resolve;
      });

      const p1 = coord.submitVerification(delayedFirstApi);

      // User modifies OTP and starts attempt 2
      coord.attemptCount++; // Simulates new attempt or resend invalidation
      coord.inFlight = false;

      // First attempt finally finishes with error
      resolveFirstAttempt({ success: false, error: 'Stale error' });
      await p1;

      // Stale response must be discarded; state should not be overwritten to error
      assert.strictEqual(coord.errorMessage, null);
    });
  });
});
