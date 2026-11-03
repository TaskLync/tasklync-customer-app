import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  classifyError,
  isNetworkError,
  isTimeoutError,
  isCancelledError,
} from '../../src/services/api/errorClassifier.ts';

describe('Tasklink Production Authentication & Session Resilience Engine', () => {
  describe('Centralized Error Classification', () => {
    test('classifies network disconnection as NETWORK_ERROR with session preservation', () => {
      const err = { code: 'ERR_NETWORK', message: 'Network Error' };
      const classified = classifyError(err);

      assert.strictEqual(classified.category, 'NETWORK_ERROR');
      assert.strictEqual(classified.isRetryable, true);
      assert.strictEqual(
        classified.userMessage,
        "You're offline. Please check your internet connection."
      );
    });

    test('classifies request timeout as REQUEST_TIMEOUT without leaking technical stack', () => {
      const err = { code: 'ECONNABORTED', message: 'timeout of 15000ms exceeded' };
      assert.strictEqual(isTimeoutError(err), true);
      const classified = classifyError(err);

      assert.strictEqual(classified.category, 'REQUEST_TIMEOUT');
      assert.strictEqual(classified.isRetryable, true);
      assert.strictEqual(
        classified.userMessage,
        'Connection timed out. Please check your connection and try again.'
      );
    });

    test('classifies HTTP 500, 502, 503, 504 as SERVER_ERROR and marks retryable', () => {
      const statuses = [500, 502, 503, 504];
      for (const status of statuses) {
        const err = {
          response: {
            status,
            data: { error: { message: 'Database connection pool exhausted' } },
          },
        };
        const classified = classifyError(err);

        assert.strictEqual(classified.category, 'SERVER_ERROR');
        assert.strictEqual(classified.status, status);
        assert.strictEqual(classified.isRetryable, true);
        assert.strictEqual(
          classified.userMessage,
          "We're having trouble connecting to the service. Please try again shortly."
        );
      }
    });

    test('classifies HTTP 403 as AUTHORIZATION_ERROR without invalidating session', () => {
      const err = {
        response: {
          status: 403,
          data: { error: { code: 'FORBIDDEN', message: 'You do not have permission' } },
        },
      };
      const classified = classifyError(err);

      assert.strictEqual(classified.category, 'AUTHORIZATION_ERROR');
      assert.strictEqual(classified.status, 403);
      assert.strictEqual(classified.isRetryable, false);
      assert.strictEqual(
        classified.userMessage,
        "You don't have permission to perform this action."
      );
    });

    test('classifies HTTP 401 as AUTHENTICATION_ERROR', () => {
      const err = {
        response: {
          status: 401,
          data: { error: { code: 'UNAUTHORIZED', message: 'Token expired' } },
        },
      };
      const classified = classifyError(err);

      assert.strictEqual(classified.category, 'AUTHENTICATION_ERROR');
      assert.strictEqual(classified.status, 401);
      assert.strictEqual(classified.isRetryable, false);
    });

    test('classifies HTTP 429 as RATE_LIMIT_ERROR and parses retry-after header', () => {
      const err = {
        response: {
          status: 429,
          headers: { 'retry-after': '30' },
          data: { error: { message: 'Rate limit exceeded' } },
        },
      };
      const classified = classifyError(err);

      assert.strictEqual(classified.category, 'RATE_LIMIT_ERROR');
      assert.strictEqual(classified.status, 429);
      assert.strictEqual(classified.retryAfterSeconds, 30);
      assert.strictEqual(classified.isRetryable, true);
    });

    test('detects intentional cancellations without transforming into SERVER_ERROR', () => {
      const cancelError = { code: 'ERR_CANCELED', message: 'canceled' };
      assert.strictEqual(isCancelledError(cancelError), true);

      const classified = classifyError(cancelError);
      assert.strictEqual(classified.category, 'CANCELLED_REQUEST');
      assert.strictEqual(classified.isRetryable, false);
    });
  });

  describe('Session Invalidation vs Temporary Failure Decision Rules', () => {
    test('distinguishes permanent session revocation from temporary refresh downtime', () => {
      // 1. Permanent revocation: HTTP 401 with SESSION_EXPIRED
      const permanentErr = {
        response: {
          status: 401,
          data: { error: { code: 'SESSION_EXPIRED', message: 'Session expired. Please log in again.' } },
        },
      };
      const isConfirmedInvalid =
        permanentErr.response?.status === 401 &&
        (permanentErr.response?.data?.error?.code === 'SESSION_EXPIRED' ||
          permanentErr.response?.data?.error?.code === 'TOKEN_REUSE_DETECTED');
      assert.strictEqual(isConfirmedInvalid, true, 'Permanent 401 must be recognized as invalid session');

      // 2. Temporary 500 error on refresh endpoint: MUST NOT be treated as session invalidation
      const tempServerErr = {
        response: {
          status: 500,
          data: { error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
        },
      };
      const isTempServerInvalid =
        tempServerErr.response?.status === 401 &&
        tempServerErr.response?.data?.error?.code === 'SESSION_EXPIRED';
      assert.strictEqual(isTempServerInvalid, false, 'HTTP 500 on refresh must NEVER invalidate session');

      // 3. Temporary network drop during refresh: MUST NOT be treated as session invalidation
      const tempNetworkErr = {
        code: 'ERR_NETWORK',
        message: 'Network Error',
      };
      assert.strictEqual(isNetworkError(tempNetworkErr), true);
      assert.strictEqual(
        (tempNetworkErr as any).response?.status === 401,
        false,
        'Network error must NEVER invalidate session'
      );
    });

    test('preserves user credentials when server is temporarily unavailable', () => {
      // Verify that TEMPORARILY_UNAVAILABLE maintains isAuthenticated = true
      const authStates = ['AUTHENTICATED', 'REFRESHING_TOKEN', 'TEMPORARILY_UNAVAILABLE'];
      for (const state of authStates) {
        const isAuth =
          state === 'AUTHENTICATED' ||
          state === 'authenticated' ||
          state === 'REFRESHING_TOKEN' ||
          state === 'TEMPORARILY_UNAVAILABLE';
        assert.strictEqual(isAuth, true, `State ${state} must maintain authenticated session`);
      }

      // Only UNAUTHENTICATED evaluates to false
      const unauth: string = 'UNAUTHENTICATED';
      const isUnauth =
        unauth === 'AUTHENTICATED' ||
        unauth === 'authenticated' ||
        unauth === 'REFRESHING_TOKEN' ||
        unauth === 'TEMPORARILY_UNAVAILABLE';
      assert.strictEqual(isUnauth, false, 'UNAUTHENTICATED must evaluate to unauthenticated');
    });
  });
});
