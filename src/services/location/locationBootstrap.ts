import { useLocationStore } from '../../store/location.store';
import { locationService } from './location.service';
import { resolveCurrentAddress } from './currentAddress';
import { trackLocationEvent, startTimer } from './locationTelemetry';
import { isValidCoordinate } from '../../utils/locationUtils';
import { LOCATION_THRESHOLDS } from '../../utils/locationConfidence';
import type { VerifiedLocation } from '../../types/location.types';

/**
 * Non-blocking device-location pipeline shared by onboarding, the home screen and the live map.
 *
 *  1. OS last-known fix (no GPS session, typically < 100 ms) → `currentLocation`, flagged
 *     `device-cache`, so the home screen can show nearby workers immediately.
 *  2. Fresh GPS acquisition (bounded by its own timeout) → `setLiveLocation`, flagged `gps`.
 *     With approximate permission / weak signal the real low-confidence fix is applied honestly
 *     as `approximate`. Never a hardcoded or invented position.
 *  3. Reverse geocoding runs after each applied fix and never blocks anything.
 *
 * One run at a time: concurrent callers share the in-flight promise, so onboarding + HomeHeader +
 * live map never start parallel hardware sessions. Nothing here navigates or shows a blocking
 * loader; failures leave the UI on its honest "Select location" state. The promise never rejects.
 */

const HINT_TIMEOUT_MS = 1500;

let inflight: Promise<void> | null = null;
const freshFixListeners = new Set<(fix: VerifiedLocation) => void>();

const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    p,
    new Promise<T>((resolve) => {
      timer = setTimeout(() => resolve(fallback), ms);
    }),
  ]).finally(() => clearTimeout(timer));
};

/** A fix only replaces what we have if nothing newer was recorded meanwhile (stale results lose). */
function isNewerThanStored(fix: VerifiedLocation): boolean {
  const stored = useLocationStore.getState().locationFix;
  return !stored || fix.timestamp >= stored.timestamp;
}

function applyLowConfidence(fix: VerifiedLocation, source: 'device-cache' | 'approximate'): boolean {
  const store = useLocationStore.getState();
  // A verified GPS fix from this session always beats a cached / approximate one.
  if (store.locationFix?.source === 'gps') return false;
  if (!isValidCoordinate(fix) || !isNewerThanStored(fix)) return false;
  store.setCurrentLocation({ lat: fix.lat, lng: fix.lng });
  store.setLocationFix({ source, accuracy: fix.accuracy, timestamp: fix.timestamp });
  return true;
}

/** Street-level text for a ±km fix would mislead; only geocode reasonably tight fixes. */
function maybeResolveAddress(fix: VerifiedLocation) {
  if (fix.accuracy <= LOCATION_THRESHOLDS.autoGeocodeMaxAccuracyM) void resolveCurrentAddress(fix);
}

export interface LocationBootstrapOptions {
  /** Called if this run (or the run it joins) lands a fresh GPS fix. */
  onFreshFix?: (fix: VerifiedLocation) => void;
}

export function startLocationBootstrap(options: LocationBootstrapOptions = {}): Promise<void> {
  if (options.onFreshFix) freshFixListeners.add(options.onFreshFix);
  if (inflight) return inflight;

  const run = (async () => {
    const elapsed = startTimer();
    // Only show the subtle "Locating..." label when there is nothing at all to show yet.
    if (!useLocationStore.getState().currentLocation) useLocationStore.getState().setIsLocating(true);

    try {
      // Step 1 — instant: OS cached fix (bounded; never marked live / "you are here").
      const hint = await withTimeout(locationService.getMapCentreHint(), HINT_TIMEOUT_MS, null);
      if (hint && applyLowConfidence(hint, 'device-cache')) {
        useLocationStore.getState().setIsLocating(false);
        trackLocationEvent('location_acquire', { outcome: 'cached', ms: elapsed(), accuracy_m: Math.round(hint.accuracy) });
        maybeResolveAddress(hint);
      }

      // Step 2 — fresh GPS (bounded by acquireFreshGPSPosition's own timeout).
      const result = await locationService.acquireFreshGPSPosition();
      if (result.success) {
        const fix = result.location;
        if (isValidCoordinate(fix) && isNewerThanStored(fix)) {
          const s = useLocationStore.getState();
          s.setLiveLocation({ lat: fix.lat, lng: fix.lng }, { accuracy: fix.accuracy, timestamp: fix.timestamp });
          maybeResolveAddress(fix);
          freshFixListeners.forEach((l) => {
            try {
              l(fix);
            } catch {
              /* a listener must never break the pipeline */
            }
          });
        }
        trackLocationEvent('location_acquire', { outcome: 'fresh', ms: elapsed(), accuracy_m: Math.round(fix.accuracy) });
        return;
      }

      // Approximate permission / weak signal: use the real fix honestly; a later refresh refines it.
      const approx = result.error.approximateLocation;
      if (approx && applyLowConfidence(approx, 'approximate')) maybeResolveAddress(approx);
      trackLocationEvent('location_acquire', { outcome: result.error.code, ms: elapsed() });
    } catch {
      // Never throw into UI code; the home screen stays usable with whatever it already has.
    } finally {
      freshFixListeners.clear();
      useLocationStore.getState().setIsLocating(false);
    }
  })();

  inflight = run.finally(() => {
    inflight = null;
  });
  return inflight;
}
