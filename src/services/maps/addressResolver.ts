import * as Location from 'expo-location';
import Constants from 'expo-constants';
import type { ReverseGeocodeResult } from '../../types/address.types';
import {
  googleCandidates,
  nominatimCandidates,
  selectBestAddress,
  type AddressCandidate,
} from '../../utils/addressSelect';

/**
 * Single entry point for coordinates → human-readable address.
 *
 *  1. Google Geocoding API   (existing integration, key from app config)
 *  2. OpenStreetMap Nominatim (additional source; base URL configurable so production can point at a
 *     self-hosted / commercial instance — see EXPO_PUBLIC_NOMINATIM_URL)
 *  3. Native platform geocoder (last resort)
 *  4. Honest coordinates fallback — never an invented address.
 *
 * Google and OSM run in parallel and `selectBestAddress` picks the best REAL result.
 * Results are cached per ~1 m cell and concurrent identical lookups share one request.
 */

const GOOGLE_TIMEOUT_MS = 8000;
const OSM_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 200;
/** Public Nominatim allows max 1 request/second. */
const OSM_MIN_INTERVAL_MS = 1100;
const OSM_BACKOFF_MS = 60_000;

const DEFAULT_NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

const cache = new Map<string, { at: number; value: ReverseGeocodeResult }>();
const inflight = new Map<string, Promise<ReverseGeocodeResult>>();

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

function deviceLanguage(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.split('-')[0] || '';
  } catch {
    return '';
  }
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
    return { status: res.status, json: res.ok ? await res.json() : null };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

async function fromGoogle(lat: number, lng: number, signal?: AbortSignal): Promise<AddressCandidate[]> {
  const key = googleKey();
  if (!key) return [];
  const lang = deviceLanguage();
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}` +
    (lang ? `&language=${lang}` : '') +
    `&key=${key}`;
  try {
    const { json } = await fetchJson(url, GOOGLE_TIMEOUT_MS, signal);
    return googleCandidates(json, lat, lng);
  } catch (e) {
    if (signal?.aborted) throw e;
    return [];
  }
}

/** Serialises Nominatim calls so we never exceed the 1 req/s public usage policy. */
function fromOsm(lat: number, lng: number, signal?: AbortSignal): Promise<AddressCandidate[]> {
  if (Date.now() < osmBlockedUntil) return Promise.resolve([]);

  const run = async (): Promise<AddressCandidate[]> => {
    if (signal?.aborted) throw abortError();
    if (Date.now() < osmBlockedUntil) return [];
    const wait = osmLastAt + OSM_MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    if (signal?.aborted) throw abortError();
    osmLastAt = Date.now();

    const lang = deviceLanguage();
    const url =
      `${nominatimBase()}/reverse?format=jsonv2&addressdetails=1&namedetails=1&zoom=18` +
      `&lat=${lat}&lon=${lng}` +
      (lang ? `&accept-language=${lang}` : '');
    try {
      const { status, json } = await fetchJson(url, OSM_TIMEOUT_MS, signal, {
        Accept: 'application/json',
        'User-Agent': 'TaskLync-Customer-App',
      });
      if (status === 429 || status === 403) {
        osmBlockedUntil = Date.now() + OSM_BACKOFF_MS;
        return [];
      }
      return nominatimCandidates(json, lat, lng);
    } catch (e) {
      if (signal?.aborted) throw e;
      return [];
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

async function resolveUncached(lat: number, lng: number, signal?: AbortSignal): Promise<ReverseGeocodeResult> {
  const [g, o] = await Promise.all([fromGoogle(lat, lng, signal), fromOsm(lat, lng, signal)]);
  if (signal?.aborted) throw abortError();

  const best = selectBestAddress([...g, ...o], lat, lng);
  if (best) return { ...best.result, source: best.source };

  const native = await fromNative(lat, lng);
  if (signal?.aborted) throw abortError();
  if (native) return native;

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
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    // refresh LRU position; always report the exact coordinates that were asked for
    cache.delete(key);
    cache.set(key, hit);
    return { ...hit.value, lat, lng };
  }

  // Shared request: a caller aborting must not cancel the lookup other callers are waiting on, so
  // the shared work is un-abortable and each caller only abandons its own wait.
  let pending = inflight.get(key);
  if (!pending) {
    pending = resolveUncached(lat, lng).then((value) => {
      if (isResolvedAddress(value)) {
        cache.set(key, { at: Date.now(), value });
        while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
      }
      return value;
    });
    inflight.set(key, pending);
    const clear = () => {
      if (inflight.get(key) === pending) inflight.delete(key);
    };
    pending.then(clear, clear);
  }

  if (!signal) return { ...(await pending), lat, lng };
  return new Promise<ReverseGeocodeResult>((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener('abort', onAbort, { once: true });
    pending!.then(
      (v) => {
        signal.removeEventListener('abort', onAbort);
        resolve({ ...v, lat, lng });
      },
      (e) => {
        signal.removeEventListener('abort', onAbort);
        reject(e);
      }
    );
  });
}

/** Test/maintenance hook. */
export function clearAddressCache(): void {
  cache.clear();
  inflight.clear();
}
