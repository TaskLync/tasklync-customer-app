import { apiClient } from '../api/client';
import { useAuthStore } from '../../store/auth.store';
import { providerHealth, type FailureKind } from './providerHealth';
import { trackLocationEvent } from '../location/locationTelemetry';

/**
 * Client for the backend geo proxy (booking-service `/bookings/address/*`).
 *
 * The proxy keeps the Google web-service key on the server, applies the server cache and circuit
 * breakers, and is the preferred path for every geocode / search. Every function returns `null`
 * when the proxy cannot answer (not signed in, endpoint not deployed, provider unavailable,
 * network) so callers fall back — it never throws except for the caller's own abort.
 */

const PROXY_TIMEOUT_MS = 6000;
const BASE = '/bookings/address';

export interface ProxyResolved {
  lat: number;
  lng: number;
  resolved: boolean;
  address_line: string;
  formatted_address: string;
  name: string | null;
  street: string | null;
  area: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  tier: string | null;
  source: 'google' | 'osm' | null;
  cacheable: boolean;
}

export interface ProxyPrediction {
  place_id: string;
  description: string;
  primary_text: string;
  secondary_text: string;
  types: string[];
}

export interface ProxyPlace {
  place_id: string;
  formatted_address: string;
  lat: number;
  lng: number;
  street_number: string | null;
  route: string | null;
  premise: string | null;
  area: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  types: string[];
}

function failureKind(err: any): FailureKind {
  const status = err?.status ?? err?.response?.status;
  if (status === 404 || status === 405) return 'not_deployed';
  if (status === 401 || status === 403) return 'denied';
  if (status === 429) return 'quota';
  if (status === 503 || status >= 500) return 'server';
  return 'network';
}

function isAbort(err: any, signal?: AbortSignal): boolean {
  return !!signal?.aborted || err?.name === 'AbortError' || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED';
}

async function call<T>(path: string, params: Record<string, string | number>, signal?: AbortSignal): Promise<T | null> {
  if (!useAuthStore.getState().accessToken) return null; // proxy is authenticated
  if (!providerHealth.isAvailable('proxy')) return null;
  const isSearch = path !== '/resolve';
  if (isSearch && !providerHealth.isAvailable('proxy_search')) return null;
  try {
    const res = await apiClient.get<any>(`${BASE}${path}`, {
      params,
      timeout: PROXY_TIMEOUT_MS,
      ...(signal ? { signal } : {}),
    });
    providerHealth.recordSuccess('proxy');
    return (res.data?.data ?? res.data) as T;
  } catch (err: any) {
    if (isAbort(err, signal)) {
      const e = new Error('Aborted');
      e.name = 'AbortError';
      throw e;
    }
    // A provider that is down behind a healthy proxy is reported per call (503) — the proxy
    // itself is fine, so only 404/network count against it.
    const kind = failureKind(err);
    // 404 (older backend without the route), 403 (older backend: resolver was worker-only — the
    // API client has already refreshed the token on 401) and network errors all mean "proxy not
    // usable right now": skip it for a cooldown instead of paying a round-trip per lookup.
    if (kind === 'not_deployed' || kind === 'denied' || kind === 'network') {
      if (providerHealth.recordFailure('proxy', kind)) trackLocationEvent('provider_down', { provider: 'proxy', reason: kind });
    } else if (isSearch && err?.code === 'GEO_PROVIDER_UNAVAILABLE') {
      // Google search is down behind a healthy proxy: stop asking on every keystroke for a while.
      if (providerHealth.recordFailure('proxy_search', 'quota')) {
        trackLocationEvent('provider_down', { provider: 'proxy_search', reason: 'provider_unavailable' });
      }
    }
    return null;
  }
}

export async function proxyReverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<ProxyResolved | null> {
  return call<ProxyResolved>('/resolve', { lat, lng }, signal);
}

export async function proxyAutocomplete(q: string, session?: string, signal?: AbortSignal): Promise<ProxyPrediction[] | null> {
  const data = await call<{ predictions: ProxyPrediction[] }>('/autocomplete', { q, ...(session ? { session } : {}) }, signal);
  return data && Array.isArray(data.predictions) ? data.predictions : null;
}

export async function proxyPlaceDetails(placeId: string, session?: string, signal?: AbortSignal): Promise<ProxyPlace | null> {
  const data = await call<{ place: ProxyPlace }>(`/place/${encodeURIComponent(placeId)}`, session ? { session } : {}, signal);
  return data?.place ?? null;
}
