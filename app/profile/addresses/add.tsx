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
  const { fetchLocation, isFetching: isFetchingGPS } = useCurrentLocation();
  const currentLocation = useLocationStore((s) => s.currentLocation);
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

  // Initial region setup (run once on mount)
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    if (isEditMode && existingAddress) {
      const editRegion: MapRegion = {
        latitude: existingAddress.lat,
        longitude: existingAddress.lng,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      };
      setCurrentRegion(editRegion);
      mapRef.current?.animateToRegion(editRegion, 300);
      setLastPickedCoords({ lat: existingAddress.lat, lng: existingAddress.lng });
      setGeocodeResult({
        formatted_address: existingAddress.address_line,
        address_line: existingAddress.address_line,
        city: existingAddress.city || 'Faisalabad',
        country: existingAddress.country || 'Pakistan',
        lat: existingAddress.lat,
        lng: existingAddress.lng,
      });
    } else {
      // For adding a new address:
      // 1. Center immediately on existing serviceable store GPS or Faisalabad center
      const hasValidStoreGPS =
        currentLocation && validateServiceArea(currentLocation).isServiceable;
      const initialLat = hasValidStoreGPS ? currentLocation.lat : DEFAULT_REGION.latitude;
      const initialLng = hasValidStoreGPS ? currentLocation.lng : DEFAULT_REGION.longitude;
      const initialRegion: MapRegion = {
        latitude: initialLat,
        longitude: initialLng,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      };
      setCurrentRegion(initialRegion);
      mapRef.current?.animateToRegion(initialRegion, 300);
      setLastPickedCoords({ lat: initialLat, lng: initialLng });
      triggerGeocode(initialLat, initialLng);

      // 2. Automatically request fresh, high-accuracy GPS coordinates on open
      (async () => {
        try {
          const freshCoords = await fetchLocation();
          // If the user already dragged the map or picked an address, respect user action
          if (userInteractedRef.current) return;

          if (freshCoords) {
            const validation = validateServiceArea(freshCoords);
            if (validation.isServiceable) {
              const freshRegion: MapRegion = {
                latitude: freshCoords.lat,
                longitude: freshCoords.lng,
                latitudeDelta: 0.006,
                longitudeDelta: 0.006,
              };
              setCurrentRegion(freshRegion);
              mapRef.current?.animateToRegion(freshRegion, 500);
              setLastPickedCoords(freshCoords);
              fetchImmediately(freshCoords.lat, freshCoords.lng);
            } else {
              Alert.alert('Service Unavailable', SERVICE_UNAVAILABLE_MESSAGE);
              const defaultRegion: MapRegion = {
                latitude: DEFAULT_REGION.latitude,
                longitude: DEFAULT_REGION.longitude,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
              };
              setCurrentRegion(defaultRegion);
              mapRef.current?.animateToRegion(defaultRegion, 400);
              setLastPickedCoords({
                lat: DEFAULT_REGION.latitude,
                lng: DEFAULT_REGION.longitude,
              });
              fetchImmediately(DEFAULT_REGION.latitude, DEFAULT_REGION.longitude);
            }
          }
        } catch (_e) {
          // Gracefully fallback to initial region
        }
      })();
    }
  }, [
    existingAddress,
    isEditMode,
    currentLocation,
    fetchLocation,
    fetchImmediately,
    setGeocodeResult,
    setLastPickedCoords,
    triggerGeocode,
  ]);

  // Clean up transient picked coordinates on unmount
  useEffect(() => {
    return () => {
      setLastPickedCoords(null);
    };
  }, [setLastPickedCoords]);

  const handleRegionChange = useCallback(() => {
    userInteractedRef.current = true;
    Keyboard.dismiss();
  }, []);

  const handleRegionChangeComplete = useCallback(
    (region: MapRegion) => {
      userInteractedRef.current = true;
      setCurrentRegion(region);
      setLastPickedCoords({ lat: region.latitude, lng: region.longitude });
      triggerGeocode(region.latitude, region.longitude);
    },
    [setLastPickedCoords, triggerGeocode]
  );

  const handleBack = () => {
    Keyboard.dismiss();
    router.back();
  };

  // Autocomplete prediction selected
  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    userInteractedRef.current = true;
    Keyboard.dismiss();
    const details = await selectPlace(prediction);
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
    mapRef.current?.animateToRegion(targetRegion, 400);
    setLastPickedCoords({ lat: details.lat, lng: details.lng });
    setGeocodeResult({
      formatted_address: details.formatted_address,
      address_line: details.formatted_address,
      city: details.city || 'Faisalabad',
      country: details.country || 'Pakistan',
      lat: details.lat,
      lng: details.lng,
    });
    resetSearch();
  };

  // GPS Recenter Button
  const handleGPSLocationFound = (coords: { lat: number; lng: number }) => {
    userInteractedRef.current = false;
    const validation = validateServiceArea(coords);
    if (!validation.isServiceable) {
      Alert.alert('Service Unavailable', SERVICE_UNAVAILABLE_MESSAGE);
      return;
    }

    const gpsRegion: MapRegion = {
      latitude: coords.lat,
      longitude: coords.lng,
      latitudeDelta: 0.006,
      longitudeDelta: 0.006,
    };
    setCurrentRegion(gpsRegion);
    mapRef.current?.animateToRegion(gpsRegion, 400);
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
        router.back();
      }, 180);
    } catch (_err) {
      Alert.alert(
        'Save Failed',
        "Couldn't save address. Please check your connection and try again."
      );
    }
  };

  const handleDeleteAddress = async () => {
    if (!editingAddressId) return;
    try {
      await deleteAddress(editingAddressId);
      if (selectedAddress?.id === editingAddressId) {
        setSelectedAddress(null);
      }
      setLastPickedCoords(null);
      router.back();
    } catch (_err) {
      Alert.alert('Error', "Couldn't delete address.");
    }
  };

  const isSaving = isAdding || isUpdating;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Full-Screen Map View with Fixed Center Pin */}
      <AddressPickerMap
        ref={mapRef}
        initialRegion={currentRegion}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
      />

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
        {(predictions.length > 0 || (query.trim().length === 0 && recentSearches.length > 0) || query.trim().length >= 2) && (
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
          fetchLocation={fetchLocation}
          isFetching={isFetchingGPS}
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
