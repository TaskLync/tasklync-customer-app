/**
 * Resolves where a provider's avatar should lead. Pure (no React / router imports) so it is unit-testable.
 *
 * Individual workers open `/worker/[id]`; agencies (provider_type COMPANY) open `/company/[id]`, the
 * same split WorkerListRow already uses. Both screens load the profile from the id alone.
 */

import { CANONICAL_FALLBACK_UUIDS } from './uuid';

/**
 * Values that mean "no real worker": empty / stringified-nullish values from loosely-typed payloads and
 * route params, plus the placeholder worker UUID used before a booking has an assigned worker.
 */
const EMPTY_ID_TOKENS = new Set(['', 'undefined', 'null', 'nan', '0', CANONICAL_FALLBACK_UUIDS.WORKER_DEFAULT]);

export function normalizeWorkerId(id: unknown): string | null {
  if (typeof id === 'number') {
    return Number.isFinite(id) && id > 0 ? String(id) : null;
  }
  if (typeof id !== 'string') return null;
  const trimmed = id.trim();
  if (EMPTY_ID_TOKENS.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

/** True when a (possibly partial) profile payload describes an agency. Unknown → false. */
export function isCompanyProfile(profile: unknown): boolean {
  if (!profile || typeof profile !== 'object') return false;
  const p = profile as Record<string, unknown>;
  return p.is_company === true || p.isCompany === true || p.provider_type === 'COMPANY' || p.providerType === 'COMPANY';
}

export type WorkerProfileHref =
  | { pathname: '/worker/[id]'; params: { id: string } }
  | { pathname: '/company/[id]'; params: { id: string } };

interface StackStateLike {
  index?: number;
  routes?: readonly { name?: string; params?: object | undefined }[];
}

/**
 * True when the screen directly below the current one is this exact profile (e.g. the avatar in a chat
 * or request opened from that worker's profile). Going back then keeps history clean instead of
 * stacking a duplicate profile.
 */
export function isProfileBelowCurrent(state: StackStateLike | undefined, href: WorkerProfileHref): boolean {
  if (!state?.routes || typeof state.index !== 'number' || state.index < 1) return false;
  const below = state.routes[state.index - 1];
  const belowId = (below?.params as { id?: unknown } | undefined)?.id;
  return below?.name === href.pathname.slice(1) && normalizeWorkerId(belowId) === href.params.id;
}

/**
 * "Book again" target for a past booking: the profile of the provider who was booked, from the booking's
 * own `worker_id` (agencies open their company profile). Null when the booking never had a real provider.
 */
export function getBookAgainHref(booking: {
  worker_id?: unknown;
  is_company?: boolean | undefined;
  provider_type?: string | undefined;
}): WorkerProfileHref | null {
  return getWorkerProfileHref(booking.worker_id, Boolean(booking.is_company || booking.provider_type === 'COMPANY'));
}

export function getWorkerProfileHref(id: unknown, isCompany = false): WorkerProfileHref | null {
  const safeId = normalizeWorkerId(id);
  if (!safeId) return null;
  return isCompany
    ? { pathname: '/company/[id]', params: { id: safeId } }
    : { pathname: '/worker/[id]', params: { id: safeId } };
}
