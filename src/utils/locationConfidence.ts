/**
 * Pure location-confidence rules (no React Native imports → unit-testable under node).
 *
 * The one rule everything here serves: a GPS fix may MOVE THE MAP; only a pin the customer has
 * confirmed may become an address. Thresholds are starting values per use case and must be
 * calibrated on real devices (audit doc 05 §5) — they are not claims about what a phone can do.
 */

export type PermissionPrecision = 'precise' | 'approximate' | 'unknown';

/** Shape of expo-location's permission response that matters here (kept structural for tests). */
export interface PermissionLike {
  granted?: boolean;
  android?: { accuracy?: 'fine' | 'coarse' | 'none' } | undefined;
  ios?: { accuracy?: 'full' | 'reduced' } | undefined;
}

/** Android 12+ "Approximate" and iOS 14+ "Precise: off" both grant only ~km-level fixes. */
export function classifyPermissionPrecision(p: PermissionLike | null | undefined): PermissionPrecision {
  if (!p || !p.granted) return 'unknown';
  const a = p.android?.accuracy;
  if (a === 'coarse') return 'approximate';
  if (a === 'fine') return 'precise';
  const i = p.ios?.accuracy;
  if (i === 'reduced') return 'approximate';
  if (i === 'full') return 'precise';
  return 'unknown';
}

export interface FixSample {
  lat: number;
  lng: number;
  /** Horizontal accuracy radius in metres. */
  accuracy: number;
  /** Epoch ms when the provider produced the fix. */
  timestamp: number;
  isMocked?: boolean;
}

/**
 * Use-case thresholds.
 *  - pin:    seeding the address pin (user still confirms) — needs a street-level fix
 *  - centre: centring the map / discovery only — never resolved into an address automatically
 */
export const LOCATION_THRESHOLDS = {
  pin: { targetAccuracyM: 20, maxAccuracyM: 35, maxAgeMs: 10_000 },
  centre: { maxAccuracyM: 150, maxAgeMs: 2 * 60_000 },
  /** An approximate-permission fix is only good for showing the right part of the city. */
  centreApproximate: { maxAccuracyM: 3_000, maxAgeMs: 5 * 60_000 },
  /** Above this radius we do not auto-resolve a street address for the point (it would mislead). */
  autoGeocodeMaxAccuracyM: 50,
} as const;

export type FixTier = 'verified' | 'acceptable' | 'approximate' | 'rejected';

/**
 * verified    ≤ pin target (20 m)        → may pre-place the pin
 * acceptable  ≤ pin max (35 m)           → may pre-place the pin
 * approximate ≤ centre max (150 m)       → centre the map only, flagged "approximate"
 * rejected    stale / mocked / invalid / worse than that
 */
export function classifyFix(
  s: FixSample | null | undefined,
  now: number,
  opts: { allowMock?: boolean; precision?: PermissionPrecision } = {}
): FixTier {
  if (!s || !Number.isFinite(s.lat) || !Number.isFinite(s.lng)) return 'rejected';
  if (Math.abs(s.lat) > 90 || Math.abs(s.lng) > 180 || (s.lat === 0 && s.lng === 0)) return 'rejected';
  if (!Number.isFinite(s.accuracy) || s.accuracy < 0) return 'rejected';
  if (s.isMocked && !opts.allowMock) return 'rejected';
  const age = now - s.timestamp;
  if (opts.precision === 'approximate') {
    const t = LOCATION_THRESHOLDS.centreApproximate;
    return age <= t.maxAgeMs && s.accuracy <= t.maxAccuracyM ? 'approximate' : 'rejected';
  }
  if (age <= LOCATION_THRESHOLDS.pin.maxAgeMs) {
    if (s.accuracy <= LOCATION_THRESHOLDS.pin.targetAccuracyM) return 'verified';
    if (s.accuracy <= LOCATION_THRESHOLDS.pin.maxAccuracyM) return 'acceptable';
  }
  if (age <= LOCATION_THRESHOLDS.centre.maxAgeMs && s.accuracy <= LOCATION_THRESHOLDS.centre.maxAccuracyM) {
    return 'approximate';
  }
  return 'rejected';
}

export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** Displacement is suspicious when it is far larger than both fixes' combined uncertainty. */
export const JUMP_SIGMA = 3;
/** Never call sub-this-distance movements a jump (normal jitter / walking). */
export const JUMP_MIN_M = 50;

/**
 * True when `b` is inconsistent with `a`: they are further apart than JUMP_SIGMA × the combined
 * accuracy radius (and more than JUMP_MIN_M), and the time between them is too short to have
 * travelled that far at a plausible urban speed (≤ 30 m/s).
 */
export function isLocationJump(a: FixSample, b: FixSample): boolean {
  const d = distanceM(a, b);
  if (d <= JUMP_MIN_M) return false;
  const combined = Math.sqrt(a.accuracy ** 2 + b.accuracy ** 2);
  if (d <= JUMP_SIGMA * combined) return false;
  const dtS = Math.abs(b.timestamp - a.timestamp) / 1000;
  return d > 30 * Math.max(dtS, 1);
}

/**
 * Picks the most accurate sample that is corroborated by at least one other sample (not a jump
 * relative to it). With a single sample it is returned as-is (nothing to compare against).
 * Returns null for an empty list.
 */
export function pickBestConsistentSample(samples: FixSample[]): FixSample | null {
  if (samples.length === 0) return null;
  if (samples.length === 1) return samples[0]!;
  const consistent = samples.filter((s) => samples.some((o) => o !== s && !isLocationJump(o, s)));
  const pool = consistent.length > 0 ? consistent : samples;
  return pool.reduce((best, s) => (s.accuracy < best.accuracy ? s : best));
}

/**
 * Whether a fresh sample may settle an acquisition immediately: it must hit the target accuracy
 * AND not be a jump relative to the previous sample in the same acquisition (a lone outlier with a
 * small reported radius — multipath in dense streets — waits for one more corroborating sample).
 */
export function canSettleImmediately(candidate: FixSample, previous: FixSample | null, targetAccuracyM: number): boolean {
  if (candidate.accuracy > targetAccuracyM) return false;
  if (!previous) return true;
  return !isLocationJump(previous, candidate);
}

/** "Pin is 240 m from you" helper — null when either point is missing. */
export function pinShiftMeters(
  pin: { lat: number; lng: number } | null | undefined,
  gps: { lat: number; lng: number } | null | undefined
): number | null {
  if (!pin || !gps) return null;
  if (![pin.lat, pin.lng, gps.lat, gps.lng].every(Number.isFinite)) return null;
  return Math.round(distanceM(pin, gps));
}
