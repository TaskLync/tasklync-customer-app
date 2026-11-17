/**
 * Per-provider circuit breaker for geocoding / search providers (pure, unit-testable).
 *
 * A denied project (billing off, API not enabled, key restricted) or a quota/rate-limit answer is
 * not going to fix itself in a second: once seen, the provider is skipped for a cooldown instead of
 * costing a failing round-trip on every keystroke / pin move (audit LOC-001). Plain network errors
 * only count towards a smaller threshold so a single dropped request does not disable a provider.
 */

export type GeoProvider = 'proxy' | 'proxy_search' | 'google_geocode' | 'places_new' | 'places_legacy' | 'osm';

export type FailureKind = 'denied' | 'quota' | 'not_deployed' | 'network' | 'server';

interface State {
  failures: number;
  downUntil: number;
  lastReason: FailureKind | null;
}

export const PROVIDER_COOLDOWN_MS: Record<FailureKind, number> = {
  denied: 10 * 60_000, // billing / key / API-not-enabled
  quota: 2 * 60_000,
  not_deployed: 30 * 60_000, // backend endpoint missing (older backend)
  network: 30_000,
  server: 30_000,
};
/** Consecutive soft failures (network / 5xx) before a provider is skipped. */
export const SOFT_FAILURE_THRESHOLD = 3;

export function createProviderHealth(now: () => number = Date.now) {
  const states = new Map<GeoProvider, State>();
  const get = (p: GeoProvider): State => {
    let s = states.get(p);
    if (!s) {
      s = { failures: 0, downUntil: 0, lastReason: null };
      states.set(p, s);
    }
    return s;
  };

  return {
    isAvailable(p: GeoProvider): boolean {
      return now() >= get(p).downUntil;
    },
    recordSuccess(p: GeoProvider): void {
      const s = get(p);
      s.failures = 0;
      s.downUntil = 0;
      s.lastReason = null;
    },
    /** Returns true when this failure took the provider out of rotation. */
    recordFailure(p: GeoProvider, kind: FailureKind): boolean {
      const s = get(p);
      s.lastReason = kind;
      const hard = kind === 'denied' || kind === 'quota' || kind === 'not_deployed';
      s.failures += 1;
      if (hard || s.failures >= SOFT_FAILURE_THRESHOLD) {
        s.downUntil = now() + PROVIDER_COOLDOWN_MS[kind];
        s.failures = 0;
        return true;
      }
      return false;
    },
    lastReason(p: GeoProvider): FailureKind | null {
      return get(p).lastReason;
    },
    reset(): void {
      states.clear();
    },
  };
}

export type ProviderHealth = ReturnType<typeof createProviderHealth>;

/** Classify a Google Maps web-service answer (Geocoding / legacy Places `status` or HTTP code). */
export function classifyGoogleFailure(httpStatus: number, apiStatus?: unknown): FailureKind | null {
  if (apiStatus === 'REQUEST_DENIED' || httpStatus === 401 || httpStatus === 403) return 'denied';
  if (apiStatus === 'OVER_QUERY_LIMIT' || apiStatus === 'OVER_DAILY_LIMIT' || httpStatus === 429) return 'quota';
  if (apiStatus === 'UNKNOWN_ERROR' || httpStatus >= 500) return 'server';
  return null;
}

/** App-wide instance. */
export const providerHealth = createProviderHealth();
