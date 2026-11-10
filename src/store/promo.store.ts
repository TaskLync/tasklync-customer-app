import { create } from 'zustand';
import type { AppliedPromo, PromoStatus } from '../types/offers.types';

/**
 * Checkout promo-code slice (spec 10.2). Memory only, never persisted: a preview is non-binding
 * and can expire or run out before the booking is created.
 * `lockedAt` lives here so the wrong-code lockout survives leaving and re-entering the screen.
 */
export interface PromoState {
  input: string;
  status: PromoStatus;
  applied: AppliedPromo | null;
  /** Server message for invalid / locked / error states. */
  message: string | null;
  /** Hash of the booking parameters the applied code was priced for. */
  paramsHash: string | null;
  lockedAt: number | null;

  patch: (partial: Partial<Omit<PromoState, 'patch' | 'reset' | 'clearCode'>>) => void;
  /** Drops the applied code and any message but keeps the lockout timer. */
  clearCode: () => void;
  reset: () => void;
}

const EMPTY = {
  input: '',
  status: 'idle' as PromoStatus,
  applied: null,
  message: null,
  paramsHash: null,
};

export const usePromoStore = create<PromoState>((set) => ({
  ...EMPTY,
  lockedAt: null,
  patch: (partial) => set(partial),
  clearCode: () => set({ ...EMPTY }),
  reset: () => set({ ...EMPTY, lockedAt: null }),
}));
