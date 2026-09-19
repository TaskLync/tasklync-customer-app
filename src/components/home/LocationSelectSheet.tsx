import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  MapPin,
  Navigation,
  Plus,
  ChevronRight,
  Check,
  X,
} from 'lucide-react-native';

import { BottomSheet, BottomSheetRef } from '../layout/BottomSheet/BottomSheet';
import { DefaultAddressBadge } from '../address/DefaultAddressBadge';
import { useAddresses } from '../../hooks/useAddresses';
import { useLocation } from '../../hooks/useLocation';
import { Address } from '../../types/address.types';
import { labelToIcon } from '../../utils/address';
import { colors, palette, fontFamily, radius } from '../../design';
import {
  validateServiceArea,
  SERVICE_UNAVAILABLE_MESSAGE,
} from '../../config/serviceArea.config';

export interface LocationSelectSheetRef {
  open: () => void;
  close: () => void;
}

export interface LocationSelectSheetProps {
  onLocationSelected?: (cityName: string) => void;
}

export const LocationSelectSheet = forwardRef<LocationSelectSheetRef, LocationSelectSheetProps>(
  ({ onLocationSelected }, ref) => {
    const bottomSheetRef = useRef<BottomSheetRef>(null);
    const router = useRouter();

    const {
      cityName,
      locationMode,
      selectedAddress,
      isLocating,
      refreshLocation,
      selectAddress,
      requestLocation,
      openSettings,
      isPermissionGranted,
      isServicesEnabled,
    } = useLocation({ autoFetch: false });

    const { addresses, isLoading: isAddressesLoading, setDefaultAddress } = useAddresses();
    const [isSwitchingGPS, setIsSwitchingGPS] = useState(false);

    useImperativeHandle(ref, () => ({
      open: () => {
        bottomSheetRef.current?.open();
      },
      close: () => {
        bottomSheetRef.current?.close();
      },
    }));

    const handleClose = () => {
      bottomSheetRef.current?.close();
    };

    // 1. Use Current GPS Location
    const handleSelectCurrentGPS = async () => {
      setIsSwitchingGPS(true);

      try {
        if (!isPermissionGranted) {
          const permResult = await requestLocation();
          if (!permResult.granted) {
            setIsSwitchingGPS(false);
            if (!permResult.canAskAgain) {
              Alert.alert(
                'Location Permission Denied',
                'Tasklync needs location permission to show workers near you. Please enable it in Settings.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open Settings', onPress: openSettings },
                ]
              );
            }
            return;
          }
        }

        if (!isServicesEnabled) {
          Alert.alert(
            'GPS Disabled',
            'Your device location services are turned off. Please turn on GPS in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: openSettings },
            ]
          );
          setIsSwitchingGPS(false);
          return;
        }

        const freshCoords = await refreshLocation();
        if (freshCoords) {
          const validation = validateServiceArea(freshCoords);
          if (!validation.isServiceable) {
            Alert.alert('Service Unavailable', SERVICE_UNAVAILABLE_MESSAGE);
            setIsSwitchingGPS(false);
            return;
          }
        }

        if (onLocationSelected && cityName) {
          onLocationSelected(cityName);
        }
        handleClose();
      } catch (_e) {
        // Fallback handled safely inside refreshLocation
      } finally {
        setIsSwitchingGPS(false);
      }
    };

    // 2. Select a Saved Address
    const handleSelectAddress = async (addr: Address) => {
      if (!addr) return;

      const validation = validateServiceArea({ lat: addr.lat, lng: addr.lng });
      if (!validation.isServiceable) {
        Alert.alert('Service Unavailable', SERVICE_UNAVAILABLE_MESSAGE);
        return;
      }

      selectAddress(addr);

      const targetCity = addr.city || addr.address_line || 'Faisalabad';
      if (onLocationSelected) {
        onLocationSelected(targetCity);
      }

      // Persist as default address on backend if id exists
      if (addr.id) {
        try {
          await setDefaultAddress(addr.id);
        } catch (_e) {
          // Handled inside hook
        }
      }

      handleClose();
    };

    // 3. Add New Address Navigation (Delayed for smooth sheet close)
    const handleAddNewAddress = () => {
      handleClose();
      setTimeout(() => {
        router.push({
          pathname: '/profile/addresses/add',
          params: { mode: 'add' },
        });
      }, 120);
    };

    // 4. Manage Addresses Navigation
    const handleManageAddresses = () => {
      handleClose();
      setTimeout(() => {
        router.push('/profile/addresses');
      }, 120);
    };

    const isAddressActive = (addr: Address): boolean => {
      if (!addr) return false;
      if (locationMode === 'address' && selectedAddress?.id && addr.id) {
        return selectedAddress.id === addr.id;
      }
      if (locationMode === 'gps') {
        return false;
      }
      return Boolean(addr.is_default);
    };

    const isGPSActive = locationMode === 'gps';
    const safeAddressList = Array.isArray(addresses) ? addresses : [];

    return (
      <BottomSheet ref={bottomSheetRef}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>Select Location</Text>
              <Text style={styles.headerSubtitle}>
                Choose where you need home services
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
              accessibilityLabel="Close location selector"
            >
              <X size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* GPS Current Location Option */}
            <Pressable
              style={({ pressed }) => [
                styles.actionRow,
                isGPSActive && styles.actionRowActive,
                pressed && styles.actionRowPressed,
              ]}
              onPress={handleSelectCurrentGPS}
              disabled={isSwitchingGPS}
              accessibilityRole="button"
              accessibilityLabel="Use current GPS location"
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: isGPSActive ? colors.primaryTint : palette.green50 },
                ]}
              >
                {isLocating || isSwitchingGPS ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Navigation size={18} color={colors.primary} strokeWidth={2.4} />
                )}
              </View>
              <View style={styles.actionTextWrap}>
                <View style={styles.actionTitleRow}>
                  <Text style={[styles.actionTitle, isGPSActive && styles.actionTitleActive]}>
                    Use Current Location
                  </Text>
                  {isGPSActive && (
                    <View style={styles.activeTag}>
                      <Text style={styles.activeTagText}>Active</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.actionSubtitle} numberOfLines={1}>
                  {cityName ? `${cityName} • GPS` : 'Detect using GPS location'}
                </Text>
              </View>
              {isGPSActive ? (
                <View style={styles.checkBadge}>
                  <Check size={14} color={colors.primaryDark} strokeWidth={2.8} />
                </View>
              ) : (
                <ChevronRight size={18} color={colors.textMuted} />
              )}
            </Pressable>

            {/* Saved Addresses Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Saved Addresses</Text>
              {safeAddressList.length > 0 && (
                <Text style={styles.sectionCount}>{safeAddressList.length}</Text>
              )}
            </View>

            {isAddressesLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : safeAddressList.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <MapPin size={22} color={colors.textMuted} />
                </View>
                <View style={styles.emptyTextWrap}>
                  <Text style={styles.emptyTitle}>No saved addresses yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Save your home or office for faster 1-tap bookings
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.addressListWrap}>
                {safeAddressList.map((addr, index) => {
                  const IconComp = labelToIcon(addr?.label || '');
                  const active = isAddressActive(addr);
                  const displayLabel = addr?.custom_label || addr?.label || 'Address';
                  const addressKey = addr?.id ? String(addr.id) : `saved-addr-${index}`;

                  return (
                    <Pressable
                      key={addressKey}
                      style={({ pressed }) => [
                        styles.addressCard,
                        active && styles.addressCardActive,
                        pressed && styles.addressCardPressed,
                      ]}
                      onPress={() => handleSelectAddress(addr)}
                      accessibilityRole="button"
                      accessibilityLabel={`${displayLabel}, ${addr?.address_line || ''}${
                        active ? ', currently selected' : ''
                      }`}
                    >
                      <View
                        style={[
                          styles.addressIconCircle,
                          active && styles.addressIconCircleActive,
                        ]}
                      >
                        <IconComp
                          size={18}
                          color={active ? colors.primaryDark : palette.gray600}
                          strokeWidth={2.2}
                        />
                      </View>

                      <View style={styles.addressTextWrap}>
                        <View style={styles.addressLabelRow}>
                          <Text
                            style={[
                              styles.addressLabel,
                              active && styles.addressLabelActive,
                            ]}
                            numberOfLines={1}
                          >
                            {displayLabel}
                          </Text>
                          {Boolean(addr?.is_default) && <DefaultAddressBadge />}
                        </View>
                        <Text
                          style={styles.addressLine}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {[addr?.address_line, addr?.city].filter(Boolean).join(', ')}
                        </Text>
                      </View>

                      {active ? (
                        <View style={styles.checkBadge}>
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

            {/* Add New Address Button */}
            <Pressable
              style={({ pressed }) => [
                styles.actionRow,
                styles.addNewRow,
                pressed && styles.actionRowPressed,
              ]}
              onPress={handleAddNewAddress}
              accessibilityRole="button"
              accessibilityLabel="Add new address"
            >
              <View style={[styles.iconCircle, { backgroundColor: colors.bgInput }]}>
                <Plus size={18} color={colors.textPrimary} strokeWidth={2.4} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionTitle}>Add New Address</Text>
                <Text style={styles.actionSubtitle}>
                  Search location or pinpoint on map
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </Pressable>

            {/* Manage Addresses Footer Link */}
            <Pressable
              style={({ pressed }) => [
                styles.manageFooter,
                pressed && styles.manageFooterPressed,
              ]}
              onPress={handleManageAddresses}
              accessibilityRole="button"
              accessibilityLabel="Manage all saved addresses"
            >
              <Text style={styles.manageFooterText}>
                Manage saved addresses →
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    maxHeight: 520,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray100,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 18,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  headerSubtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgInput,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  closeButtonPressed: {
    opacity: 0.7,
  },
  scrollArea: {
    maxHeight: 440,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: palette.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: palette.gray200,
    marginBottom: 12,
  },
  actionRowActive: {
    borderColor: colors.primary,
    backgroundColor: palette.green50 || '#F0FDF4',
  },
  actionRowPressed: {
    backgroundColor: colors.bgInput,
  },
  addNewRow: {
    marginTop: 8,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionTitle: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  actionTitleActive: {
    color: colors.primaryDark,
  },
  activeTag: {
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  activeTagText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 10,
    color: colors.primaryDark,
  },
  actionSubtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontFamily: fontFamily.inter.semiBold,
    fontSize: 11,
    color: colors.primaryDark,
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  loadingWrap: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    marginBottom: 12,
  },
  emptyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emptyTextWrap: {
    flex: 1,
  },
  emptyTitle: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  addressListWrap: {
    gap: 8,
    marginBottom: 4,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: palette.white,
    borderWidth: 1.5,
    borderColor: palette.gray200,
  },
  addressCardActive: {
    borderColor: colors.primary,
    backgroundColor: palette.green50 || '#F0FDF4',
  },
  addressCardPressed: {
    opacity: 0.85,
  },
  addressIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgInput,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addressIconCircleActive: {
    backgroundColor: colors.primaryTint,
  },
  addressTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  addressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  addressLabel: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  addressLabelActive: {
    color: colors.primaryDark,
  },
  addressLine: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manageFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  manageFooterPressed: {
    opacity: 0.7,
  },
  manageFooterText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: colors.primaryDark,
  },
});
