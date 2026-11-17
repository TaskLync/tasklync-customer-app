import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Info } from 'lucide-react-native';

import { AddressPickerMap, AddressPickerMapRef } from '../../../src/components/address/AddressPickerMap';
import { MapErrorBoundary } from '../../../src/components/address/MapErrorBoundary';
import { RouteErrorBoundary } from '../../../src/components/feedback/RouteErrorBoundary';

export { RouteErrorBoundary as ErrorBoundary };
import { AddressSearchInput } from '../../../src/components/address/AddressSearchInput';
import { AddressSearchResultsList } from '../../../src/components/address/AddressSearchResultsList';
import { UseMyLocationButton } from '../../../src/components/address/UseMyLocationButton';
import { AddressConfirmSheet, type AddressConfirmPayload } from '../../../src/components/address/AddressConfirmSheet';

import { useAddresses } from '../../../src/hooks/useAddresses';
import { useReverseGeocode } from '../../../src/hooks/useReverseGeocode';
import { usePlacesAutocomplete } from '../../../src/hooks/usePlacesAutocomplete';
import { useCurrentLocation } from '../../../src/hooks/useCurrentLocation';
import { useLocationStore, ADDRESS_DRAFT_MAX_AGE_MS } from '../../../src/store/location.store';
import { useBookingDraftStore } from '../../../src/store/bookingDraft.store';
import { locationService } from '../../../src/services/location/location.service';
import { createRequestGate } from '../../../src/utils/requestGate';
import { pinShiftMeters, distanceM } from '../../../src/utils/locationConfidence';
import {
  deriveLocationSource,
  detailsFromAddress,
  type AddressDetailsInput,
  type PinOrigin,
} from '../../../src/utils/addressDetails';
import { toBookingAddress } from '../../../src/utils/activeAddress';
import { formatDistance } from '../../../src/utils/locationUtils';
import { trackLocationEvent } from '../../../src/services/location/locationTelemetry';

import { Address, PlacePrediction, MapRegion } from '../../../src/types/address.types';
import type { VerifiedLocation } from '../../../src/types/location.types';
import { radius, shadows, fontFamily } from '../../../src/design';
import {
  validateServiceArea,
  SERVICE_UNAVAILABLE_MESSAGE,
  FAISALABAD_DEFAULT_REGION,
} from '../../../src/config/serviceArea.config';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../src/theme/useAppTheme';
import { ThemedStatusBar } from '../../../src/theme/ThemedStatusBar';
import { showAlert } from '../../../src/components/feedback/AppAlert';

const DEFAULT_REGION: MapRegion = FAISALABAD_DEFAULT_REGION;
/** Above this, the pin is far enough from the live GPS fix to tell the customer. */
const PIN_SHIFT_HINT_M = 50;

interface PinOriginState {
  origin: PinOrigin;
  /** Where GPS / search / the saved address put the pin (null for a manual pan). */
  point: { lat: number; lng: number } | null;
  /** GPS radius when the origin is a GPS fix. */
  accuracy: number | null;
  placeId: string | null;
}

/**
 * Screen 2 — Add / Edit Address Map Picker (`addresses/add.tsx`)
 *
 * - Fixed centre pin with the map moving underneath; the map never waits for GPS.
 * - GPS only MOVES the map: a precise fix pre-places the pin, a low-confidence fix just centres the
 *   map with an "approximate" banner. The customer always confirms the pin (audit doc 05 §4).
 * - Structured Pakistan-style details + directions are saved with the address and reach the worker.
 * - Unsaved pin + details survive an app kill (restored for 30 minutes).
 * - Session token billing management for Places Autocomplete; latest-request-wins everywhere.
 */
export default function AddEditAddressScreen() {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    mode?: string;
    addressId?: string;
    returnToBooking?: string;
  }>();

  const isEditMode = params.mode === 'edit';
  const editingAddressId = params.addressId;

  // Stores & Hooks
  const { addresses, addAddress, updateAddress, deleteAddress, isAdding, isUpdating } =
    useAddresses();
  const {
    fetchLocation,
    acquireLocation,
    verifiedLocation,
    isFetching: isFetchingGPS,
    error: gpsError,
  } = useCurrentLocation();
  // LIVE GPS only: the persisted "current_location" is hydrated from a previous session and can be
  // days old - it must never seed the pin as if it were where the customer is now.
  const liveLocation = useLocationStore((s) => s.liveLocation);
  const permissionStatus = useLocationStore((s) => s.permissionStatus);
  const selectedAddress = useLocationStore((s) => s.selectedAddress);
  const setSelectedAddress = useLocationStore((s) => s.setSelectedAddress);
  const setCurrentCity = useLocationStore((s) => s.setCurrentCity);
  const setLastPickedCoords = useLocationStore((s) => s.setLastPickedCoords);
  const setAddressDraft = useLocationStore((s) => s.setAddressDraft);
  const setBookingAddress = useBookingDraftStore((s) => s.setAddress);

  // Unsaved draft from a previous (killed) session — read once.
  const [restoredDraft] = useState(() => {
    if (isEditMode) return null;
    const d = useLocationStore.getState().addressDraft;
    return d && Date.now() - d.at < ADDRESS_DRAFT_MAX_AGE_MS ? d : null;
  });

  // Map & Location state
  const mapRef = useRef<AddressPickerMapRef | null>(null);
  const [currentRegion, setCurrentRegion] = useState<MapRegion>(DEFAULT_REGION);
  /** Banner over the map (approximate centre / restored draft). Cleared when the user moves the map. */
  const [mapBanner, setMapBanner] = useState<string | null>(
    restoredDraft ? 'Restored your unsaved pin and details.' : null
  );

  // Reverse Geocoding hook (500ms debounced)
  const {
    result: geocodeResult,
    isLoading: isGeocoding,
    errorMessage: geocodeError,
    triggerGeocode,
    fetchImmediately,
    setResult: setGeocodeResult,
  } = useReverseGeocode({ debounceMs: 500 });

  // Autocomplete search hook (350ms debounced + session tokens)
  const {
    query,
    setQuery,
    predictions,
    isLoading: isSearching,
    isError: isSearchError,
    recentSearches,
    selectPlace,
    clearRecentSearches,
    reset: resetSearch,
  } = usePlacesAutocomplete(350);

  // Existing address lookup for edit mode
  const existingAddress: Address | undefined = isEditMode
    ? addresses.find((a) => a.id === editingAddressId)
    : undefined;

  // Track if user has manually interacted with the map or search before auto-GPS arrives
  const userInteractedRef = useRef<boolean>(Boolean(restoredDraft));
  const selectGateRef = useRef(createRequestGate());
  const isSubmittingRef = useRef(false);
  const pinOriginRef = useRef<PinOriginState>({ origin: 'map', point: null, accuracy: null, placeId: null });
  const draftDetailsRef = useRef<{ details?: AddressDetailsInput; label?: string }>({
    ...(restoredDraft?.details ? { details: restoredDraft.details } : {}),
    ...(restoredDraft?.label ? { label: restoredDraft.label } : {}),
  });

  const setPinOrigin = useCallback((next: PinOriginState) => {
    pinOriginRef.current = next;
  }, []);

  // Programmatic camera moves (initial centering, GPS, search pick) also fire region events;
  // they must not count as the user having picked a spot.
  const programmaticUntilRef = useRef<number>(0);
  const animateTo = useCallback((region: MapRegion, duration: number) => {
    programmaticUntilRef.current = Date.now() + duration + 1500;
    mapRef.current?.animateToRegion(region, duration);
  }, []);
  const isUserGesture = useCallback(() => Date.now() > programmaticUntilRef.current, []);
  const markUserInteraction = useCallback(() => {
    if (isUserGesture()) userInteractedRef.current = true;
  }, [isUserGesture]);

  /** A low-confidence fix: show the right part of the city, never pre-place the pin as "you". */
  const centreOnApproximate = useCallback(
    (loc: VerifiedLocation) => {
      const coords = { lat: loc.lat, lng: loc.lng };
      if (!validateServiceArea(coords).isServiceable) return;
      const delta = loc.accuracy > 500 ? 0.03 : 0.012;
      const region: MapRegion = { latitude: coords.lat, longitude: coords.lng, latitudeDelta: delta, longitudeDelta: delta };
      setCurrentRegion(region);
      animateTo(region, 450);
      setPinOrigin({ origin: 'map', point: null, accuracy: null, placeId: null });
      setMapBanner(`Approximate location (±${formatDistance(loc.accuracy) || `${Math.round(loc.accuracy)} m`}). Move the map so the pin sits on your door.`);
    },
    [animateTo, setPinOrigin]
  );

  // Initial region setup (run once, as soon as the data it needs is available)
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) return;

    if (isEditMode) {
      // Saved addresses may still be loading (cold start / deep link): wait for them instead of
      // initialising once with an empty state and never again.
      if (!existingAddress) return;
      hasInitializedRef.current = true;
      const editRegion: MapRegion = {
        latitude: existingAddress.lat,
        longitude: existingAddress.lng,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      };
      setCurrentRegion(editRegion);
      animateTo(editRegion, 300);
      setLastPickedCoords({ lat: existingAddress.lat, lng: existingAddress.lng });
      setPinOrigin({ origin: 'saved', point: { lat: existingAddress.lat, lng: existingAddress.lng }, accuracy: null, placeId: existingAddress.place_id ?? null });
      setGeocodeResult({
        formatted_address: existingAddress.geocoded_address || existingAddress.address_line,
        address_line: existingAddress.geocoded_address || existingAddress.address_line,
        city: existingAddress.city || '',
        country: existingAddress.country || '',
        area: existingAddress.area,
        lat: existingAddress.lat,
        lng: existingAddress.lng,
      });
      return;
    }

    hasInitializedRef.current = true;

    // 1. A pin the customer placed before the app was killed wins over everything.
    if (restoredDraft && validateServiceArea(restoredDraft).isServiceable) {
      const r: MapRegion = { latitude: restoredDraft.lat, longitude: restoredDraft.lng, latitudeDelta: 0.005, longitudeDelta: 0.005 };
      setCurrentRegion(r);
      animateTo(r, 300);
      setLastPickedCoords({ lat: restoredDraft.lat, lng: restoredDraft.lng });
      triggerGeocode(restoredDraft.lat, restoredDraft.lng);
      return;
    }

    // 2. A GPS fix from THIS session. Otherwise the service-area overview WITHOUT resolving an
    // address for it (the default centre is not the customer's location); a fresh fix follows.
    if (liveLocation && validateServiceArea(liveLocation).isServiceable) {
      const initialRegion: MapRegion = {
        latitude: liveLocation.lat,
        longitude: liveLocation.lng,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      };
      setCurrentRegion(initialRegion);
      animateTo(initialRegion, 300);
      setLastPickedCoords({ lat: liveLocation.lat, lng: liveLocation.lng });
      setPinOrigin({ origin: 'gps', point: liveLocation, accuracy: null, placeId: null });
      triggerGeocode(liveLocation.lat, liveLocation.lng);
    }
  }, [existingAddress, isEditMode, liveLocation, restoredDraft, animateTo, setGeocodeResult, setLastPickedCoords, setPinOrigin, triggerGeocode]);

  // Adding: silently refresh to a verified GPS fix (never prompts; skipped if permission/GPS is off
  // or the user has already started picking a spot). A low-confidence fix only centres the map.
  useEffect(() => {
    if (isEditMode) return;
    let cancelled = false;
    (async () => {
      const state = await locationService.checkLocationState();
      if (cancelled || !state.granted || !state.servicesEnabled) return;
      if (!liveLocation && !userInteractedRef.current) {
        // Instant, battery-free centring while the fresh fix converges.
        const hint = await locationService.getMapCentreHint();
        if (!cancelled && hint && !userInteractedRef.current && !useLocationStore.getState().liveLocation) {
          centreOnApproximate(hint);
        }
      }
      const res = await locationService.acquireFreshGPSPosition({ mayShowUserSettingsDialog: false });
      if (cancelled) return;
      trackLocationEvent('location_acquire', {
        outcome: res.success ? 'ok' : res.error.code,
        accuracy_m: res.success ? res.location.accuracy : res.error.accuracy ?? null,
        precision: res.success ? res.precision ?? 'unknown' : state.precision,
      });
      if (!res.success) {
        if (res.error.approximateLocation && !userInteractedRef.current) centreOnApproximate(res.error.approximateLocation);
        return;
      }
      const coords = { lat: res.location.lat, lng: res.location.lng };
      useLocationStore.getState().setLiveLocation(coords);
      if (userInteractedRef.current) return;
      if (!validateServiceArea(coords).isServiceable) return;
      const region: MapRegion = {
        latitude: coords.lat,
        longitude: coords.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setCurrentRegion(region);
      animateTo(region, 400);
      setLastPickedCoords(coords);
      setPinOrigin({ origin: 'gps', point: coords, accuracy: res.location.accuracy, placeId: null });
      setMapBanner(null);
      fetchImmediately(coords.lat, coords.lng);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  // Clean up transient picked coordinates on unmount (the persisted draft is handled separately)
  useEffect(() => {
    return () => {
      setLastPickedCoords(null);
    };
  }, [setLastPickedCoords]);

  /** Persist the unsaved pin + details so an app kill never loses them. */
  const persistDraft = useCallback(
    (lat: number, lng: number) => {
      if (isEditMode) return;
      setAddressDraft({ lat, lng, at: Date.now(), ...draftDetailsRef.current });
    },
    [isEditMode, setAddressDraft]
  );

  const handleDetailsChange = useCallback(
    (details: AddressDetailsInput, label: string) => {
      draftDetailsRef.current = { details, label };
      const p = useLocationStore.getState().lastPickedCoords;
      if (p) persistDraft(p.lat, p.lng);
    },
    [persistDraft]
  );

  const handleRegionChange = useCallback(() => {
    markUserInteraction();
    Keyboard.dismiss();
  }, [markUserInteraction]);

  const handleRegionChangeComplete = useCallback(
    (region: MapRegion) => {
      if (
        !region ||
        typeof region.latitude !== 'number' ||
        isNaN(region.latitude) ||
        typeof region.longitude !== 'number' ||
        isNaN(region.longitude) ||
        (Math.abs(region.latitude) < 0.0001 && Math.abs(region.longitude) < 0.0001)
      ) {
        return;
      }
      if (isUserGesture()) setMapBanner(null);
      markUserInteraction();
      setCurrentRegion(region);
      setLastPickedCoords({ lat: region.latitude, lng: region.longitude });
      if (userInteractedRef.current) persistDraft(region.latitude, region.longitude);
      triggerGeocode(region.latitude, region.longitude);
    },
    [isUserGesture, markUserInteraction, persistDraft, setLastPickedCoords, triggerGeocode]
  );

  const handleBack = () => {
    Keyboard.dismiss();
    // Explicit exit: the customer chose to leave, so do not resurrect this pin next time.
    if (!isEditMode) setAddressDraft(null);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  // Autocomplete prediction selected
  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    userInteractedRef.current = true;
    Keyboard.dismiss();
    const ticket = selectGateRef.current.next();
    const details = await selectPlace(prediction);
    // The user picked something else while this was resolving: drop this one silently
    if (!selectGateRef.current.isLatest(ticket)) return;
    if (!details) {
      showAlert(
        'Location Error',
        'Could not determine location for this address. Please select directly on the map.'
      );
      resetSearch();
      return;
    }

    const validation = validateServiceArea({ lat: details.lat, lng: details.lng });
    if (!validation.isServiceable) {
      showAlert('Service Unavailable', SERVICE_UNAVAILABLE_MESSAGE);
      resetSearch();
      return;
    }

    const targetRegion: MapRegion = {
      latitude: details.lat,
      longitude: details.lng,
      latitudeDelta: details.approximate ? 0.01 : 0.005,
      longitudeDelta: details.approximate ? 0.01 : 0.005,
    };
    setCurrentRegion(targetRegion);
    animateTo(targetRegion, 400);
    setLastPickedCoords({ lat: details.lat, lng: details.lng });
    persistDraft(details.lat, details.lng);
    setPinOrigin({
      origin: details.approximate ? 'map' : 'search',
      point: { lat: details.lat, lng: details.lng },
      accuracy: null,
      placeId: details.source === 'google' ? details.place_id : null,
    });
    setMapBanner(details.approximate ? 'Approximate match for your search. Move the map so the pin sits on your door.' : null);
    setGeocodeResult({
      formatted_address: details.formatted_address,
      address_line: details.formatted_address,
      city: details.city || '',
      country: details.country || '',
      area: details.area,
      lat: details.lat,
      lng: details.lng,
      source: details.source === 'google' ? 'search' : 'native',
      approximate: details.approximate,
      ...(details.source === 'google' ? { place_id: details.place_id } : {}),
    });
    resetSearch();
  };

  // GPS Recenter Button
  const handleGPSLocationFound = (coords: { lat: number; lng: number }) => {
    userInteractedRef.current = true; // explicit user action: auto-GPS must not move the pin again
    const validation = validateServiceArea(coords);
    if (!validation.isServiceable) {
      showAlert('Service Unavailable', SERVICE_UNAVAILABLE_MESSAGE);
      return;
    }

    const gpsRegion: MapRegion = {
      latitude: coords.lat,
      longitude: coords.lng,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };
    setCurrentRegion(gpsRegion);
    animateTo(gpsRegion, 500);
    setLastPickedCoords(coords);
    persistDraft(coords.lat, coords.lng);
    setPinOrigin({ origin: 'gps', point: coords, accuracy: accuracyOfFix(coords), placeId: null });
    setMapBanner(null);
    fetchImmediately(coords.lat, coords.lng);
  };

  /** Accuracy of the verified fix behind `coords` (only when it is that exact fix). */
  function accuracyOfFix(coords: { lat: number; lng: number }): number | null {
    if (!verifiedLocation) return null;
    return distanceM(verifiedLocation, coords) < 1 ? verifiedLocation.accuracy : null;
  }

  const handleApproximateFromButton = (loc: VerifiedLocation) => {
    userInteractedRef.current = true;
    centreOnApproximate(loc);
  };

  // "Pin is 240 m from your current location"
  const pinHint = useMemo(() => {
    if (!geocodeResult) return null;
    const shift = pinShiftMeters(geocodeResult, liveLocation);
    if (shift === null || shift < PIN_SHIFT_HINT_M) return null;
    return `Pin is ${formatDistance(shift)} from your current location`;
  }, [geocodeResult, liveLocation]);

  // Save / Update Address Handler — resolves true ONLY when the backend confirmed the save.
  const handleSaveAddress = async (payload: AddressConfirmPayload): Promise<boolean> => {
    const validation = validateServiceArea({ lat: payload.lat, lng: payload.lng });
    if (!validation.isServiceable) {
      showAlert('Service Unavailable', SERVICE_UNAVAILABLE_MESSAGE);
      return false;
    }

    // Double-tap guard: isSaving only flips after the next render, so two quick taps could
    // otherwise POST the same address twice.
    if (isSubmittingRef.current) return false;
    isSubmittingRef.current = true;

    // Provenance of the confirmed point (stored for quality analysis; never shown as precision).
    const origin = pinOriginRef.current;
    const movedFromOrigin = origin.point ? distanceM(origin.point, payload) : null;
    const locationSource = deriveLocationSource(origin.origin, movedFromOrigin);
    const shiftFromGps = pinShiftMeters(payload, liveLocation);
    const meta = {
      location_source: locationSource,
      ...(origin.origin === 'gps' && origin.accuracy !== null && locationSource === 'gps_confirmed'
        ? { gps_accuracy_m: origin.accuracy }
        : {}),
      ...(shiftFromGps !== null ? { pin_shift_m: shiftFromGps } : {}),
      ...(origin.placeId && locationSource === 'search' ? { place_id: origin.placeId } : {}),
      ...(payload.geocoded_address ? { geocoded_address: payload.geocoded_address } : {}),
    };
    const fields = {
      label: payload.label,
      custom_label: payload.custom_label,
      address_line: payload.address_line,
      city: payload.city,
      country: payload.country,
      lat: payload.lat,
      lng: payload.lng,
      ...payload.details,
      ...meta,
    };

    try {
      let savedAddressObj: Address;

      if (isEditMode && editingAddressId) {
        const updated = await updateAddress({ id: editingAddressId, payload: fields });
        savedAddressObj = updated ?? {
          ...(existingAddress as Address),
          ...fields,
          id: editingAddressId,
          is_default: existingAddress?.is_default ?? false,
        };

        // If the edited address is the currently selected address, update it immediately in store
        if (selectedAddress?.id === editingAddressId) {
          setSelectedAddress(savedAddressObj);
          setCurrentCity(savedAddressObj.city || payload.city);
        }

        // The booking draft holds its own COPY of the address: refresh it, otherwise a booking
        // would still be submitted with the pre-edit coordinates/text.
        if (useBookingDraftStore.getState().addressId === editingAddressId) {
          setBookingAddress(toBookingAddress(savedAddressObj));
        }
      } else {
        // The server decides the default (first address); the id is the server's — never a
        // locally invented one that a booking would later fail on (audit LOC-007).
        savedAddressObj = await addAddress({ ...fields, is_default: addresses.length === 0 });

        // Sync with booking draft store if returning to booking funnel
        if (params.returnToBooking === 'true') {
          setBookingAddress(toBookingAddress(savedAddressObj));
        }

        // Set the newly created address as the active address immediately across the app
        setSelectedAddress(savedAddressObj);
        setCurrentCity(savedAddressObj.city || payload.city);
      }

      trackLocationEvent('address_saved', {
        source: locationSource,
        accuracy_m: origin.accuracy,
        pin_shift_m: shiftFromGps,
        has_details: Object.keys(payload.details).length > 0,
        edit: isEditMode,
      });

      setLastPickedCoords(null);
      setAddressDraft(null);

      // Smooth exit back to address list or booking
      setTimeout(() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace(params.returnToBooking === 'true' ? '/(tabs)' : '/profile/addresses');
        }
      }, 450);
      return true;
    } catch (err: any) {
      trackLocationEvent('address_save_failed', {
        reason: err?.isNetworkError ? 'network' : err?.isTimeout ? 'timeout' : String(err?.status ?? 'unknown'),
      });
      // The pin and every typed field stay exactly as they are (and in the persisted draft).
      showAlert(
        'Address not saved',
        err?.isNetworkError || err?.isTimeout
          ? "You're offline or the connection is slow. Your pin and details are kept — tap Save again when you're connected."
          : err?.message || "Couldn't save the address. Your pin and details are kept — please try again."
      );
      return false;
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleDeleteAddress = async () => {
    if (!editingAddressId) return;
    try {
      // useAddresses clears the active selection / booking draft for a deleted address.
      await deleteAddress(editingAddressId);
      setLastPickedCoords(null);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/profile/addresses');
      }
    } catch (_err) {
      showAlert('Error', "Couldn't delete address.");
    }
  };

  const isSaving = isAdding || isUpdating;
  const initialDetails = isEditMode
    ? existingAddress
      ? detailsFromAddress(existingAddress)
      : undefined
    : restoredDraft?.details;

  return (
    <View style={styles.container}>
      <ThemedStatusBar />

      {/* Full-Screen Map View with Fixed Center Pin */}
      <MapErrorBoundary>
        <AddressPickerMap
          ref={mapRef}
          initialRegion={currentRegion}
          onRegionChange={handleRegionChange}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation={permissionStatus === 'granted'}
        />
      </MapErrorBoundary>

      {/* Top Floating Overlay (Back button + Search Input + Autocomplete Results) */}
      <SafeAreaView edges={['top']} style={styles.topSafeArea} pointerEvents="box-none">
        <View style={styles.topBarRow} pointerEvents="box-none">
          {/* Back Button */}
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.4} />
          </Pressable>

          {/* Floating Search Input */}
          <View style={styles.searchWrap}>
            <AddressSearchInput
              value={query}
              onChangeText={setQuery}
              onClear={resetSearch}
              isLoading={isSearching}
              placeholder="Search area, street, or landmark in Faisalabad..."
            />
          </View>
        </View>

        {/* Autocomplete & Recent Searches Dropdown */}
        {(predictions.length > 0 || query.trim().length >= 2) && (
          <View style={styles.searchResultsContainer}>
            <AddressSearchResultsList
              predictions={predictions}
              recentSearches={recentSearches}
              query={query}
              isLoading={isSearching}
              isError={isSearchError}
              onSelectPrediction={handleSelectPrediction}
              onClearRecentSearches={clearRecentSearches}
            />
          </View>
        )}

        {/* Approximate centre / restored draft notice (map stays fully interactive) */}
        {Boolean(mapBanner) && predictions.length === 0 && query.trim().length < 2 && (
          <View style={styles.mapBanner} pointerEvents="none" accessibilityLiveRegion="polite">
            <Info size={14} color={palette.warningDark} strokeWidth={2.4} />
            <Text style={styles.mapBannerText} maxFontSizeMultiplier={1.3}>
              {mapBanner}
            </Text>
          </View>
        )}
      </SafeAreaView>

      {/* Floating GPS Recenter Button (Above collapsed bottom sheet) */}
      <View
        style={[
          styles.floatingGPSContainer,
          { bottom: Math.max(insets.bottom, 16) + 190 },
        ]}
      >
        <UseMyLocationButton
          onLocationFound={handleGPSLocationFound}
          onApproximateLocation={handleApproximateFromButton}
          acquireLocation={acquireLocation}
          fetchLocation={fetchLocation}
          isFetching={isFetchingGPS}
          error={gpsError}
        />
      </View>

      {/* Bottom Confirmation Sheet */}
      <AddressConfirmSheet
        reverseGeocodeResult={geocodeResult}
        isGeocoding={isGeocoding || isFetchingGPS}
        geocodingError={geocodeError}
        savedAddresses={addresses}
        currentAddressId={editingAddressId}
        isEditMode={isEditMode}
        initialLabel={existingAddress?.label || restoredDraft?.label || 'Home'}
        initialCustomLabel={existingAddress?.custom_label || ''}
        initialNotes={existingAddress?.instructions || existingAddress?.notes || ''}
        initialDetails={initialDetails}
        pinHint={pinHint}
        onDetailsChange={handleDetailsChange}
        isSaving={isSaving}
        onSaveAddress={handleSaveAddress}
        onDeleteAddress={isEditMode ? handleDeleteAddress : undefined}
      />
    </View>
  );
}

const createStyles = ({ palette }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.zenWhite,
  },
  topSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radius.circle,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  backButtonPressed: {
    backgroundColor: palette.gray50,
    transform: [{ scale: 0.96 }],
  },
  searchWrap: {
    flex: 1,
  },
  searchResultsContainer: {
    marginTop: 4,
    paddingHorizontal: 2,
  },
  mapBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: palette.warningLight,
    borderWidth: 1,
    borderColor: palette.warning,
    ...shadows.md,
  },
  mapBannerText: {
    flex: 1,
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 12,
    lineHeight: 16,
    color: palette.warningDark,
  },
  floatingGPSContainer: {
    position: 'absolute',
    right: 16,
    zIndex: 25,
  },
});
