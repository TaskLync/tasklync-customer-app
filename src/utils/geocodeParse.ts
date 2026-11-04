import type { ReverseGeocodeResult } from '../types/address.types';

const PLUS_CODE_RE = /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]*(\s|$)/i;

/**
 * Converts a Google Geocoding API (reverse) JSON body into a ReverseGeocodeResult.
 * - Skips plus-code-only results (they are not readable addresses).
 * - Keeps area/neighbourhood text (everything except a trailing country and plus code).
 * - Never invents missing components: an unknown city stays ''.
 * Returns null when the body has no usable result.
 */
export function parseGoogleReverseGeocode(
  json: any,
  lat: number,
  lng: number
): ReverseGeocodeResult | null {
  if (!json || json.status !== 'OK' || !Array.isArray(json.results)) return null;

  const usable = json.results.find(
    (r: any) =>
      r &&
      typeof r.formatted_address === 'string' &&
      r.formatted_address.trim().length > 0 &&
      !(Array.isArray(r.types) && r.types.length === 1 && r.types[0] === 'plus_code')
  );
  if (!usable) return null;

  let locality = '';
  let admin2 = '';
  let sublocality = '';
  let country = '';
  for (const comp of usable.address_components || []) {
    const types: string[] = comp.types || [];
    if (types.includes('locality')) locality = comp.long_name;
    else if (types.includes('administrative_area_level_2')) admin2 = comp.long_name;
    else if (types.includes('sublocality')) sublocality = comp.long_name;
    if (types.includes('country')) country = comp.long_name;
  }

  const segments = String(usable.formatted_address)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length > 0 && PLUS_CODE_RE.test(segments[0]!)) {
    // "VQ2R+8H Faisalabad" style prefix: drop a bare code, or strip it from a mixed segment
    const stripped = segments[0]!.replace(PLUS_CODE_RE, '').trim();
    if (stripped) segments[0] = stripped;
    else segments.shift();
  }
  if (segments.length > 1 && country && segments[segments.length - 1] === country) {
    segments.pop();
  }
  const addressLine = segments.join(', ');
  if (!addressLine) return null;

  return {
    formatted_address: usable.formatted_address,
    address_line: addressLine,
    city: locality || admin2 || sublocality || '',
    country,
    lat,
    lng,
  };
}
