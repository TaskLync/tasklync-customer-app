/**
 * Location telemetry: a tiny in-process event recorder (no new dependency).
 *
 * - Never records coordinates or address text — only outcomes, providers, durations and radii.
 * - Keeps the last 200 events in memory (for debugging / support screens) and fans out to any
 *   subscriber, so a real analytics sink can be attached in one place later.
 * - In development builds it also logs a compact line to the console.
 */

export type LocationEventName =
  | 'location_acquire' // { outcome, ms, accuracy_m?, precision }
  | 'geocode' // { provider, ms, resolved, tier? }
  | 'search' // { provider, ms, results }
  | 'place_details' // { provider, ms, ok }
  | 'provider_down' // { provider, reason }
  | 'address_saved' // { source, accuracy_m?, pin_shift_m?, has_details }
  | 'address_save_failed' // { reason }
  | 'map_load_timeout'; // { ms }

export interface LocationEvent {
  name: LocationEventName;
  at: number;
  props: Record<string, string | number | boolean | null>;
}

const MAX_EVENTS = 200;
const events: LocationEvent[] = [];
const listeners = new Set<(e: LocationEvent) => void>();

declare const __DEV__: boolean | undefined;

export function trackLocationEvent(name: LocationEventName, props: LocationEvent['props'] = {}): void {
  const e: LocationEvent = { name, at: Date.now(), props };
  events.push(e);
  if (events.length > MAX_EVENTS) events.shift();
  listeners.forEach((l) => {
    try {
      l(e);
    } catch {
      /* a broken sink must never break location flows */
    }
  });
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.info(`[loc] ${name}`, props);
  }
}

export function subscribeLocationEvents(listener: (e: LocationEvent) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getRecentLocationEvents(): readonly LocationEvent[] {
  return events.slice();
}

/** Measure an async operation: `const stop = startTimer(); … stop()` → elapsed ms. */
export function startTimer(): () => number {
  const t0 = Date.now();
  return () => Date.now() - t0;
}
