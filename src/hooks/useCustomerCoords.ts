import { useMemo } from 'react';
import { useLocationStore } from '../store/location.store';
import { isValidCoordinate, type Coordinates } from '../utils/locationUtils';

/**
 * The ONE source of the customer's position for every worker list and distance label:
 * the selected address when the user picked one, otherwise the device location.
 *
 * Returns null when neither is known (permission denied, no fix yet) — callers must treat that as
 * "distance unavailable". It never substitutes a fixed city centre.
 */
export function useCustomerCoords(): Coordinates | null {
  const locationMode = useLocationStore((s) => s.locationMode);
  const selectedAddress = useLocationStore((s) => s.selectedAddress);
  const currentLocation = useLocationStore((s) => s.currentLocation);

  return useMemo(() => {
    if (locationMode === 'address' && selectedAddress) {
      const addr = { lat: Number(selectedAddress.lat), lng: Number(selectedAddress.lng) };
      if (isValidCoordinate(addr)) return addr;
    }
    return isValidCoordinate(currentLocation)
      ? { lat: currentLocation.lat, lng: currentLocation.lng }
      : null;
  }, [locationMode, selectedAddress, currentLocation]);
}
