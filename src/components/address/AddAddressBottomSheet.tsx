import { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  Navigation,
  Check,
  X,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import { locationService } from '../../services/location/location.service';

import { BottomSheet, BottomSheetRef } from '../layout/BottomSheet/BottomSheet';
import { BottomSheetScrollView } from '../layout/BottomSheet/BottomSheetScrollView';
import { DefaultAddressBadge } from './DefaultAddressBadge';
import { ErrorBoundary } from '../feedback/ErrorBoundary';
import { userApi } from '../../services/api/user.api';
import { useAddresses } from '../../hooks/useAddresses';
import { useBookingDraftStore, BookingAddress } from '../../store/bookingDraft.store';
import { useAuthStore } from '../../store/auth.store';
import { useLocationStore } from '../../store/location.store';
import { Address } from '../../types/address.types';
import { labelToIcon } from '../../utils/address';
import { colors, palette, fontFamily, radius } from '../../design';
import { generateUUID, isValidUUID } from '../../utils/uuid';
import {
  validateServiceArea,
  SERVICE_UNAVAILABLE_MESSAGE,
  FAISALABAD_CENTER,
} from '../../config/serviceArea.config';

const LABEL_PRESETS = ['Home', 'Office', 'Apartment', 'Other'];

export interface AddAddressBottomSheetRef {
  open: () => void;
  close: () => void;
}

export interface AddAddressBottomSheetProps {
  onAddressCreated?: (address: BookingAddress) => void;
}

export const AddAddressBottomSheet = forwardRef<
  AddAddressBottomSheetRef,
  AddAddressBottomSheetProps
>(({ onAddressCreated }, ref) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const streetInputRef = useRef<TextInput>(null);
  const queryClient = useQueryClient();

  const token = useAuthStore((s) => s.accessToken);
  const draftAddressId = useBookingDraftStore((s) => s.addressId);
  const setAddressStore = useBookingDraftStore((s) => s.setAddress);
  // Live GPS only. The persisted last position is from an earlier session and may be far away.
  const currentLocation = useLocationStore((s) => s.liveLocation);
  const currentCity = useLocationStore((s) => s.currentCity);
  const selectedStoreAddress = useLocationStore((s) => s.selectedAddress);

  const {
    addresses,
    isLoading: isAddressesLoading,
    isError: isAddressesError,
    refetch: refetchAddresses,
  } = useAddresses();

  const isCurrentServiceable = Boolean(
    currentLocation && validateServiceArea(currentLocation).isServiceable
  );
  const defaultCity = isCurrentServiceable && currentCity ? currentCity : 'Faisalabad';
  const defaultCoords =
    isCurrentServiceable && currentLocation ? currentLocation : FAISALABAD_CENTER;

  const [label, setLabel] = useState('Home');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState(defaultCity);
  const [lat, setLat] = useState<number>(defaultCoords.lat);
  const [lng, setLng] = useState<number>(defaultCoords.lng);
  const [isStreetFocused, setIsStreetFocused] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isSubmittingRef = useRef(false);
  const router = useRouter();
  // True only when lat/lng come from a real GPS fix. The Faisalabad centre used as a visual default
  // is NOT the address the customer typed, so it must never be saved as its coordinates.
  const [coordsVerified, setCoordsVerified] = useState<boolean>(isCurrentServiceable);

  useImperativeHandle(ref, () => ({
    open: () => {
      setStreet('');
      setLabel('Home');
      if (isCurrentServiceable && currentLocation) {
        setLat(currentLocation.lat);
        setLng(currentLocation.lng);
        setCoordsVerified(true);
        if (currentCity) setCity(currentCity);
      } else {
        setLat(FAISALABAD_CENTER.lat);
        setLng(FAISALABAD_CENTER.lng);
        setCoordsVerified(false);
        setCity('Faisalabad');
      }
      bottomSheetRef.current?.open();
    },
    close: () => {
      bottomSheetRef.current?.close();
    },
  }));

  const handleClose = () => {
    bottomSheetRef.current?.close();
  };

  // Select an existing saved address directly from the sheet
  const handleSelectSavedAddress = (addr: Address) => {
    if (!addr) return;

    const coords = {
      lat: typeof addr.lat === 'number' ? addr.lat : FAISALABAD_CENTER.lat,
      lng: typeof addr.lng === 'number' ? addr.lng : FAISALABAD_CENTER.lng,
    };

    const validation = validateServiceArea(coords);
    if (!validation.isServiceable) {
      Alert.alert('Service Unavailable', SERVICE_UNAVAILABLE_MESSAGE);
      return;
    }

    const bookingAddr: BookingAddress = {
      id: addr.id,
      label: addr.custom_label || addr.label || 'Home',
      street: addr.address_line,
      city: addr.city || 'Faisalabad',
      latitude: coords.lat,
      longitude: coords.lng,
      isDefault: Boolean(addr.is_default),
    };

    setAddressStore(bookingAddr);

    const { setSelectedAddress, setCurrentCity: setStoreCity } = useLocationStore.getState();
    setSelectedAddress(addr);
    setStoreCity(bookingAddr.city);

    if (onAddressCreated) {
      onAddressCreated(bookingAddr);
    }

    bottomSheetRef.current?.close();
  };

  // Detect Current GPS Location & auto-fill or select
  const handleUseGPS = async () => {
    setIsLocating(true);
    try {
      const state = await locationService.checkLocationState();
      if (!state.granted) {
        const perm = await locationService.requestPermission();
        if (!perm.granted) {
          if (!perm.canAskAgain) {
            Alert.alert(
              'Permission Required',
              'Location permission is permanently disabled. Please enable it in Settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: locationService.openSettings },
              ]
            );
          } else {
            Alert.alert('Permission Denied', 'Please enable location permissions to use GPS.');
          }
          setIsLocating(false);
          return;
        }
      }

      if (!state.servicesEnabled) {
        Alert.alert(
          'Location Services Off',
          'Please enable GPS in your device settings to detect your current location.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: locationService.openSettings },
          ]
        );
        setIsLocating(false);
        return;
      }

      const freshResult = await locationService.acquireFreshGPSPosition();

      if (freshResult.success) {
        const coords = {
          lat: freshResult.location.lat,
          lng: freshResult.location.lng,
        };
        const validation = validateServiceArea(coords);
        if (!validation.isServiceable) {
          Alert.alert('Service Unavailable', SERVICE_UNAVAILABLE_MESSAGE);
          setIsLocating(false);
          return;
        }

        setLat(coords.lat);
        setLng(coords.lng);
        setCoordsVerified(true);
        useLocationStore.getState().setLiveLocation(coords);

        const geo = await locationService.reverseGeocode(coords);
        if (geo?.addressLine && geo.addressLine !== 'Current GPS Location') {
          setStreet(geo.addressLine);
        } else if (!street.trim()) {
          setStreet('Current GPS Location, Faisalabad');
        }
        if (geo?.cityName) {
          setCity(geo.cityName);
        }
      } else {
        Alert.alert(
          freshResult.error.code === 'SERVICES_DISABLED'
            ? 'Location Services Off'
            : freshResult.error.code === 'LOW_ACCURACY'
            ? 'Weak GPS Signal'
            : 'Location Error',
          freshResult.error.userMessage
        );
      }
    } catch (_err) {
      Alert.alert('Location Error', 'Unable to retrieve current GPS location.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSave = async () => {
    if (!street.trim()) {
      Alert.alert('Address Required', 'Please enter your street / building address.');
      streetInputRef.current?.focus();
      return;
    }

    const validation = validateServiceArea({ lat, lng });
    if (!validation.isServiceable) {
      Alert.alert('Service Unavailable', SERVICE_UNAVAILABLE_MESSAGE);
      return;
    }

    // No verified position for this address: saving would attach the city centre / an unrelated
    // spot to the typed street. Send the customer to the map picker to place the pin instead.
    if (!coordsVerified) {
      Alert.alert(
        'Confirm location on map',
        'We need the exact spot for this address so your technician can find you. Tap "Use my location" or place the pin on the map.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pick on map',
            onPress: () => {
              bottomSheetRef.current?.close();
              router.push({
                pathname: '/profile/addresses/add',
                params: { returnToBooking: 'true' },
              } as any);
            },
          },
        ]
      );
      return;
    }

    if (isSubmittingRef.current) return; // double-tap guard (state updates are async)
    isSubmittingRef.current = true;
    setIsSaving(true);

    const addressText = street.trim();
    const addressCity = city.trim() || 'Faisalabad';

    try {
      let createdId = generateUUID();
      let createdAddress: BookingAddress;

      if (token) {
        const res = await userApi.createAddress({
          label,
          address_line: addressText,
          city: addressCity,
          country: 'Pakistan',
          lat,
          lng,
          is_default: true,
        });

        if (res?.id && isValidUUID(res.id)) {
          createdId = res.id;
        }

        createdAddress = {
          id: createdId,
          label: res?.label || label,
          street: res?.address_line || addressText,
          city: res?.city || addressCity,
          latitude: res?.lat || lat,
          longitude: res?.lng || lng,
          isDefault: true,
        };

        queryClient.invalidateQueries({ queryKey: ['user-addresses'] });
      } else {
        createdAddress = {
          id: createdId,
          label,
          street: addressText,
          city: addressCity,
          latitude: lat,
          longitude: lng,
          isDefault: true,
        };
      }

      setAddressStore(createdAddress);

      const { setSelectedAddress, setCurrentCity: setStoreCity } = useLocationStore.getState();
      setSelectedAddress({
        id: createdAddress.id,
        label: createdAddress.label || label,
        address_line: createdAddress.street,
        city: createdAddress.city,
        country: 'Pakistan',
        lat: createdAddress.latitude ?? lat,
        lng: createdAddress.longitude ?? lng,
        is_default: true,
      });
      setStoreCity(createdAddress.city);

      if (onAddressCreated) {
        onAddressCreated(createdAddress);
      }

      bottomSheetRef.current?.close();
      setStreet('');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save address. Please try again.');
    } finally {
      isSubmittingRef.current = false;
      setIsSaving(false);
    }
  };

  const safeAddressList = Array.isArray(addresses) ? addresses : [];
  const activeAddressId = draftAddressId || selectedStoreAddress?.id || null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={['82%', '92%']}
      contentPadding={false}
    >
      <ErrorBoundary
        fallback={
          <View style={styles.fallbackContainer}>
            <View style={styles.headerRow}>
              <View style={styles.headerTitleWrap}>
                <Text style={styles.title}>Service Address</Text>
                <Text style={styles.subtitle}>
                  An error occurred while displaying the address form. Please try reopening.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleClose}
            >
              <Text style={styles.saveButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        }
      >
        <View style={styles.sheetBody} collapsable={false}>
          {/* Fixed Sheet Header */}
          <View style={styles.header}>
            <View style={styles.headerIconBadge}>
              <MapPin size={20} color={colors.primaryDark} strokeWidth={2.3} />
            </View>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.title}>Service Address</Text>
              <Text style={styles.subtitle}>
                Use GPS, choose a saved address, or add a new location
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              hitSlop={8}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Close address sheet"
            >
              <X size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Scrollable Body */}
          <BottomSheetScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Current GPS Location Option */}
            <TouchableOpacity
              style={styles.gpsCard}
              onPress={handleUseGPS}
              disabled={isLocating}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Use current GPS location"
            >
              <View style={styles.gpsIconCircle}>
                {isLocating ? (
                  <ActivityIndicator size="small" color={colors.primaryDark} />
                ) : (
                  <Navigation size={18} color={colors.primaryDark} strokeWidth={2.3} />
                )}
              </View>
              <View style={styles.gpsTextWrap}>
                <Text style={styles.gpsTitle}>
                  {isLocating ? 'Detecting Current Location...' : 'Use Current GPS Location'}
                </Text>
                <Text style={styles.gpsSubtitle} numberOfLines={1}>
                  {currentCity
                    ? `Auto-fill doorstep location in ${currentCity}`
                    : 'Auto-detect your current street & area via GPS'}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.primaryDark} />
            </TouchableOpacity>

            {/* 2. Saved Addresses Section */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Saved Addresses</Text>
              {safeAddressList.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{safeAddressList.length}</Text>
                </View>
              )}
            </View>

            {isAddressesLoading ? (
              <View style={styles.stateBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.stateText}>Loading saved addresses...</Text>
              </View>
            ) : isAddressesError ? (
              <View style={styles.errorBox}>
                <AlertCircle size={18} color={palette.danger} />
                <View style={styles.errorTextWrap}>
                  <Text style={styles.errorTitle}>Couldn&apos;t load saved addresses</Text>
                  <Text style={styles.errorSubtitle}>Check your connection or add a new address below</Text>
                </View>
                <Pressable
                  onPress={() => refetchAddresses()}
                  style={styles.retryBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading addresses"
                >
                  <RefreshCw size={13} color={colors.primaryDark} />
                  <Text style={styles.retryBtnText}>Retry</Text>
                </Pressable>
              </View>
            ) : safeAddressList.length === 0 ? (
              <View style={styles.emptySavedBox}>
                <View style={styles.emptySavedIconWrap}>
                  <MapPin size={18} color={colors.textMuted} />
                </View>
                <View style={styles.emptySavedTextWrap}>
                  <Text style={styles.emptySavedTitle}>No saved addresses yet</Text>
                  <Text style={styles.emptySavedSubtitle}>
                    Enter your address details below to save and use it for your booking.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.savedListWrap}>
                {safeAddressList.map((addr, idx) => {
                  const IconComp = labelToIcon(addr?.label || '');
                  const isSelected = Boolean(activeAddressId && addr?.id === activeAddressId);
                  const displayLabel = addr?.custom_label || addr?.label || 'Address';
                  const key = addr?.id ? String(addr.id) : `addr-${idx}`;

                  return (
                    <Pressable
                      key={key}
                      onPress={() => handleSelectSavedAddress(addr)}
                      style={({ pressed }) => [
                        styles.savedCard,
                        isSelected && styles.savedCardSelected,
                        pressed && styles.savedCardPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${displayLabel}, ${addr?.address_line || ''}`}
                    >
                      <View
                        style={[
                          styles.savedIconCircle,
                          isSelected && styles.savedIconCircleSelected,
                        ]}
                      >
                        <IconComp
                          size={17}
                          color={isSelected ? colors.primaryDark : palette.gray600}
                          strokeWidth={2.2}
                        />
                      </View>
                      <View style={styles.savedTextWrap}>
                        <View style={styles.savedTitleRow}>
                          <Text
                            style={[
                              styles.savedLabel,
                              isSelected && styles.savedLabelSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {displayLabel}
                          </Text>
                          {Boolean(addr?.is_default) && <DefaultAddressBadge />}
                        </View>
                        <Text style={styles.savedStreet} numberOfLines={1}>
                          {[addr?.address_line, addr?.city].filter(Boolean).join(', ')}
                        </Text>
                      </View>
                      {isSelected ? (
                        <View style={styles.selectedCheckCircle}>
                          <Check size={14} color={colors.primaryDark} strokeWidth={2.8} />
                        </View>
                      ) : (
                        <ChevronRight size={16} color={colors.textMuted} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* 3. Add New Address Form Section */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Add New Address</Text>
              </View>

              {/* Label Presets */}
              <Text style={styles.inputLabel}>Address Label</Text>
              <View style={styles.presetsRow}>
                {LABEL_PRESETS.map((p) => {
                  const isSelected = label === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.presetChip, isSelected && styles.presetChipSelected]}
                      onPress={() => setLabel(p)}
                      activeOpacity={0.75}
                    >
                      {isSelected && (
                        <Check size={13} color={palette.white} style={{ marginRight: 4 }} />
                      )}
                      <Text style={[styles.presetText, isSelected && styles.presetTextSelected]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Street / Building / House No. */}
              <Text style={styles.inputLabel}>Street / Building / House No. *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  isStreetFocused && styles.inputWrapperFocused,
                ]}
              >
                <TextInput
                  ref={streetInputRef}
                  style={styles.textInput}
                  value={street}
                  onChangeText={setStreet}
                  onFocus={() => setIsStreetFocused(true)}
                  onBlur={() => setIsStreetFocused(false)}
                  placeholder="e.g. House 12, Street 4, D-Ground"
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="done"
                />
                {street.length > 0 && (
                  <Pressable
                    onPress={() => setStreet('')}
                    hitSlop={8}
                    style={styles.clearInputBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Clear address input"
                  >
                    <X size={15} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>

              {/* City */}
              <Text style={styles.inputLabel}>City</Text>
              <View style={[styles.inputWrapper, styles.inputWrapperReadonly]}>
                <TextInput
                  style={[styles.textInput, styles.textInputReadonly]}
                  value={city}
                  editable={false}
                />
                <View style={styles.serviceAreaTag}>
                  <Text style={styles.serviceAreaTagText}>Serviceable</Text>
                </View>
              </View>
            </View>
          </BottomSheetScrollView>

          {/* Sticky Bottom Confirmation Action */}
          <View style={styles.footerBar}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!street.trim() || isSaving) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!street.trim() || isSaving}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Save and select address"
            >
              {isSaving ? (
                <ActivityIndicator color={palette.white} />
              ) : (
                <Text style={styles.saveButtonText}>Save & Select Address</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ErrorBoundary>
    </BottomSheet>
  );
});

AddAddressBottomSheet.displayName = 'AddAddressBottomSheet';

const styles = StyleSheet.create({
  sheetBody: {
    flex: 1,
  },
  fallbackContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray100,
  },
  headerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.green50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleWrap: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  closeButtonPressed: {
    opacity: 0.7,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
  },
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.green50,
    borderWidth: 1,
    borderColor: palette.green200,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  gpsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  gpsTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  gpsTitle: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: colors.primaryDark,
  },
  gpsSubtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  countBadge: {
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countBadgeText: {
    fontFamily: fontFamily.inter.semiBold,
    fontSize: 11,
    color: colors.primaryDark,
  },
  stateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    backgroundColor: palette.gray50,
    borderRadius: radius.md,
    marginBottom: 18,
  },
  stateText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: palette.red200,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 18,
    gap: 10,
  },
  errorTextWrap: {
    flex: 1,
  },
  errorTitle: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  errorSubtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  retryBtnText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 12,
    color: colors.primaryDark,
  },
  emptySavedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: palette.gray50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.gray100,
    marginBottom: 18,
  },
  emptySavedIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  emptySavedTextWrap: {
    flex: 1,
  },
  emptySavedTitle: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  emptySavedSubtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  savedListWrap: {
    gap: 8,
    marginBottom: 18,
  },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  savedCardSelected: {
    borderColor: colors.primary,
    backgroundColor: palette.green50,
  },
  savedCardPressed: {
    opacity: 0.85,
  },
  savedIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  savedIconCircleSelected: {
    backgroundColor: colors.primaryTint,
  },
  savedTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  savedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  savedLabel: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  savedLabelSelected: {
    color: colors.primaryDark,
  },
  savedStreet: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  selectedCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSection: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: palette.gray100,
  },
  inputLabel: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  presetChipSelected: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  presetText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  presetTextSelected: {
    color: palette.white,
    fontFamily: fontFamily.jakarta.semiBold,
  },
  inputWrapper: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.gray200,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  inputWrapperFocused: {
    borderColor: colors.primaryDark,
    borderWidth: 1.5,
  },
  inputWrapperReadonly: {
    backgroundColor: palette.gray50,
    borderColor: palette.gray200,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  textInputReadonly: {
    color: colors.textSecondary,
  },
  clearInputBtn: {
    padding: 4,
    marginLeft: 6,
  },
  serviceAreaTag: {
    backgroundColor: palette.green50,
    borderWidth: 1,
    borderColor: palette.green200,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  serviceAreaTagText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 11,
    color: colors.primaryDark,
  },
  footerBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.gray100,
    backgroundColor: colors.bgCard,
  },
  saveButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: palette.gray200,
  },
  saveButtonText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 15,
    color: palette.white,
  },
});
