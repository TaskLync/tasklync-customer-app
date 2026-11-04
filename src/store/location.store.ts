import { create } from 'zustand';
import { createMMKV } from 'react-native-mmkv';
import { Coordinates } from '../types/location.types';
import { PlacePrediction, Address } from '../types/address.types';

const storage = createMMKV({ id: 'tasklync_location_storage' });
const MAX_RECENT_SEARCHES = 5;

export type LocationMode = 'gps' | 'address';

export interface LocationStoreState {
  permissionStatus: 'granted' | 'denied' | 'undetermined';
  setPermissionStatus: (status: 'granted' | 'denied' | 'undetermined') => void;

  isServicesEnabled: boolean;
  setIsServicesEnabled: (enabled: boolean) => void;

  /**
   * Last known device coordinates. After a cold start this is HYDRATED from disk and may be
   * arbitrarily old — only good for instant previews (e.g. nearby-worker queries).
   * Use `liveLocation` for anything presented as "you are here".
   */
  currentLocation: Coordinates | null;
  setCurrentLocation: (loc: Coordinates | null) => void;

  /** Coordinates from a verified GPS fix obtained during THIS app session (never persisted). */
  liveLocation: Coordinates | null;
  liveLocationAt: number | null;
  /** Records a fresh GPS fix: updates `currentLocation` and marks it live. */
  setLiveLocation: (loc: Coordinates) => void;

  currentCity: string | null;
  setCurrentCity: (city: string | null) => void;

  locationMode: LocationMode;
  setLocationMode: (mode: LocationMode) => void;

  selectedAddress: Address | null;
  setSelectedAddress: (address: Address | null) => void;

  lastPickedCoords: Coordinates | null;
  setLastPickedCoords: (coords: Coordinates | null) => void;

  recentSearches: PlacePrediction[];
  addRecentSearch: (search: PlacePrediction) => void;
  clearRecentSearches: () => void;

  isLocating: boolean;
  setIsLocating: (isLocating: boolean) => void;

  hydrate: () => void;
}

export const useLocationStore = create<LocationStoreState>((set, get) => ({
  permissionStatus: 'undetermined',
  setPermissionStatus: (status) => {
    if (get().permissionStatus === status) return;
    storage.set('location_permission_status', status);
    set({ permissionStatus: status });
  },

  isServicesEnabled: true,
  setIsServicesEnabled: (enabled) => {
    if (get().isServicesEnabled === enabled) return;
    set({ isServicesEnabled: enabled });
  },

  currentLocation: null,
  setCurrentLocation: (loc) => {
    const current = get().currentLocation;
    if (
      current &&
      loc &&
      current.lat === loc.lat &&
      current.lng === loc.lng
    ) {
      return;
    }
    if (loc) {
      storage.set('current_location', JSON.stringify(loc));
    } else {
      storage.remove('current_location');
    }
    set(loc ? { currentLocation: loc } : { currentLocation: null, liveLocation: null, liveLocationAt: null });
  },

  liveLocation: null,
  liveLocationAt: null,
  setLiveLocation: (loc) => {
    get().setCurrentLocation(loc);
    set({ liveLocation: loc, liveLocationAt: Date.now() });
  },

  currentCity: null,
  setCurrentCity: (city) => {
    if (get().currentCity === city) return;
    if (city) {
      storage.set('current_city', city);
    } else {
      storage.remove('current_city');
    }
    set({ currentCity: city });
  },

  locationMode: 'gps',
  setLocationMode: (mode) => {
    if (get().locationMode === mode) return;
    storage.set('location_mode', mode);
    set({ locationMode: mode });
  },

  selectedAddress: null,
  setSelectedAddress: (address) => {
    if (address) {
      storage.set('selected_address', JSON.stringify(address));
      set({ selectedAddress: address, locationMode: 'address' });
    } else {
      storage.remove('selected_address');
      set({ selectedAddress: null, locationMode: 'gps' });
    }
  },

  lastPickedCoords: null,
  setLastPickedCoords: (coords) => {
    if (coords) {
      storage.set('last_picked_coords', JSON.stringify(coords));
    } else {
      storage.remove('last_picked_coords');
    }
    set({ lastPickedCoords: coords });
  },

  recentSearches: [],
  addRecentSearch: (search) => {
    const current = get().recentSearches;
    const filtered = current.filter((item) => item.place_id !== search.place_id);
    const updated = [search, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    try {
      storage.set('recent_searches', JSON.stringify(updated));
    } catch (_e) {}
    set({ recentSearches: updated });
  },

  clearRecentSearches: () => {
    try {
      storage.remove('recent_searches');
    } catch (_e) {}
    set({ recentSearches: [] });
  },

  isLocating: false,
  setIsLocating: (isLocating) => {
    if (get().isLocating === isLocating) return;
    set({ isLocating });
  },

  hydrate: () => {
    const permissionStatus = storage.getString('location_permission_status') as
      | 'granted'
      | 'denied'
      | 'undetermined'
      | undefined;
    const currentCity = storage.getString('current_city');
    const locationStr = storage.getString('current_location');
    const lastPickedStr = storage.getString('last_picked_coords');
    const recentSearchesStr = storage.getString('recent_searches');
    const locationMode = (storage.getString('location_mode') as LocationMode) || 'gps';
    const selectedAddressStr = storage.getString('selected_address');

    let currentLocation: Coordinates | null = null;
    if (locationStr) {
      try {
        currentLocation = JSON.parse(locationStr);
      } catch (e) {}
    }

    let lastPickedCoords: Coordinates | null = null;
    if (lastPickedStr) {
      try {
        lastPickedCoords = JSON.parse(lastPickedStr);
      } catch (e) {}
    }

    let selectedAddress: Address | null = null;
    if (selectedAddressStr) {
      try {
        selectedAddress = JSON.parse(selectedAddressStr);
      } catch (e) {}
    }

    let recentSearches: PlacePrediction[] = [];
    if (recentSearchesStr) {
      try {
        recentSearches = JSON.parse(recentSearchesStr);
      } catch (e) {}
    }

    set({
      permissionStatus: permissionStatus || 'undetermined',
      currentCity: currentCity || null,
      currentLocation,
      locationMode,
      selectedAddress,
      lastPickedCoords,
      recentSearches,
    });
  },
}));
