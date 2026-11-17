/**
 * Structured address details (Pakistan-style addressing) — pure, unit-testable.
 *
 * Many Faisalabad addresses have no house number on the map: the worker finds the door through
 * "House 123, Street 5, Block A, Madina Town, near the University gate" + a pin. These helpers keep
 * those parts end-to-end (audit LOC-004/005/018) and never invent a value.
 */
import type { Address, CreateAddressDTO, LocationSource } from '../types/address.types';

export interface AddressDetailsInput {
  house_unit: string;
  street: string;
  block_phase: string;
  area: string;
  landmark: string;
  instructions: string;
}

export const EMPTY_ADDRESS_DETAILS: AddressDetailsInput = {
  house_unit: '',
  street: '',
  block_phase: '',
  area: '',
  landmark: '',
  instructions: '',
};

/** Field limits mirror user-service validators. */
export const ADDRESS_DETAIL_LIMITS = {
  house_unit: 50,
  street: 100,
  block_phase: 50,
  area: 100,
  landmark: 150,
  instructions: 300,
  address_line: 500,
} as const;

const norm = (s: string | null | undefined): string => (s ?? '').trim().replace(/\s+/g, ' ');

/**
 * "House 123, Street 5, Block A, Madina Town, Faisalabad"
 * Customer-entered parts first, then the geocoder line; any part already contained in another
 * (case-insensitive) is dropped so nothing repeats. Landmark/instructions are NOT part of the line.
 */
export function composeAddressLine(details: Partial<AddressDetailsInput>, geocodedLine: string | null | undefined): string {
  const own = [details.house_unit, details.street, details.block_phase, details.area].map(norm).filter(Boolean);
  const geo = norm(geocodedLine)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const part of [...own, ...geo]) {
    const lower = part.toLowerCase();
    if (out.some((o) => o.toLowerCase() === lower || o.toLowerCase().includes(lower))) continue;
    // a later, longer part that contains an earlier one replaces nothing — keep order, skip dupes only
    out.push(part);
  }
  return out.join(', ').slice(0, ADDRESS_DETAIL_LIMITS.address_line);
}

export type PinOrigin = 'gps' | 'search' | 'map' | 'saved';

/** Pin moved less than this from where GPS/search put it still counts as "not adjusted". */
export const PIN_ADJUST_THRESHOLD_M = 15;

/**
 * How the saved point was established (stored for quality analysis; never shown as precision).
 *  gps   + not moved → gps_confirmed      gps / search + moved → pin_adjusted
 *  search + not moved → search            map (manual pan from overview) → manual
 */
export function deriveLocationSource(origin: PinOrigin, movedFromOriginM: number | null): LocationSource {
  const moved = movedFromOriginM !== null && movedFromOriginM > PIN_ADJUST_THRESHOLD_M;
  if (origin === 'gps') return moved ? 'pin_adjusted' : 'gps_confirmed';
  if (origin === 'search') return moved ? 'pin_adjusted' : 'search';
  if (origin === 'saved') return moved ? 'pin_adjusted' : 'manual';
  return 'manual';
}

const strOrUndef = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined);
const numOrUndef = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Server row → app Address. Coerces DECIMAL-as-string coordinates; returns null for rows without a
 * usable point (never lets NaN / 0,0 reach maps, service-area checks or bookings) and for rows
 * without an id (an id is never fabricated — audit: `id || generateUUID()`).
 */
export function mapServerAddress(raw: any): Address | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = strOrUndef(raw.id);
  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  if (!id || !Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
  const instructions = strOrUndef(raw.instructions) ?? strOrUndef(raw.notes);
  return {
    id,
    label: strOrUndef(raw.label) ?? 'Home',
    custom_label: strOrUndef(raw.custom_label),
    address_line: typeof raw.address_line === 'string' ? raw.address_line : '',
    city: typeof raw.city === 'string' ? raw.city : '',
    country: typeof raw.country === 'string' ? raw.country : '',
    lat,
    lng,
    is_default: Boolean(raw.is_default),
    created_at: strOrUndef(raw.created_at),
    updated_at: strOrUndef(raw.updated_at),
    house_unit: strOrUndef(raw.house_unit),
    street: strOrUndef(raw.street),
    block_phase: strOrUndef(raw.block_phase),
    area: strOrUndef(raw.area),
    landmark: strOrUndef(raw.landmark),
    instructions,
    notes: instructions,
    geocoded_address: strOrUndef(raw.geocoded_address),
    place_id: strOrUndef(raw.place_id),
    location_source: (strOrUndef(raw.location_source) as LocationSource | undefined),
    gps_accuracy_m: numOrUndef(raw.gps_accuracy_m),
    pin_shift_m: numOrUndef(raw.pin_shift_m),
  };
}

/**
 * App DTO → request body. Sends every field the API accepts (the old mutation silently dropped
 * notes/details). `notes` is accepted as an alias of `instructions` for older call sites.
 */
export function toAddressRequestBody(dto: Partial<CreateAddressDTO>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const set = (k: string, v: unknown) => {
    if (v !== undefined) body[k] = v;
  };
  set('label', dto.label);
  set('address_line', dto.address_line);
  set('city', dto.city);
  set('country', dto.country);
  set('lat', dto.lat);
  set('lng', dto.lng);
  set('is_default', dto.is_default);
  set('house_unit', dto.house_unit);
  set('street', dto.street);
  set('block_phase', dto.block_phase);
  set('area', dto.area);
  set('landmark', dto.landmark);
  set('instructions', dto.instructions ?? dto.notes);
  set('geocoded_address', dto.geocoded_address);
  set('place_id', dto.place_id);
  set('location_source', dto.location_source);
  if (dto.gps_accuracy_m !== undefined && dto.gps_accuracy_m !== null) set('gps_accuracy_m', Math.round(dto.gps_accuracy_m * 10) / 10);
  if (dto.pin_shift_m !== undefined && dto.pin_shift_m !== null) set('pin_shift_m', Math.round(dto.pin_shift_m));
  return body;
}

/** Details from a saved address (for the edit form). */
export function detailsFromAddress(a: Partial<Address> | null | undefined): AddressDetailsInput {
  return {
    house_unit: a?.house_unit ?? '',
    street: a?.street ?? '',
    block_phase: a?.block_phase ?? '',
    area: a?.area ?? '',
    landmark: a?.landmark ?? '',
    instructions: a?.instructions ?? a?.notes ?? '',
  };
}

/** Trimmed, length-limited details; empty strings become undefined (not sent) on create. */
export function cleanDetails(d: AddressDetailsInput): Partial<Record<keyof AddressDetailsInput, string>> {
  const out: Partial<Record<keyof AddressDetailsInput, string>> = {};
  (Object.keys(d) as (keyof AddressDetailsInput)[]).forEach((k) => {
    const v = norm(d[k]).slice(0, ADDRESS_DETAIL_LIMITS[k]);
    if (v) out[k] = v;
  });
  return out;
}
