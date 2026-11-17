import * as Location from 'expo-location';
import Constants from 'expo-constants';
import type { ReverseGeocodeResult } from '../../types/address.types';
import {
  googleCandidates,
  nominatimCandidates,
  selectBestAddress,
  type AddressCandidate,
  type AddressTier,
} from '../../utils/addressSelect';
import { proxyReverseGeocode } from './geoProxy';
import { providerHealth, classifyGoogleFailure } from './providerHealth';
import { trackLocationEvent, startTimer } from '../location/locationTelemetry';
import { createSharedRequests } from '../../utils/sharedRequest';

/**
 * Single entry point for coordinates → human-readable address.
 *
 *  1. Backend geo proxy (server key, server cache, Google-first + OSM fallback) — preferred.
 *  2. Direct Google Geocoding — only while a client key is configured AND Google accepts it
 *     (a restricted SDK key is denied once and then skipped by the circuit breaker).
 *  3. Direct OpenStreetMap Nominatim — only when Google is unavailable or gave nothing better than
 *     an area (it is serialised at 1 req/s, so it must not sit on every lookup's critical path).
 *  4. Native platform geocoder.
 *  5. Honest coordinates fallback — never an invented address.
 *
 * Results are cached per ~1 m cell for this app session; concurrent identical lookups share one
 * request, and that shared request is cancelled once every caller waiting on it has given up (so a
 * flurry of pin moves never builds a backlog in the OSM queue).
 */

const GOOGLE_TIMEOUT_MS = 6000;
const OSM_TIMEOUT_MS = 6000;
/** OSM (ODbL) results may be kept for the session; Google content only briefly (Maps Platform terms). */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const GOOGLE_CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX = 200;
/** Public Nominatim allows max 1 request/second. */
const OSM_MIN_INTERVAL_MS = 1100;
const OSM_BACKOFF_MS = 60_000;
const WEAK_TIERS: AddressTier[] = ['locality', 'city'];

const DEFAULT_NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

const cache = new Map<string, { at: number; ttl: number; value: ReverseGeocodeResult }>();
/** Identical concurrent lookups share one request; it is cancelled once nobody waits for it. */
const inflight = createSharedRequests<ReverseGeocodeResult>();

let osmChain: Promise<unknown> = Promise.resolve();
let osmLastAt = 0;
let osmBlockedUntil = 0;

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function googleKey(): string {
  const k =
    Constants.expoConfig?.extra?.googleMapsKey ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ||
    process.env.GOOGLE_MAPS_KEY ||
    '';
  return k && k !== 'your_key_here' ? k : '';
}

function nominatimBase(): string {
  const configured = process.env.EXPO_PUBLIC_NOMINATIM_URL || Constants.expoConfig?.extra?.nominatimUrl;
  const base = typeof configured === 'string' && configured.trim() ? configured.trim() : DEFAULT_NOMINATIM_URL;
  return base.replace(/\/+$/, '');
}

/**
 * Address text language. Stored addresses are read by workers and support, so one canonical
 * language (default English) is used instead of whatever the customer's phone is set to.
 */
function geocodeLanguage(): string {
  const configured = Constants.expoConfig?.extra?.geocodeLanguage;
  return typeof configured === 'string' && configured.trim() ? configured.trim() : 'en';
}

function abortError(): Error {
  const e = new Error('Aborted');
  e.name = 'AbortError';
  return e;
}

/** fetch with a timeout that also honours the caller's abort signal. */
async function fetchJson(url: string, timeoutMs: number, signal?: AbortSignal, headers?: Record<string, string>) {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, ...(headers ? { headers } : {}) });
    return { status: res.status, json: res.ok ? await res.json().catch(() => null) : null };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/** null = provider unavailable / failed (distinct from "answered with nothing"). */
async function fromGoogle(lat: number, lng: number, signal: AbortSignal): Promise<AddressCandidate[] | null> {
  const key = googleKey();
  if (!key || !providerHealth.isAvailable('google_geocode')) return null;
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}` +
    `&language=${encodeURIComponent(geocodeLanguage())}&key=${key}`;
  try {
    const { status, json } = await fetchJson(url, GOOGLE_TIMEOUT_MS, signal);
    const failure = classifyGoogleFailure(status, json?.status);
    if (failure) {
      if (providerHealth.recordFailure('google_geocode', failure)) {
        trackLocationEvent('provider_down', { provider: 'google_geocode', reason: failure });
      }
      return null;
    }
    providerHealth.recordSuccess('google_geocode');
    return googleCandidates(json, lat, lng); // ZERO_RESULTS → []
  } catch (e) {
    if (signal.aborted) throw e;
    providerHealth.recordFailure('google_geocode', 'network');
    return null;
  }
}

/** Serialises Nominatim calls so we never exceed the 1 req/s public usage policy. */
function fromOsm(lat: number, lng: number, signal: AbortSignal): Promise<AddressCandidate[] | null> {
  if (Date.now() < osmBlockedUntil) return Promise.resolve(null);

  const run = async (): Promise<AddressCandidate[] | null> => {
    // Dropped while queued (every caller moved on): never spend a rate-limited request on it.
    if (signal.aborted) throw abortError();
    if (Date.now() < osmBlockedUntil) return null;
    const wait = osmLastAt + OSM_MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    if (signal.aborted) throw abortError();
    osmLastAt = Date.now();

    const url =
      `${nominatimBase()}/reverse?format=jsonv2&addressdetails=1&namedetails=1&zoom=18` +
      `&lat=${lat}&lon=${lng}&accept-language=${encodeURIComponent(geocodeLanguage())}`;
    try {
      const { status, json } = await fetchJson(url, OSM_TIMEOUT_MS, signal, {
        Accept: 'application/json',
        'User-Agent': 'TaskLync-Customer-App',
      });
      if (status === 429 || status === 403) {
        osmBlockedUntil = Date.now() + OSM_BACKOFF_MS;
        trackLocationEvent('provider_down', { provider: 'osm', reason: status === 429 ? 'quota' : 'denied' });
        return null;
      }
      if (status !== 200) return null;
      return nominatimCandidates(json, lat, lng);
    } catch (e) {
      if (signal.aborted) throw e;
      return null;
    }
  };

  const p = osmChain.then(run, run);
  osmChain = p.catch(() => undefined);
  return p;
}

async function fromNative(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const item = results?.[0];
    if (!item) return null;
    const street = [item.streetNumber, item.street].filter(Boolean).join(' ');
    const name = item.name && item.name !== item.street ? item.name : '';
    const city = item.city?.trim() || item.district?.trim() || item.subregion?.trim() || '';
    const parts: string[] = [];
    for (const p of [name, street, item.district, item.subregion, city]) {
      const t = (p || '').trim();
      if (t && !parts.some((x) => x.toLowerCase() === t.toLowerCase())) parts.push(t);
    }
    if (parts.length === 0) return null;
    const country = item.country || '';
    const line = parts.join(', ');
    return {
      formatted_address: [line, country].filter(Boolean).join(', '),
      address_line: line,
      city,
      country,
      lat,
      lng,
      source: 'native',
    };
  } catch {
    return null;
  }
}

function coordinatesFallback(lat: number, lng: number): ReverseGeocodeResult {
  const coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  return {
    formatted_address: `Pin Location (${coords})`,
    address_line: `Location (${coords})`,
    city: '',
    country: '',
    lat,
    lng,
    source: 'coordinates',
  };
}

async function resolveUncached(lat: number, lng: number, signal: AbortSignal): Promise<ReverseGeocodeResult> {
  const stop = startTimer();

  // 1. Backend proxy
  const proxied = await proxyReverseGeocode(lat, lng, signal);
  if (signal.aborted) throw abortError();
  if (proxied?.resolved && proxied.address_line) {
    trackLocationEvent('geocode', { provider: `proxy_${proxied.source ?? 'unknown'}`, ms: stop(), resolved: true, tier: proxied.tier });
    return {
      formatted_address: proxied.formatted_address || proxied.address_line,
      address_line: proxied.address_line,
      city: proxied.city || '',
      country: proxied.country || '',
      area: proxied.area || '',
      lat,
      lng,
      source: proxied.source ?? 'google',
      tier: (proxied.tier as AddressTier | null) ?? undefined,
    };
  }

  // 2/3. Direct providers (only if the proxy could not answer at all)
  if (!proxied) {
    const g = await fromGoogle(lat, lng, signal);
    if (signal.aborted) throw abortError();
    const googleBest = g ? selectBestAddress(g, lat, lng) : null;
    const needOsm = !googleBest || WEAK_TIERS.includes(googleBest.tier);
    const o = needOsm ? await fromOsm(lat, lng, signal) : null;
    if (signal.aborted) throw abortError();

    const best = selectBestAddress([...(g ?? []), ...(o ?? [])], lat, lng);
    if (best) {
      trackLocationEvent('geocode', { provider: best.source, ms: stop(), resolved: true, tier: best.tier });
      return { ...best.result, source: best.source, tier: best.tier };
    }
  }

  // 4. Native geocoder
  const native = await fromNative(lat, lng);
  if (signal.aborted) throw abortError();
  if (native) {
    trackLocationEvent('geocode', { provider: 'native', ms: stop(), resolved: true });
    return native;
  }

  // 5. Honest fallback
  trackLocationEvent('geocode', { provider: 'none', ms: stop(), resolved: false });
  return coordinatesFallback(lat, lng);
}

export function isResolvedAddress(r: ReverseGeocodeResult | null | undefined): boolean {
  return !!r && r.source !== 'coordinates';
}

/**
 * Resolve actual coordinates into the best readable address. Rejects with an AbortError only when
 * the caller aborts; provider failures degrade to the next provider / honest fallback instead.
 */
export async function resolveAddress(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<ReverseGeocodeResult> {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    throw new Error('Invalid coordinates');
  }
  if (signal?.aborted) throw abortError();

  const key = cacheKey(lat, lng);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) {
    // refresh LRU position; always report the exact coordinates that were asked for
    cache.delete(key);
    cache.set(key, hit);
    return { ...hit.value, lat, lng };
  }

  const value = await inflight.run(
    key,
    (sharedSignal) =>
      resolveUncached(lat, lng, sharedSignal).then((v) => {
        if (isResolvedAddress(v)) {
          const ttl = v.source === 'google' ? GOOGLE_CACHE_TTL_MS : CACHE_TTL_MS;
          cache.set(key, { at: Date.now(), ttl, value: v });
          while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
        }
        return v;
      }),
    signal
  );
  return { ...value, lat, lng };
}

/** Test/maintenance hook. */
export function clearAddressCache(): void {
  cache.clear();
  inflight.clear();
}
