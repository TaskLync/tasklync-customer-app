import { useLocationStore } from '../../store/location.store';
import { resolveAddress, isResolvedAddress } from '../maps/addressResolver';
import { haversineM } from '../../utils/addressSelect';
import type { Coordinates } from '../../types/location.types';
import type { ReverseGeocodeResult } from '../../types/address.types';

/** A resolved address still describes a position if it was resolved within this distance of it. */
export const ADDRESS_MATCH_METERS = 30;

export function addressMatchesLocation(
  address: ReverseGeocodeResult | null | undefined,
  loc: Coordinates | null | undefined
): address is ReverseGeocodeResult {
  if (!address || !loc || !isResolvedAddress(address)) return false;
  return haversineM(address.lat, address.lng, loc.lat, loc.lng) <= ADDRESS_MATCH_METERS;
}

/**
 * Resolves the readable address for `coords` and stores it (with the coordinates it was resolved
 * from) in the location store. Safe to call repeatedly: already-resolved positions are skipped,
 * identical lookups are shared/cached by the resolver, and a result that arrives after the device
 * position has moved on is discarded.
 */
export async function resolveCurrentAddress(coords: Coordinates): Promise<void> {
  const store = useLocationStore.getState();
  if (addressMatchesLocation(store.currentAddress, coords)) return;

  try {
    const res = await resolveAddress(coords.lat, coords.lng);
    if (!isResolvedAddress(res)) return;

    const now = useLocationStore.getState();
    // Position changed while we were resolving → this answer is for somewhere else.
    if (now.currentLocation && haversineM(now.currentLocation.lat, now.currentLocation.lng, coords.lat, coords.lng) > ADDRESS_MATCH_METERS) {
      return;
    }
    now.setCurrentAddress(res);
    now.setCurrentCity(res.city || null);
  } catch {
    // network/provider failure: leave the UI on its honest fallback
  }
}
