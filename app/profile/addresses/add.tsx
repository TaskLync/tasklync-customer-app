import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  StatusBar,
  Keyboard,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';

import { AddressPickerMap, AddressPickerMapRef } from '../../../src/components/address/AddressPickerMap';
import { MapErrorBoundary } from '../../../src/components/address/MapErrorBoundary';
import { RouteErrorBoundary } from '../../../src/components/feedback/RouteErrorBoundary';

export { RouteErrorBoundary as ErrorBoundary };
import { AddressSearchInput } from '../../../src/components/address/AddressSearchInput';
import { AddressSearchResultsList } from '../../../src/components/address/AddressSearchResultsList';
import { UseMyLocationButton } from '../../../src/components/address/UseMyLocationButton';
import { AddressConfirmSheet } from '../../../src/components/address/AddressConfirmSheet';

import { useAddresses } from '../../../src/hooks/useAddresses';
import { useReverseGeocode } from '../../../src/hooks/useReverseGeocode';
import { usePlacesAutocomplete } from '../../../src/hooks/usePlacesAutocomplete';
import { useCurrentLocation } from '../../../src/hooks/useCurrentLocation';
import { useLocationStore } from '../../../src/store/location.store';
import { useBookingDraftStore } from '../../../src/store/bookingDraft.store';
import { locationService } from '../../../src/services/location/location.service';
import { createRequestGate } from '../../../src/utils/requestGate';

import { Address, PlacePrediction, MapRegion } from '../../../src/types/address.types';
import { colors, palette, radius, shadows } from '../../../src/design';
import {
  validateServiceArea,
  SERVICE_UNAVAILABLE_MESSAGE,
  FAISALABAD_DEFAULT_REGION,
} from '../../../src/config/serviceArea.config';

const DEFAULT_REGION: MapRegion = FAISALABAD_DEFAULT_REGION;

/**
 * Screen 2 — Add / Edit Address Map Picker (`addresses/add.tsx`)
 *
 * Implements Principal RN / UX Architecture:
 * - Jakob's Law: Fixed center pin with moving map underneath (Uber / Careem mental model)
 * - Hick's Law: 3 quick label choices with single-select radio behavior
 * - Fitts's Law: 48px GPS button & 52px sticky action button in thumb zone
 * - Peak-End Rule: Instant tactile feedback on save with seamless cache sync
 * - Session token billing management for Google Places Autocomplete
 * - Non-blocking duplicate address detection within 15m radius
 */
export default function AddEditAddressScreen() {
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
    isFetching: isFetchingGPS,
    error: gpsError,
  } = useCurrentLocation();
  // LIVE GPS only: the persisted "current_location" is hydrated from a previous session and can be
  // days old - it must never seed the pin as if it were where the customer is now.
  const liveLocation = useLocationStore((s) => s.liveLocation);
  const selectedAddress = useLocationStore((s) => s.selectedAddress);
  const setSelectedAddress = useLocationStore((s) => s.setSelectedAddress);
  const setCurrentCity = useLocationStore((s) => s.setCurrentCity);
  const setLastPickedCoords = useLocationStore((s) => s.setLastPickedCoords);
  const setBookingAddress = useBookingDraftStore((s) => s.setAddress);

  // Map & Location state
  const mapRef = useRef<AddressPickerMapRef | null>(null);
  const [currentRegion, setCurrentRegion] = useState<MapRegion>(DEFAULT_REGION);

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
  const userInteractedRef = useRef<boolean>(false);
  const selectGateRef = useRef(createRequestGate());
  const isSubmittingRef = useRef(false);

  // Programmatic camera moves (initial centering, GPS, search pick) also fire region events;
  // they must not count as the user having picked a spot.
  const programmaticUntilRef = useRef<number>(0);
  const animateTo = useCallback((region: MapRegion, duration: number) => {
    programmaticUntilRef.current = Date.now() + duration + 1500;
    mapRef.current?.animateToRegion(region, duration);
  }, []);
  const markUserInteraction = useCallback(() => {
    if (Date.now() > programmaticUntilRef.current) userInteractedRef.current = true;
  }, []);

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
      setGeocodeResult({
        formatted_address: existingAddress.address_line,
        address_line: existingAddress.address_line,
        city: existingAddress.city || '',
        country: existingAddress.country || 'Pakistan',
        lat: existingAddress.lat,
        lng: existingAddress.lng,
      });
      return;
    }

    hasInitializedRef.current = true;
    // Adding: centre on a GPS fix from THIS session if we have one. Otherwise show the service-area
    // overview WITHOUT resolving an address for it - the default centre is not the customer's
    // location, and a fresh GPS fix is requested below.
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
      triggerGeocode(liveLocation.lat, liveLocation.lng);
    }
  }, [existingAddress, isEditMode, liveLocation, animateTo, setGeocodeResult, setLastPickedCoords, triggerGeocode]);

  // Adding: silently refresh to a verified GPS fix (never prompts; skipped if permission/GPS is off
  // or the user has already started picking a spot).
  useEffect(() => {
    if (isEditMode) return;
    let cancelled = false;
    (async () => {
      const state = await locationService.checkLocationState();
      if (cancelled || !state.granted || !state.servicesEnabled) return;
      const res = await locationService.acquireFreshGPSPosition({ mayShowUserSettingsDialog: false });
      if (cancelled || !res.success) return;
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
      fetchImmediately(coords.lat, coords.lng);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  // Clean up transient picked coordinates on unmount
  useEffect(() => {
    return () => {
      setLastPickedCoords(null);
    };
  }, [setLastPickedCoords]);

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
      markUserInteraction();
      setCurrentRegion(region);
      setLastPickedCoords({ lat: region.latitude, lng: region.longitude });
      triggerGeocode(region.latitude, region.longitude);
    },
    [markUserInteraction, setLastPickedCoords, triggerGeocode]
  );

  const handleBack = () => {
    Keyboard.dismiss();
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
      Alert.alert(
        'Location Error',
        'Could not determine location for this address. Please select directly on the map.'
      );
      resetSearch();
      return;
    }

    const validation = validateServiceArea({ lat: details.lat, lng: details.lng });
    if (!validation.isServiceable) {
      Alert.alert('Service Unavailable', SERVICE_UNAVAILABLE_MESSAGE);
      resetSearch();
      return;
    }

    const targetRegion: MapRegion = {
      latitude: details.lat,
      longitude: details.lng,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };
    setCurrentRegion(targetRegion);
    animateTo(targetRegion, 400);
    setLastPickedCoords({ lat: details.lat, lng: details.lng });
    setGeocodeResult({
      formatted_address: details.formatted_address,
      address_line: details.formatted_address,
      city: details.city || '',
      country: details.country || 'Pakistan',
      lat: details.lat,
      lng: details.lng,
    });
    resetSearch();
  };

  // GPS Recenter Button
  const handleGPSLocationFound = (coords: { lat: number; lng: number }) => {
    userInteractedRef.current = true; // explicit user action: auto-GPS must not move the pin again
    const validation = validateServiceArea(coords);
    if (!validation.isServiceable) {
      Alert.alert('Service Unavailable', SERVICE_UNAVAILABLE_MESSAGE);
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
    fetchImmediately(coords.lat, coords.lng);
  };

  // Save / Update Address Handler
  const handleSaveAddress = async (payload: {
    label: string;
    custom_label?: string | undefined;
    notes?: string | undefined;
    address_line: string;
    city: string;
    country: string;
    lat: number;
    lng: number;
  }) => {
    const validation = validateServiceArea({ lat: payload.lat, lng: payload.lng });
    if (!validation.isServiceable) {
      Alert.alert('Service Unavailable', SERVICE_UNAVAILABLE_MESSAGE);
      return;
    }

    // Double-tap guard: isSaving only flips after the next render, so two quick taps could
    // otherwise POST the same address twice.
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      let savedAddressObj: Address;

      if (isEditMode && editingAddressId) {
        await updateAddress({
          id: editingAddressId,
          payload: {
            label: payload.label,
            custom_label: payload.custom_label,
            address_line: payload.address_line,
            city: payload.city,
            country: payload.country,
            lat: payload.lat,
            lng: payload.lng,
            notes: payload.notes,
          },
        });

        savedAddressObj = {
          id: editingAddressId,
          ...payload,
          is_default: existingAddress?.is_default ?? false,
        };

        // If the edited address is the currently selected address, update it immediately in store
        if (selectedAddress?.id === editingAddressId) {
          setSelectedAddress(savedAddressObj);
          setCurrentCity(payload.city);
        }

        // The booking draft holds its own COPY of the address: refresh it, otherwise a booking
        // would still be submitted with the pre-edit coordinates/text.
        if (useBookingDraftStore.getState().addressId === editingAddressId) {
          setBookingAddress({
            id: editingAddressId,
            label: payload.label,
            street: payload.address_line,
            city: payload.city,
            latitude: payload.lat,
            longitude: payload.lng,
            isDefault: savedAddressObj.is_default,
          });
        }
      } else {
        const created = await addAddress({
          label: payload.label,
          custom_label: payload.custom_label,
          address_line: payload.address_line,
          city: payload.city,
          country: payload.country,
          lat: payload.lat,
          lng: payload.lng,
          notes: payload.notes,
          is_default: addresses.length === 0,
        });

        savedAddressObj = {
          id: (created as any)?.id || `addr-${Date.now()}`,
          ...payload,
          is_default: addresses.length === 0,
        };

        // Sync with booking draft store if returning to booking funnel
        if (params.returnToBooking === 'true') {
          setBookingAddress({
            id: savedAddressObj.id,
            label: payload.label,
            street: payload.address_line,
            city: payload.city,
            latitude: payload.lat,
            longitude: payload.lng,
            isDefault: addresses.length === 0,
          });
        }

        // Set the newly created address as the active address immediately across the app
        setSelectedAddress(savedAddressObj);
        setCurrentCity(payload.city);
      }

      setLastPickedCoords(null);

      // Smooth exit back to address list or booking
      setTimeout(() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace(params.returnToBooking === 'true' ? '/(tabs)' : '/profile/addresses');
        }
      }, 180);
    } catch (_err) {
      Alert.alert(
        'Save Failed',
        "Couldn't save address. Please check your connection and try again."
      );
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleDeleteAddress = async () => {
    if (!editingAddressId) return;
    try {
      await deleteAddress(editingAddressId);
      if (selectedAddress?.id === editingAddressId) {
        setSelectedAddress(null);
      }
      // Do not leave a deleted address as the booking destination
      if (useBookingDraftStore.getState().addressId === editingAddressId) {
        setBookingAddress(null);
      }
      setLastPickedCoords(null);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/profile/addresses');
      }
    } catch (_err) {
      Alert.alert('Error', "Couldn't delete address.");
    }
  };

  const isSaving = isAdding || isUpdating;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Full-Screen Map View with Fixed Center Pin */}
      <MapErrorBoundary>
        <AddressPickerMap
          ref={mapRef}
          initialRegion={currentRegion}
          onRegionChange={handleRegionChange}
          onRegionChangeComplete={handleRegionChangeComplete}
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
        initialLabel={existingAddress?.label || 'Home'}
        initialCustomLabel={existingAddress?.custom_label || ''}
        initialNotes={existingAddress?.notes || ''}
        isSaving={isSaving}
        onSaveAddress={handleSaveAddress}
        onDeleteAddress={isEditMode ? handleDeleteAddress : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  floatingGPSContainer: {
    position: 'absolute',
    right: 16,
    zIndex: 25,
  },
});
