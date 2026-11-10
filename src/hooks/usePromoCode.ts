import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { offersApi } from '../services/api/offers.api';
import { usePromoStore } from '../store/promo.store';
import type { AppliedPromo, BookingQuoteParams, PricingView } from '../types/offers.types';
import {
  discountErrorMessage,
  isCodeInputValid,
  lockoutRemainingMs,
  quoteParamsHash,
  trimCode,
} from '../utils/offers';

const NETWORK_MESSAGE = "Couldn't check the code. Try again.";

/**
 * Promo code at checkout (spec 8.3, 10.2, 10.3).
 *
 * - Apply is explicit (never validates per keystroke) and ignored while a request is in flight.
 * - A change to any booking parameter after a code was applied re-validates it automatically;
 *   until that finishes `isBusy` is true and the price falls back to the undiscounted view.
 * - `codeForSubmit` is only defined when the applied code is priced for the current parameters.
 */
export function usePromoCode(params: BookingQuoteParams | null, enabled: boolean = true) {
  const input = usePromoStore((s) => s.input);
  const status = usePromoStore((s) => s.status);
  const applied = usePromoStore((s) => s.applied);
  const message = usePromoStore((s) => s.message);
  const appliedHash = usePromoStore((s) => s.paramsHash);
  const lockedAt = usePromoStore((s) => s.lockedAt);

  const currentHash = useMemo(() => (params ? quoteParamsHash(params) : null), [params]);

  // Latest values for async callbacks, so a slow response never acts on stale parameters.
  const latest = useRef({ params, currentHash });
  latest.current = { params, currentHash };
  const requestSeq = useRef(0);

  // ── Lockout countdown ──
  const [now, setNow] = useState(() => Date.now());
  const lockRemaining = status === 'locked' ? lockoutRemainingMs(lockedAt, now) : 0;
  const isLocked = status === 'locked' && lockRemaining > 0;

  useEffect(() => {
    if (status !== 'locked') return;
    const remaining = lockoutRemainingMs(usePromoStore.getState().lockedAt);
    if (remaining <= 0) {
      usePromoStore.getState().patch({ status: 'idle', message: null });
      return;
    }
    setNow(Date.now());
    // Re-render once a minute for the copy, and release the lock when the window ends.
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    const release = setTimeout(() => {
      usePromoStore.getState().patch({ status: 'idle', message: null });
    }, remaining);
    return () => {
      clearInterval(tick);
      clearTimeout(release);
    };
  }, [status, lockedAt]);

  /** Previews `code` against the current parameters and records the outcome. A revalidation leaves the typed input alone. */
  const run: (code: string, isRevalidation: boolean) => Promise<void> = useCallback(async (code, isRevalidation) => {
    const snapshot = latest.current;
    if (!snapshot.params || !snapshot.currentHash) return;
    const seq = ++requestSeq.current;
    const store = usePromoStore.getState();
    store.patch({ status: 'validating', message: null });

    try {
      const result = await offersApi.validateCode({ ...snapshot.params, coupon_code: code });
      if (seq !== requestSeq.current) return; // superseded by a newer request or a removal

      // Parameters moved while the request was in flight: this preview is for a different booking.
      if (latest.current.currentHash !== snapshot.currentHash) {
        void run(code, isRevalidation);
        return;
      }

      if (result.valid) {
        const next: AppliedPromo = {
          code,
          displayCode: result.coupon.code,
          title: result.coupon.title,
          endsAt: result.coupon.ends_at,
          funding: result.funding,
          pricing: result.pricing,
          discount: result.discount.applied,
        };
        usePromoStore.getState().patch({
          status: 'applied',
          applied: next,
          message: null,
          paramsHash: snapshot.currentHash,
          ...(isRevalidation ? {} : { input: code }),
        });
        return;
      }

      usePromoStore.getState().patch({
        status: result.reason_code === 'COUPON_ATTEMPTS_LOCKED' ? 'locked' : 'invalid',
        applied: null,
        paramsHash: null,
        message: discountErrorMessage(result.reason_code, result.message),
        ...(result.reason_code === 'COUPON_ATTEMPTS_LOCKED' ? { lockedAt: Date.now() } : {}),
      });
    } catch (err: any) {
      if (seq !== requestSeq.current) return;
      if (err?.code === 'COUPON_ATTEMPTS_LOCKED') {
        usePromoStore.getState().patch({
          status: 'locked',
          applied: null,
          paramsHash: null,
          lockedAt: Date.now(),
          message: discountErrorMessage('COUPON_ATTEMPTS_LOCKED', err?.message),
        });
        return;
      }
      // Network / server trouble is not a code failure (the server only counts genuine wrong codes).
      usePromoStore.getState().patch({
        status: 'error',
        applied: null,
        paramsHash: null,
        message: NETWORK_MESSAGE,
      });
    }
  }, []);

  const setInput = useCallback((text: string) => {
    const s = usePromoStore.getState();
    // Editing after a failure clears the failure; an applied code must be removed first.
    s.patch({
      input: text,
      ...(s.status === 'invalid' || s.status === 'error' ? { status: 'idle' as const, message: null } : {}),
    });
  }, []);

  const apply = useCallback(() => {
    const s = usePromoStore.getState();
    if (s.status === 'validating' || s.status === 'applied') return;
    if (s.status === 'locked' && lockoutRemainingMs(s.lockedAt) > 0) return;
    if (!isCodeInputValid(s.input)) {
      s.patch({ status: 'invalid', message: 'Enter the code exactly as it was given to you.' });
      return;
    }
    if (!latest.current.params) {
      s.patch({
        status: 'invalid',
        message: 'Choose your address and time first, then apply the code.',
      });
      return;
    }
    void run(trimCode(s.input), false);
  }, [run]);

  /** Tap on a coupon card: same server validation as typing the code. */
  const applyCode = useCallback((code: string) => {
    const s = usePromoStore.getState();
    if (s.status === 'validating') return;
    if (s.status === 'applied' && s.applied && s.applied.displayCode.toUpperCase() === code.toUpperCase()) return;
    if (s.status === 'locked' && lockoutRemainingMs(s.lockedAt) > 0) return;
    if (!latest.current.params) {
      s.patch({ status: 'invalid', message: 'Choose your address and time first, then apply the code.' });
      return;
    }
    void run(trimCode(code), false);
  }, [run]);

  const remove = useCallback(() => {
    requestSeq.current += 1; // drop any in-flight preview
    usePromoStore.getState().clearCode();
  }, []);

  /** After a booking failed for a discount reason: drop the code and say why. */
  const rejectApplied = useCallback((reason: string) => {
    requestSeq.current += 1;
    usePromoStore.getState().patch({
      status: 'invalid',
      applied: null,
      paramsHash: null,
      message: reason,
    });
  }, []);

  /** The create call hit the wrong-code lockout: lock the field the same way a validate would. */
  const markLocked = useCallback((reason: string) => {
    requestSeq.current += 1;
    usePromoStore.getState().patch({
      status: 'locked',
      applied: null,
      paramsHash: null,
      lockedAt: Date.now(),
      message: reason,
    });
  }, []);

  const reset = useCallback(() => {
    requestSeq.current += 1;
    usePromoStore.getState().reset();
  }, []);

  // A previewed code is only valid for the parameters it was priced with (8.3 step 7).
  useEffect(() => {
    if (!enabled) return;
    const s = usePromoStore.getState();
    if (s.status === 'applied' && s.applied && s.paramsHash !== currentHash) {
      if (!currentHash) {
        requestSeq.current += 1;
        s.clearCode();
        return;
      }
      void run(s.applied.code, true);
    }
  }, [currentHash, enabled, run]);

  const isCurrent = status === 'applied' && applied !== null && appliedHash === currentHash;
  const pricing: PricingView | null = isCurrent ? applied.pricing : null;

  return {
    input,
    status,
    applied: isCurrent ? applied : null,
    message,
    pricing,
    isBusy: status === 'validating',
    isLocked,
    lockRemainingMs: lockRemaining,
    /** Raw code to send as `coupon_code`; undefined unless the applied code is current. */
    codeForSubmit: isCurrent && applied ? applied.code : undefined,
    setInput,
    apply,
    applyCode,
    remove,
    rejectApplied,
    markLocked,
    reset,
  };
}
