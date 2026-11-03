import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Modal, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MapPin,
  MapPinOff,
  X,
  AlertTriangle,
  Navigation,
} from 'lucide-react-native';

import { Screen } from '@components/layout/Screen';
import { Button } from '@components/ui/Button';
import { colors, fontFamily, radius, palette, shadows } from '@design/index';
import { useLocationStore, useUIStore, useAuthStore } from '@store/index';
import { locationService } from '../../src/services/location/location.service';
import { validateServiceArea } from '../../src/config/serviceArea.config';

interface UnserviceableLocationState {
  visible: boolean;
  cityName: string;
  lat: number;
  lng: number;
}

export default function LocationPermissionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const setPermissionStatus = useLocationStore((state) => state.setPermissionStatus);
  const setCurrentLocation = useLocationStore((state) => state.setCurrentLocation);
  const setCurrentCity = useLocationStore((state) => state.setCurrentCity);
  const setIsServicesEnabled = useLocationStore((state) => state.setIsServicesEnabled);
  const showToast = useUIStore((state) => state.showToast);
  const user = useAuthStore((state) => state.user);

  const [isLoading, setIsLoading] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [unserviceableState, setUnserviceableState] = useState<UnserviceableLocationState>({
    visible: false,
    cityName: '',
    lat: 0,
    lng: 0,
  });

  const navigateToHome = (withWelcome = true) => {
    router.replace('/(tabs)/' as any);
    if (withWelcome) {
      showToast({ type: 'success', title: `Welcome, ${user?.name || 'there'}! 👋` });
    }
  };

  const handleAllow = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // 1. Request foreground permission
      const permState = await locationService.requestPermission();
      setPermissionStatus(
        permState.status === 'granted'
          ? 'granted'
          : permState.status === 'denied'
          ? 'denied'
          : 'undetermined'
      );
      setIsServicesEnabled(permState.servicesEnabled);

      // Handle user denial / blocked permission
      if (!permState.granted) {
        setIsLoading(false);
        if (!permState.canAskAgain) {
          setShowBlockedModal(true);
        } else {
          // Denied once: proceed gracefully to home without assigning fake location
          navigateToHome(true);
        }
        return;
      }

      // 2. Hardware GPS disabled check
      if (!permState.servicesEnabled) {
        setIsLoading(false);
        if (Platform.OS === 'web') {
          showToast({
            type: 'info',
            title: 'Please enable location access in your browser settings.',
          });
          navigateToHome(true);
        } else {
          Alert.alert(
            'Location Services Off',
            'Your device location services (GPS) are turned off. Please enable GPS in device settings to detect your location.',
            [
              { text: 'Later', style: 'cancel', onPress: () => navigateToHome(true) },
              {
                text: 'Open Settings',
                onPress: () => {
                  locationService.openSettings();
                  navigateToHome(true);
                },
              },
            ]
          );
        }
        return;
      }

      // 3. Acquire fresh, verified high-accuracy GPS coordinates (never cached / stale / IP-based)
      const freshResult = await locationService.acquireFreshGPSPosition({
        timeoutMs: 9000,
        targetAccuracyMeters: 20,
        maxAcceptableAccuracyMeters: 45,
        maxAgeMs: 10000,
        allowMock: false,
      });

      if (!freshResult.success) {
        setIsLoading(false);
        const { error } = freshResult;

        if (Platform.OS === 'web') {
          showToast({
            type: 'info',
            title: error.userMessage || 'Could not acquire precise GPS signal.',
          });
          navigateToHome(true);
          return;
        }

        if (error.code === 'SERVICES_DISABLED') {
          Alert.alert(
            'Location Services Off',
            error.userMessage || 'Please turn on GPS to detect your location.',
            [
              { text: 'Later', style: 'cancel', onPress: () => navigateToHome(true) },
              { text: 'Open Settings', onPress: locationService.openSettings },
            ]
          );
          return;
        }

        // Weak GPS or timeout: inform user and allow manual choice without faking Faisalabad
        Alert.alert(
          'GPS Signal Weak',
          error.userMessage ||
            'Unable to acquire a high-confidence GPS lock. You can continue to explore or retry.',
          [
            { text: 'Continue to App', style: 'cancel', onPress: () => navigateToHome(true) },
            { text: 'Retry', onPress: handleAllow },
          ]
        );
        return;
      }

      // 4. GPS lock acquired: store real coordinates
      const coords = {
        lat: freshResult.location.lat,
        lng: freshResult.location.lng,
      };
      setCurrentLocation(coords);

      // 5. Reverse-geocode verified GPS coordinates to determine the real city (e.g. Toba Tek Singh)
      const geo = await locationService.reverseGeocode(coords);
      const detectedCity =
        geo?.cityName && geo.cityName !== 'Current Area' ? geo.cityName : 'Your Location';
      setCurrentCity(detectedCity);

      // 6. Validate the detected coordinates against the Faisalabad service boundary/geofence
      const validation = validateServiceArea(coords);

      setIsLoading(false);

      if (validation.isServiceable) {
        // User is physically in Faisalabad
        showToast({ type: 'success', title: 'Location verified: Faisalabad' });
        navigateToHome(true);
      } else {
        // User is physically outside Faisalabad (e.g. Toba Tek Singh)
        // Show clear "Outside Service Area" state — NEVER pretend they are in Faisalabad
        setUnserviceableState({
          visible: true,
          cityName: detectedCity,
          lat: coords.lat,
          lng: coords.lng,
        });
      }
    } catch (_err) {
      setIsLoading(false);
      // Gracefully proceed without corrupting location store with a fake city
      navigateToHome(true);
    }
  };

  const handleNotNow = () => {
    if (isLoading) return;
    setPermissionStatus('denied');
    navigateToHome(true);
  };

  const handleContinueFromUnserviceable = () => {
    setUnserviceableState((prev) => ({ ...prev, visible: false }));
    showToast({
      type: 'info',
      title: `Browsing from ${unserviceableState.cityName || 'Outside Area'}`,
    });
    router.replace('/(tabs)/' as any);
  };

  const handleSetFaisalabadAddress = () => {
    setUnserviceableState((prev) => ({ ...prev, visible: false }));
    router.replace('/profile/addresses/add' as any);
  };

  return (
    <Screen bg={palette.white} statusBarStyle="dark-content" edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Minimalist Central Value Proposition */}
        <View style={styles.centerContent}>
          {/* Refined Icon Emblem */}
          <View style={styles.iconCircle} accessibilityLabel="Location icon">
            <MapPin size={32} color={colors.primaryDark} strokeWidth={2.2} />
          </View>

          {/* Clean, Impactful Heading */}
          <Text style={styles.titleText} accessibilityRole="header">
            Find services near you
          </Text>

          {/* Concise, Single-Purpose Subtitle */}
          <Text style={styles.subtitleText}>
            Share your location to discover verified workers nearby, track live arrivals, and enjoy fast doorstep service.
          </Text>
        </View>

        {/* Clear Action Hierarchy */}
        <View
          style={[
            styles.footerArea,
            { paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24 },
          ]}
        >
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleAllow}
            disabled={isLoading}
            loading={isLoading}
            icon={Navigation}
            label={isLoading ? 'Finding your location...' : 'Share Current Location'}
            style={styles.primaryBtn}
          />

          <Pressable
            onPress={handleNotNow}
            disabled={isLoading}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            style={styles.secondaryBtn}
            accessibilityRole="button"
            accessibilityLabel="Skip location access for now"
          >
            <Text style={styles.secondaryBtnText}>Not now</Text>
          </Pressable>
        </View>
      </View>

      {/* Modal: Outside Service Area (e.g. User is in Toba Tek Singh) */}
      <Modal
        visible={unserviceableState.visible}
        transparent
        animationType="fade"
        onRequestClose={handleContinueFromUnserviceable}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, styles.amberIconWrap]}>
                <AlertTriangle size={22} color={palette.amberDark} strokeWidth={2.4} />
              </View>
              <Pressable
                onPress={handleContinueFromUnserviceable}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={8}
              >
                <X size={18} color={palette.gray500} />
              </Pressable>
            </View>

            <View style={styles.cityBadge}>
              <MapPin size={12} color={palette.amberDark} />
              <Text style={styles.cityBadgeText} numberOfLines={1}>
                Detected: {unserviceableState.cityName}
              </Text>
            </View>

            <Text style={styles.modalTitle}>We Currently Operate Only in Faisalabad</Text>
            <Text style={styles.modalDescription}>
              TaskLync is currently serving customers exclusively within the Faisalabad metropolitan region.
              {'\n\n'}
              We detected you are located in{' '}
              <Text style={styles.boldText}>{unserviceableState.cityName}</Text>. You can still explore all our services and workers, but orders and bookings can only be placed for delivery in Faisalabad.
            </Text>

            <View style={styles.unserviceableActions}>
              <Button
                variant="primary"
                size="md"
                fullWidth
                label="Explore Faisalabad Services"
                onPress={handleContinueFromUnserviceable}
              />
              <Pressable
                onPress={handleSetFaisalabadAddress}
                style={styles.secondaryActionBtn}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryActionText}>Set a Faisalabad Address</Text>
              </Pressable>
              <Pressable
                onPress={handleAllow}
                style={styles.retryBtn}
                accessibilityRole="button"
              >
                <Text style={styles.retryBtnText}>Retry Location Detection</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Location permission permanently blocked in OS settings */}
      <Modal
        visible={showBlockedModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowBlockedModal(false);
          navigateToHome(true);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <MapPinOff size={22} color={palette.danger} strokeWidth={2.4} />
              </View>
              <Pressable
                onPress={() => {
                  setShowBlockedModal(false);
                  navigateToHome(true);
                }}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={8}
              >
                <X size={18} color={palette.gray500} />
              </Pressable>
            </View>

            <Text style={styles.modalTitle}>Location Permission Required</Text>
            <Text style={styles.modalDescription}>
              Location access is disabled in your device settings. To find workers near your doorstep, please enable location in Settings.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setShowBlockedModal(false);
                  navigateToHome(true);
                }}
                style={styles.modalCancelBtn}
                accessibilityRole="button"
              >
                <Text style={styles.modalCancelText}>Continue without</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowBlockedModal(false);
                  locationService.openSettings();
                  navigateToHome(true);
                }}
                style={styles.modalSettingsBtn}
                accessibilityRole="button"
              >
                <Text style={styles.modalSettingsText}>Open Settings</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.white,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
  },

  // Minimalist Icon Emblem
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: palette.green50,
    borderWidth: 1.5,
    borderColor: palette.green100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },

  // Typography
  titleText: {
    fontFamily: fontFamily.poppins.bold,
    fontSize: 24,
    lineHeight: 32,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 14.5,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 8,
  },

  // Action Area / Sticky Footer
  footerArea: {
    width: '100%',
    paddingTop: 12,
    gap: 4,
  },
  primaryBtn: {
    height: 52,
    borderRadius: radius.pill,
  },
  secondaryBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: 22,
    ...shadows.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderErrorLight,
  },
  amberIconWrap: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warningBorder,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: 12,
    gap: 5,
  },
  cityBadgeText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 12,
    color: colors.textWarning,
  },
  modalTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 17,
    lineHeight: 23,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  modalDescription: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: 18,
  },
  boldText: {
    fontFamily: fontFamily.jakarta.bold,
    color: colors.textPrimary,
  },
  unserviceableActions: {
    gap: 10,
  },
  secondaryActionBtn: {
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: palette.iceGray,
    borderWidth: 1,
    borderColor: palette.softGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13.5,
    color: palette.gray800,
  },
  retryBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  retryBtnText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: palette.iceGray,
    borderWidth: 1,
    borderColor: palette.softGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: palette.gray700,
  },
  modalSettingsBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSettingsText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: palette.white,
  },
});
