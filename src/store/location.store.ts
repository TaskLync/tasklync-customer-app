import { create } from 'zustand';
import { createMMKV } from 'react-native-mmkv';
import { Coordinates } from '../types/location.types';
import { PlacePrediction, Address, ReverseGeocodeResult } from '../types/address.types';
import type { AddressDetailsInput } from '../utils/addressDetails';

const storage = createMMKV({ id: 'tasklync_location_storage' });
const MAX_RECENT_SEARCHES = 5;

export type LocationMode = 'gps' | 'address';

/**
 * Provenance of `currentLocation` for this app session (never persisted):
 *  - device-cache: OS last-known fix, recent but not re-measured
 *  - approximate:  real fix with a wide radius (approximate permission / weak GPS)
 *  - gps:          fresh verified GPS fix (also mirrored in `liveLocation`)
 * `null` means the position was restored from disk (age unknown) or there is none.
 */
export interface LocationFix {
  source: 'device-cache' | 'approximate' | 'gps';
  /** horizontal accuracy radius in metres */
  accuracy: number | null;
  /** epoch ms when the device measured the fix */
  timestamp: number;
}

export interface AddressDraft {
  lat: number;
  lng: number;
  /** epoch ms of the last change */
  at: number;
  details?: AddressDetailsInput | undefined;
  label?: string | undefined;
}

/** Drafts older than this are not restored (the customer has probably moved on). */
export const ADDRESS_DRAFT_MAX_AGE_MS = 30 * 60 * 1000;

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
  setLiveLocation: (loc: Coordinates, meta?: { accuracy?: number | null; timestamp?: number }) => void;

  locationFix: LocationFix | null;
  setLocationFix: (fix: LocationFix | null) => void;

  currentCity: string | null;
  setCurrentCity: (city: string | null) => void;

  /**
   * Human-readable address resolved for `currentAddress.lat/lng` (the coordinates it was resolved
   * from). Display text only — consumers must compare those coordinates with the active position
   * before showing it, and must never use it as the source of truth for coordinates.
   */
  currentAddress: ReverseGeocodeResult | null;
  setCurrentAddress: (address: ReverseGeocodeResult | null) => void;

  locationMode: LocationMode;
  setLocationMode: (mode: LocationMode) => void;

  selectedAddress: Address | null;
  setSelectedAddress: (address: Address | null) => void;

  lastPickedCoords: Coordinates | null;
  setLastPickedCoords: (coords: Coordinates | null) => void;

  /**
   * Unsaved add-address work (pin + typed details). Survives an app kill / OS restart so a
   * customer never loses a carefully placed pin; cleared on save or explicit exit.
   */
  addressDraft: AddressDraft | null;
  setAddressDraft: (draft: AddressDraft | null) => void;

  recentSearches: PlacePrediction[];
  addRecentSearch: (search: PlacePrediction) => void;
  clearRecentSearches: () => void;

  isLocating: boolean;
  setIsLocating: (isLocating: boolean) => void;

  hydrate: () => void;

  /**
   * Sign-out / account switch: drops everything that belongs to the customer's ACCOUNT (saved
   * address selection, drafts, searches). Device position is not account data and is kept.
   */
  resetAccountScoped: () => void;
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
    set(
      loc
        ? { currentLocation: loc }
        : { currentLocation: null, liveLocation: null, liveLocationAt: null, locationFix: null }
    );
  },

  liveLocation: null,
  liveLocationAt: null,
  setLiveLocation: (loc, meta) => {
    get().setCurrentLocation(loc);
    const now = Date.now();
    set({
      liveLocation: loc,
      liveLocationAt: now,
      locationFix: { source: 'gps', accuracy: meta?.accuracy ?? null, timestamp: meta?.timestamp ?? now },
    });
  },

  locationFix: null,
  setLocationFix: (fix) => set({ locationFix: fix }),

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

  currentAddress: null,
  setCurrentAddress: (address) => {
    if (address) {
      storage.set('current_address', JSON.stringify(address));
    } else {
      storage.remove('current_address');
    }
    set({ currentAddress: address });
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

  addressDraft: null,
  setAddressDraft: (draft) => {
    try {
      if (draft) storage.set('address_draft', JSON.stringify(draft));
      else storage.remove('address_draft');
    } catch (_e) {}
    set({ addressDraft: draft });
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
    const currentAddressStr = storage.getString('current_address');
    const addressDraftStr = storage.getString('address_draft');

    let addressDraft: AddressDraft | null = null;
    if (addressDraftStr) {
      try {
        const d = JSON.parse(addressDraftStr);
        if (d && Number.isFinite(d.lat) && Number.isFinite(d.lng) && Date.now() - Number(d.at) < ADDRESS_DRAFT_MAX_AGE_MS) {
          addressDraft = d;
        } else {
          storage.remove('address_draft');
        }
      } catch (e) {}
    }

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

    let currentAddress: ReverseGeocodeResult | null = null;
    if (currentAddressStr) {
      try {
        currentAddress = JSON.parse(currentAddressStr);
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
      currentAddress,
      locationMode,
      selectedAddress,
      lastPickedCoords,
      recentSearches,
      addressDraft,
    });
  },

  resetAccountScoped: () => {
    try {
      ['selected_address', 'last_picked_coords', 'address_draft', 'recent_searches'].forEach((k) => storage.remove(k));
      storage.set('location_mode', 'gps');
    } catch (_e) {}
    set({
      selectedAddress: null,
      locationMode: 'gps',
      lastPickedCoords: null,
      addressDraft: null,
      recentSearches: [],
    });
  },
}));
