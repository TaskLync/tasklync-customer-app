import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { PlacePrediction, PlaceDetails } from '../../types/address.types';
import { resolveAddress } from './addressResolver';
import { generateUUID } from '../../utils/uuid';
import { FAISALABAD_CENTER } from '../../config/serviceArea.config';
import { proxyAutocomplete, proxyPlaceDetails } from './geoProxy';
import { providerHealth, classifyGoogleFailure, type GeoProvider } from './providerHealth';
import { parsePlaceComponents, dedupePredictions } from '../../utils/placeParse';
import { trackLocationEvent, startTimer } from '../location/locationTelemetry';

/**
 * Address search.
 *
 * Order: backend geo proxy (server key, Places API (New)) → direct Places API (New) → direct legacy
 * Places → native geocoder. Each Google path has a circuit breaker: a denied project (billing off,
 * API not enabled, restricted key) is tried once, then skipped for a cooldown instead of costing two
 * failing round-trips per keystroke (audit LOC-001).
 *
 * The native fallback is honest: it returns AREA matches labelled as approximate — never the
 * customer's own text dressed up as a found place (audit LOC-011).
 */

const PLACES_TIMEOUT_MS = 5000;
/** Essentials SKU fields only — `displayName` would bill the whole request as Pro (audit LOC-027). */
const NEW_DETAILS_FIELD_MASK = 'id,formattedAddress,location,addressComponents';
const MAX_RESULTS = 5;

/**
 * Generates a standard UUID session token for Google Places Autocomplete billing optimization
 */
export function generatePlacesSessionToken(): string {
  return generateUUID();
}

function clientKey(): string {
  const k =
    Constants.expoConfig?.extra?.googleMapsKey ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ||
    process.env.GOOGLE_MAPS_KEY ||
    '';
  return k && k !== 'your_key_here' ? k : '';
}

function abortError(): Error {
  const e = new Error('Aborted');
  e.name = 'AbortError';
  return e;
}

async function fetchWithTimeout(url: string, init: RequestInit, signal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  const timer = setTimeout(() => controller.abort(), PLACES_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

function noteFailure(provider: GeoProvider, httpStatus: number, apiStatus?: unknown): void {
  const kind = classifyGoogleFailure(httpStatus, apiStatus) ?? 'server';
  if (providerHealth.recordFailure(provider, kind)) {
    trackLocationEvent('provider_down', { provider, reason: kind });
  }
}

async function directNewAutocomplete(q: string, key: string, sessionToken?: string, signal?: AbortSignal): Promise<PlacePrediction[] | null> {
  if (!providerHealth.isAvailable('places_new')) return null;
  try {
    const res = await fetchWithTimeout(
      'https://places.googleapis.com/v1/places:autocomplete',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
        body: JSON.stringify({
          input: q,
          // Same session token as the final place-details call so Google bills one session, not one per keystroke
          ...(sessionToken ? { sessionToken } : {}),
          includedRegionCodes: ['PK'],
          languageCode: 'en',
          locationBias: {
            circle: { center: { latitude: FAISALABAD_CENTER.lat, longitude: FAISALABAD_CENTER.lng }, radius: 35000.0 },
          },
        }),
      },
      signal
    );
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      noteFailure('places_new', res.status, json?.error?.status);
      return null;
    }
    providerHealth.recordSuccess('places_new');
    // A 2xx answer is authoritative: an empty body means "no matches", not "try another provider".
    return (Array.isArray(json?.suggestions) ? json.suggestions : [])
      .filter((s: any) => s?.placePrediction?.placeId)
      .map((s: any) => {
        const p = s.placePrediction;
        return {
          place_id: p.placeId,
          description: p.text?.text || '',
          primary_text: p.structuredFormat?.mainText?.text || p.text?.text || '',
          secondary_text: p.structuredFormat?.secondaryText?.text || '',
          source: 'google' as const,
        };
      });
  } catch (e) {
    if (signal?.aborted) throw e;
    providerHealth.recordFailure('places_new', 'network');
    return null;
  }
}

async function directLegacyAutocomplete(q: string, key: string, sessionToken?: string, signal?: AbortSignal): Promise<PlacePrediction[] | null> {
  if (!providerHealth.isAvailable('places_legacy')) return null;
  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}` +
      `&components=country:pk&location=${FAISALABAD_CENTER.lat},${FAISALABAD_CENTER.lng}&radius=35000&strictbounds=false` +
      `&language=en&sessiontoken=${sessionToken || generatePlacesSessionToken()}&key=${key}`;
    const res = await fetchWithTimeout(url, {}, signal);
    const json = await res.json().catch(() => null);
    if (json?.status === 'ZERO_RESULTS') {
      providerHealth.recordSuccess('places_legacy');
      return [];
    }
    if (json?.status === 'OK' && Array.isArray(json.predictions)) {
      providerHealth.recordSuccess('places_legacy');
      return json.predictions.map((p: any) => ({
        place_id: p.place_id,
        description: p.description,
        primary_text: p.structured_formatting?.main_text || p.description,
        secondary_text: p.structured_formatting?.secondary_text || '',
        source: 'google' as const,
      }));
    }
    noteFailure('places_legacy', res.status, json?.status);
    return null;
  } catch (e) {
    if (signal?.aborted) throw e;
    providerHealth.recordFailure('places_legacy', 'network');
    return null;
  }
}

/**
 * Offline / no-provider fallback: the OS geocoder returns coordinates only. We resolve a readable
 * AREA name for each hit and label it as approximate, so the customer knows to move the pin.
 */
async function nativeAutocomplete(q: string, signal?: AbortSignal): Promise<PlacePrediction[]> {
  try {
    const localizedQuery = q.toLowerCase().includes('faisalabad') ? q : `${q}, Faisalabad, Pakistan`;
    let geo = await Location.geocodeAsync(localizedQuery);
    if (!geo || geo.length === 0) geo = await Location.geocodeAsync(q);
    if (signal?.aborted) throw abortError();
    const top = (geo || []).slice(0, 3);
    const out: PlacePrediction[] = [];
    for (const [index, r] of top.entries()) {
      let label = '';
      try {
        const a = await resolveAddress(r.latitude, r.longitude, signal);
        label = a.source !== 'coordinates' ? a.address_line : '';
      } catch (e: any) {
        if (e?.name === 'AbortError') throw e;
      }
      out.push({
        place_id: `geo_${r.latitude}_${r.longitude}_${index}`,
        description: label || `Area near ${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`,
        primary_text: label || 'Approximate area',
        secondary_text: 'Approximate match — confirm the exact spot on the map',
        source: 'native',
        approximate: true,
      });
    }
    return dedupePredictions(out, MAX_RESULTS);
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    return [];
  }
}

/**
 * Places Autocomplete query. Returns real provider suggestions, approximate area matches when no
 * provider is reachable, or [] — never demo data.
 */
export async function autocompletePlaces(
  query: string,
  sessionToken?: string,
  signal?: AbortSignal
): Promise<PlacePrediction[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const stop = startTimer();

  const viaProxy = await proxyAutocomplete(q, sessionToken, signal);
  if (signal?.aborted) throw abortError();
  if (viaProxy) {
    trackLocationEvent('search', { provider: 'proxy', ms: stop(), results: viaProxy.length });
    return dedupePredictions(
      viaProxy.map((p) => ({ ...p, source: 'google' as const })),
      MAX_RESULTS
    );
  }

  const key = clientKey();
  if (key) {
    const viaNew = await directNewAutocomplete(q, key, sessionToken, signal);
    if (signal?.aborted) throw abortError();
    if (viaNew) {
      trackLocationEvent('search', { provider: 'places_new', ms: stop(), results: viaNew.length });
      return dedupePredictions(viaNew, MAX_RESULTS);
    }
    const viaLegacy = await directLegacyAutocomplete(q, key, sessionToken, signal);
    if (signal?.aborted) throw abortError();
    if (viaLegacy) {
      trackLocationEvent('search', { provider: 'places_legacy', ms: stop(), results: viaLegacy.length });
      return dedupePredictions(viaLegacy, MAX_RESULTS);
    }
  }

  const native = await nativeAutocomplete(q, signal);
  trackLocationEvent('search', { provider: 'native', ms: stop(), results: native.length });
  return native;
}

/** True when search currently has no real place provider (UI can say "search limited"). */
export function isPlaceSearchDegraded(): boolean {
  const proxyOk = providerHealth.isAvailable('proxy') && providerHealth.isAvailable('proxy_search');
  const directOk = !!clientKey() && (providerHealth.isAvailable('places_new') || providerHealth.isAvailable('places_legacy'));
  return !proxyOk && !directOk;
}

/**
 * Fetch Place Details by place_id
 */
export async function getPlaceDetails(
  placeId: string,
  sessionToken?: string,
  signal?: AbortSignal
): Promise<PlaceDetails | null> {
  const stop = startTimer();

  // Approximate native match: coordinates are encoded in the id
  if (placeId.startsWith('geo_')) {
    const parts = placeId.split('_');
    const lat = parseFloat(parts[1] ?? '');
    const lng = parseFloat(parts[2] ?? '');
    if (isNaN(lat) || isNaN(lng)) return null;
    try {
      const r = await resolveAddress(lat, lng, signal);
      return {
        place_id: placeId,
        description: r.address_line,
        formatted_address: r.address_line,
        lat,
        lng,
        city: r.city || '',
        country: r.country || '',
        source: 'native',
        approximate: true,
      };
    } catch (e: any) {
      if (e?.name === 'AbortError') throw e;
      const label = `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      return { place_id: placeId, description: label, formatted_address: label, lat, lng, city: '', country: '', source: 'native', approximate: true };
    }
  }

  // 1. Backend proxy
  const proxied = await proxyPlaceDetails(placeId, sessionToken, signal);
  if (signal?.aborted) throw abortError();
  if (proxied) {
    trackLocationEvent('place_details', { provider: 'proxy', ms: stop(), ok: true });
    return {
      place_id: placeId,
      description: proxied.formatted_address,
      formatted_address: proxied.formatted_address,
      lat: proxied.lat,
      lng: proxied.lng,
      city: proxied.city || '',
      country: proxied.country || '',
      area: proxied.area || '',
      source: 'google',
    };
  }

  const key = clientKey();
  if (!key) return null;

  // 2. Places API (New) details — Essentials field mask
  if (providerHealth.isAvailable('places_new')) {
    try {
      const res = await fetchWithTimeout(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}${
          sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : ''
        }`,
        { headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': NEW_DETAILS_FIELD_MASK } },
        signal
      );
      const json = await res.json().catch(() => null);
      if (res.ok && json?.location && typeof json.location.latitude === 'number' && typeof json.location.longitude === 'number') {
        providerHealth.recordSuccess('places_new');
        const c = parsePlaceComponents(json.addressComponents);
        trackLocationEvent('place_details', { provider: 'places_new', ms: stop(), ok: true });
        return {
          place_id: placeId,
          description: json.formattedAddress || '',
          formatted_address: json.formattedAddress || '',
          lat: json.location.latitude,
          lng: json.location.longitude,
          city: c.city,
          country: c.country,
          area: c.area,
          source: 'google',
        };
      }
      if (!res.ok) noteFailure('places_new', res.status, json?.error?.status);
    } catch (e) {
      if (signal?.aborted) throw e;
      providerHealth.recordFailure('places_new', 'network');
    }
  }

  // 3. Legacy Place Details
  if (providerHealth.isAvailable('places_legacy')) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
        placeId
      )}&fields=formatted_address,geometry,address_components&language=en&sessiontoken=${sessionToken || ''}&key=${key}`;
      const res = await fetchWithTimeout(url, {}, signal);
      const json = await res.json().catch(() => null);
      if (json?.status === 'OK' && json.result) {
        providerHealth.recordSuccess('places_legacy');
        const lat = json.result.geometry?.location?.lat;
        const lng = json.result.geometry?.location?.lng;
        // Never return (0, 0) for a place without geometry — that would pin the user off West Africa.
        if (typeof lat !== 'number' || typeof lng !== 'number') return null;
        const c = parsePlaceComponents(json.result.address_components);
        trackLocationEvent('place_details', { provider: 'places_legacy', ms: stop(), ok: true });
        return {
          place_id: placeId,
          description: json.result.formatted_address,
          formatted_address: json.result.formatted_address,
          lat,
          lng,
          city: c.city,
          country: c.country,
          area: c.area,
          source: 'google',
        };
      }
      noteFailure('places_legacy', res.status, json?.status);
    } catch (e) {
      if (signal?.aborted) throw e;
      providerHealth.recordFailure('places_legacy', 'network');
    }
  }

  trackLocationEvent('place_details', { provider: 'none', ms: stop(), ok: false });
  return null;
}
