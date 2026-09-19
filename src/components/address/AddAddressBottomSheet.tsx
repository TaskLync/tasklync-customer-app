import { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { MapPin, Navigation, Check } from 'lucide-react-native';
import { locationService } from '../../services/location/location.service';

import { BottomSheet, BottomSheetRef } from '../layout/BottomSheet/BottomSheet';
import { userApi } from '../../services/api/user.api';
import { useBookingDraftStore, BookingAddress } from '../../store/bookingDraft.store';
import { useAuthStore } from '../../store/auth.store';
import { useLocationStore } from '../../store/location.store';
import { colors, palette, fontFamily } from '../../design';
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
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.accessToken);
  const setAddressStore = useBookingDraftStore((s) => s.setAddress);
  const isCurrentServiceable = Boolean(
    currentLocation && validateServiceArea(currentLocation).isServiceable
  );
  const defaultCity = isCurrentServiceable && currentCity ? currentCity : 'Faisalabad';
  const defaultCoords = isCurrentServiceable && currentLocation ? currentLocation : FAISALABAD_CENTER;

  const [label, setLabel] = useState('Home');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState(defaultCity);
  const [lat, setLat] = useState<number>(defaultCoords.lat);
  const [lng, setLng] = useState<number>(defaultCoords.lng);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => {
      bottomSheetRef.current?.open();
    },
    close: () => {
      bottomSheetRef.current?.close();
    },
  }));

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

      const coords = await locationService.getCurrentPosition({
        enableHighAccuracy: true,
        timeoutMs: 8000,
        useCacheFirst: false,
      });

      if (coords) {
        const validation = validateServiceArea(coords);
        if (!validation.isServiceable) {
          Alert.alert('Service Unavailable', SERVICE_UNAVAILABLE_MESSAGE);
          setIsLocating(false);
          return;
        }

        setLat(coords.lat);
        setLng(coords.lng);
        useLocationStore.getState().setCurrentLocation(coords);

        const geo = await locationService.reverseGeocode(coords);
        if (geo?.addressLine && geo.addressLine !== 'Current GPS Location') {
          setStreet(geo.addressLine);
        }
        if (geo?.cityName) {
          setCity(geo.cityName);
        }
      } else {
        Alert.alert('Location Error', 'Unable to retrieve current GPS location. Please try again.');
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
      return;
    }

    const validation = validateServiceArea({ lat, lng });
    if (!validation.isServiceable) {
      Alert.alert('Service Unavailable', SERVICE_UNAVAILABLE_MESSAGE);
      return;
    }

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

        // Invalidate query to refresh saved addresses list
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

      // Synchronize with location store so the newly created address is active immediately across the app
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
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet ref={bottomSheetRef}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <MapPin size={22} color={colors.primary} />
          <Text style={styles.title}>Add Delivery Address</Text>
        </View>

        {/* GPS 1-Tap Button */}
        <TouchableOpacity
          style={styles.gpsButton}
          onPress={handleUseGPS}
          disabled={isLocating}
          activeOpacity={0.8}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Navigation size={16} color={colors.primary} />
          )}
          <Text style={styles.gpsButtonText}>
            {isLocating ? 'Locating your GPS...' : 'Use Current GPS Location'}
          </Text>
        </TouchableOpacity>

        {/* Label Presets */}
        <Text style={styles.inputLabel}>Address Label</Text>
        <View style={styles.presetsRow}>
          {LABEL_PRESETS.map((preset) => {
            const isSelected = label === preset;
            return (
              <TouchableOpacity
                key={preset}
                style={[styles.presetChip, isSelected && styles.presetChipSelected]}
                onPress={() => setLabel(preset)}
                activeOpacity={0.7}
              >
                {isSelected && <Check size={12} color={palette.white} style={{ marginRight: 4 }} />}
                <Text style={[styles.presetText, isSelected && styles.presetTextSelected]}>
                  {preset}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Street Address Input */}
        <Text style={styles.inputLabel}>Street / House / Building</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. House 14, Street 2, Sector F-8/2"
          placeholderTextColor={palette.gray400}
          value={street}
          onChangeText={setStreet}
        />

        {/* City Input */}
        <Text style={styles.inputLabel}>City</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Faisalabad"
          placeholderTextColor={palette.gray400}
          value={city}
          onChangeText={setCity}
        />

        {/* Save CTA */}
        <TouchableOpacity
          style={[styles.saveButton, (!street.trim() || isSaving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!street.trim() || isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color={palette.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save & Select Address</Text>
          )}
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontFamily: fontFamily.poppins.bold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.green50,
    borderWidth: 1,
    borderColor: palette.green200,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  gpsButtonText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: colors.primaryDark,
  },
  inputLabel: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: palette.gray100,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  presetChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  presetTextSelected: {
    color: palette.white,
    fontFamily: fontFamily.jakarta.semiBold,
  },
  textInput: {
    height: 48,
    backgroundColor: palette.gray50,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 14,
  },
  saveButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: fontFamily.poppins.bold,
    fontSize: 15,
    color: palette.white,
  },
});
