/**
 * Pure address-candidate normalisation + selection (no network, no React Native imports so it is
 * unit-testable under node). Every value is read from a provider response; nothing is invented.
 *
 * Selection priority (highest first): named place → building → house+street → street →
 * neighbourhood/locality → city/region. A candidate is only allowed into a "specific" tier if
 * its own location is close to the requested coordinates; otherwise it is demoted.
 */
import type { ReverseGeocodeResult } from '../types/address.types';

export type AddressTier = 'place' | 'building' | 'house' | 'street' | 'locality' | 'city';

export type AddressSource = 'google' | 'osm';

export interface AddressCandidate {
  source: AddressSource;
  tier: AddressTier;
  name: string;
  houseNumber: string;
  road: string;
  /** Neighbourhood / suburb / sublocality */
  area: string;
  city: string;
  region: string;
  country: string;
  /** Where the provider says this result is (null if not supplied). */
  lat: number | null;
  lng: number | null;
  /** Distance from the requested coordinates in metres (null if unknown). */
  distanceM: number | null;
  /** Provider's own formatted address (used only when no components exist). */
  formatted: string;
}

const TIER_WEIGHT: Record<AddressTier, number> = {
  place: 60,
  building: 50,
  house: 45,
  street: 30,
  locality: 15,
  city: 5,
};

/** A place / building / house result further than this from the point does not describe it. */
export const MAX_SPECIFIC_DISTANCE_M = 80;
/** A street centre-line can legitimately be further away than a building. */
export const MAX_STREET_DISTANCE_M = 400;

const PLUS_CODE_RE = /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]*(\s|$)/i;

export function isPlusCode(text: string | null | undefined): boolean {
  return !!text && PLUS_CODE_RE.test(text.trim());
}

function clean(v: unknown): string {
  if (typeof v !== 'string') return '';
  const t = v.trim();
  if (!t || isPlusCode(t) && !/\s\S/.test(t)) return '';
  return t;
}

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceOrNull(
  lat: number,
  lng: number,
  rLat: unknown,
  rLng: unknown
): number | null {
  const a = typeof rLat === 'string' ? parseFloat(rLat) : rLat;
  const b = typeof rLng === 'string' ? parseFloat(rLng) : rLng;
  if (typeof a !== 'number' || typeof b !== 'number' || isNaN(a) || isNaN(b)) return null;
  return haversineM(lat, lng, a, b);
}

/* ------------------------------------------------------------------ Google */

const GOOGLE_PLACE_TYPES = [
  'point_of_interest',
  'establishment',
  'natural_feature',
  'airport',
  'park',
  'subway_station',
  'transit_station',
  'university',
  'hospital',
  'school',
  'shopping_mall',
  'place_of_worship',
];

export function googleCandidates(json: any, lat: number, lng: number): AddressCandidate[] {
  if (!json || json.status !== 'OK' || !Array.isArray(json.results)) return [];
  const out: AddressCandidate[] = [];

  for (const r of json.results.slice(0, 6)) {
    if (!r || typeof r !== 'object') continue;
    const types: string[] = Array.isArray(r.types) ? r.types : [];
    if (types.length === 1 && types[0] === 'plus_code') continue;

    const comps: any[] = Array.isArray(r.address_components) ? r.address_components : [];
    const pick = (...wanted: string[]) => {
      for (const c of comps) {
        const t: string[] = c?.types || [];
        if (wanted.some((w) => t.includes(w))) return clean(c.long_name);
      }
      return '';
    };

    const name =
      pick('point_of_interest', 'establishment', 'natural_feature', 'airport', 'park') ||
      pick('premise');
    const houseNumber = pick('street_number');
    const road = pick('route');
    const area = pick('neighbourhood', 'sublocality_level_1', 'sublocality', 'sublocality_level_2');
    const city = pick('locality', 'postal_town') || pick('administrative_area_level_2');
    const region = pick('administrative_area_level_1');
    const country = pick('country');

    const isPlaceType = types.some((t) => GOOGLE_PLACE_TYPES.includes(t));
    let tier: AddressTier;
    if (isPlaceType && pick('point_of_interest', 'establishment', 'natural_feature', 'airport', 'park')) tier = 'place';
    else if (types.includes('premise') || types.includes('subpremise')) tier = name ? 'building' : houseNumber && road ? 'house' : 'building';
    else if (houseNumber && road) tier = 'house';
    else if (road) tier = 'street';
    else if (area) tier = 'locality';
    else tier = 'city';

    const loc = r.geometry?.location;
    out.push({
      source: 'google',
      tier,
      name,
      houseNumber,
      road,
      area,
      city,
      region,
      country,
      lat: typeof loc?.lat === 'number' ? loc.lat : null,
      lng: typeof loc?.lng === 'number' ? loc.lng : null,
      distanceM: distanceOrNull(lat, lng, loc?.lat, loc?.lng),
      formatted: typeof r.formatted_address === 'string' ? r.formatted_address : '',
    });
  }
  return out;
}

/* --------------------------------------------------------------- Nominatim */

const OSM_AREA_KEYS = ['neighbourhood', 'suburb', 'quarter', 'city_district', 'residential', 'hamlet'];
const OSM_CITY_KEYS = ['city', 'town', 'village', 'municipality', 'county', 'state_district'];
const OSM_NON_PLACE_ADDRESSTYPES = [
  'road', 'neighbourhood', 'suburb', 'quarter', 'city_district', 'city', 'town', 'village',
  'county', 'state', 'state_district', 'region', 'country', 'postcode', 'hamlet', 'municipality',
  'residential', 'isolated_dwelling',
];

export function nominatimCandidates(json: any, lat: number, lng: number): AddressCandidate[] {
  if (!json || typeof json !== 'object' || json.error || !json.address) return [];
  const a = json.address;
  const first = (keys: string[]) => {
    for (const k of keys) {
      const v = clean(a[k]);
      if (v) return v;
    }
    return '';
  };

  const addresstype: string = typeof json.addresstype === 'string' ? json.addresstype : '';
  const rawName = clean(json.name) || clean(json.namedetails?.name);
  const road = clean(a.road) || clean(a.pedestrian) || clean(a.footway) || clean(a.path);
  const houseNumber = clean(a.house_number);
  const area = first(OSM_AREA_KEYS);
  const city = first(OSM_CITY_KEYS);
  const region = clean(a.state);
  const country = clean(a.country);
  // For road/area/city results OSM puts the feature's own name in `name`; that is not a place name.
  const isNamedPlace = !!rawName && !!addresstype && !OSM_NON_PLACE_ADDRESSTYPES.includes(addresstype);
  const name = isNamedPlace ? rawName : '';

  const osmDistance = distanceOrNull(lat, lng, json.lat, json.lon);

  let tier: AddressTier;
  if (isNamedPlace && addresstype !== 'building' && addresstype !== 'house') tier = 'place';
  else if (isNamedPlace) tier = 'building';
  else if (houseNumber && road) tier = 'house';
  else if (addresstype === 'building' || addresstype === 'house') tier = road ? 'building' : 'locality';
  else if (road) tier = 'street';
  else if (area) tier = 'locality';
  else tier = 'city';

  return [
    {
      source: 'osm',
      tier,
      name,
      houseNumber,
      road,
      area,
      city,
      region,
      country,
      lat: osmDistance === null ? null : parseFloat(json.lat),
      lng: osmDistance === null ? null : parseFloat(json.lon),
      distanceM: osmDistance,
      formatted: typeof json.display_name === 'string' ? json.display_name : '',
    },
  ];
}

/* --------------------------------------------------------------- Selection */

/** The tier a candidate may actually claim once proximity is taken into account. */
export function effectiveTier(c: AddressCandidate): AddressTier | null {
  const d = c.distanceM;
  const specific = c.tier === 'place' || c.tier === 'building' || c.tier === 'house';
  if (specific && d !== null && d > MAX_SPECIFIC_DISTANCE_M) {
    // The named/building result is not at this point; fall back to what it says about the street/area.
    if (c.road) return d > MAX_STREET_DISTANCE_M ? (c.area ? 'locality' : c.city ? 'city' : null) : 'street';
    return c.area ? 'locality' : c.city ? 'city' : null;
  }
  if (c.tier === 'street' && d !== null && d > MAX_STREET_DISTANCE_M) {
    return c.area ? 'locality' : c.city ? 'city' : null;
  }
  return c.tier;
}

function componentCount(c: AddressCandidate): number {
  return [c.name, c.houseNumber, c.road, c.area, c.city, c.region, c.country].filter(Boolean).length;
}

export function scoreCandidate(c: AddressCandidate): number {
  const tier = effectiveTier(c);
  if (!tier) return -Infinity;
  const distancePenalty = c.distanceM === null ? 5 : Math.min(c.distanceM / 25, 40);
  // Do not let components that the demoted tier no longer claims count towards completeness.
  return TIER_WEIGHT[tier] + Math.min(componentCount(c), 7) - distancePenalty;
}

export function dedupeParts(parts: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    const t = p.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    // skip a part already contained in (or containing) one we kept, e.g. "Gulberg" vs "Gulberg III"
    if (out.some((o) => o.toLowerCase() === key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/** Build the display line from the parts the candidate's effective tier is entitled to. */
export function buildAddressLine(c: AddressCandidate): string {
  const tier = effectiveTier(c);
  if (!tier) return '';
  const street = [c.houseNumber, c.road].filter(Boolean).join(' ');
  const parts: string[] = [];
  if (tier === 'place' || tier === 'building') {
    if (c.name) parts.push(c.name);
    if (street) parts.push(street);
    if (c.area) parts.push(c.area);
    if (c.city) parts.push(c.city);
  } else if (tier === 'house') {
    parts.push(street);
    if (c.area) parts.push(c.area);
    if (c.city) parts.push(c.city);
  } else if (tier === 'street') {
    parts.push(c.road);
    if (c.area) parts.push(c.area);
    if (c.city) parts.push(c.city);
  } else if (tier === 'locality') {
    parts.push(c.area);
    if (c.city) parts.push(c.city);
  } else {
    parts.push(c.city || c.region);
  }
  return dedupeParts(parts).join(', ');
}

export interface SelectedAddress {
  result: ReverseGeocodeResult;
  source: AddressSource;
  tier: AddressTier;
}

/**
 * Picks the best candidate across providers. `lat`/`lng` are the REQUESTED coordinates and are
 * always what the result carries — the display text never changes the stored coordinates.
 */
export function selectBestAddress(
  candidates: AddressCandidate[],
  lat: number,
  lng: number
): SelectedAddress | null {
  let best: { c: AddressCandidate; score: number; line: string } | null = null;
  for (const c of candidates) {
    const line = buildAddressLine(c);
    if (!line) continue;
    const score = scoreCandidate(c);
    if (score === -Infinity) continue;
    // Ties: more complete wins; then the earlier (provider order) candidate.
    if (!best || score > best.score || (score === best.score && componentCount(c) > componentCount(best.c))) {
      best = { c, score, line };
    }
  }
  if (!best) return null;

  const { c, line } = best;
  const country = c.country;
  const city = c.city || c.area;
  return {
    source: c.source,
    tier: effectiveTier(c)!,
    result: {
      formatted_address: country && !line.toLowerCase().includes(country.toLowerCase()) ? `${line}, ${country}` : line,
      address_line: line,
      city,
      country,
      lat,
      lng,
    },
  };
}
