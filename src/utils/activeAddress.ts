/**
 * Pure helpers that keep the app's copies of "the active address" consistent with the server list
 * and turn a saved address into the booking draft's shape (audit LOC-006/016/017).
 */
import type { Address } from '../types/address.types';
import type { BookingAddress } from '../store/bookingDraft.store';

export type ReconcileResult =
  | { action: 'keep' }
  | { action: 'clear' }
  | { action: 'refresh'; address: Address };

/**
 * Given the authoritative server list and the id the app currently treats as active:
 *  - no active id                → keep
 *  - id no longer on the server → clear (deleted elsewhere / on another device)
 *  - id present                 → refresh (copy may hold pre-edit coordinates / text)
 */
export function reconcileActiveAddress(list: Address[], activeId: string | null | undefined): ReconcileResult {
  if (!activeId) return { action: 'keep' };
  const found = list.find((a) => a.id === activeId);
  return found ? { action: 'refresh', address: found } : { action: 'clear' };
}

/** Saved address → booking draft copy. Coordinates always come from the saved address itself. */
export function toBookingAddress(a: Address): BookingAddress {
  return {
    id: a.id,
    label: a.custom_label || a.label || 'Home',
    street: a.address_line,
    ...(a.house_unit ? { unit: a.house_unit } : {}),
    city: a.city || '',
    latitude: a.lat,
    longitude: a.lng,
    ...(a.instructions ? { instructions: a.instructions } : {}),
    isDefault: Boolean(a.is_default),
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type BookingLocationResult =
  | { ok: true; addressId: string; lat: number; lng: number }
  | { ok: false; reason: 'NO_ADDRESS' | 'UNSAVED_ADDRESS' | 'NO_COORDINATES' };

/**
 * The booking's destination = ONE saved address: its id and ITS coordinates. Never a saved id with
 * live-GPS coordinates, never a placeholder id (audit LOC-007/016).
 */
export function resolveBookingLocation(
  draftAddressId: string | null | undefined,
  draftAddress: Pick<BookingAddress, 'id' | 'latitude' | 'longitude'> | null | undefined
): BookingLocationResult {
  const id = draftAddress?.id || draftAddressId || '';
  if (!id) return { ok: false, reason: 'NO_ADDRESS' };
  if (!UUID_RE.test(id)) return { ok: false, reason: 'UNSAVED_ADDRESS' };
  const lat = draftAddress?.latitude;
  const lng = draftAddress?.longitude;
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    (lat === 0 && lng === 0)
  ) {
    return { ok: false, reason: 'NO_COORDINATES' };
  }
  return { ok: true, addressId: id, lat, lng };
}
