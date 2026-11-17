import { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Platform } from 'react-native';
import { useRouter, router as globalRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, MapPinOff, X, Navigation } from 'lucide-react-native';

import { Screen } from '@components/layout/Screen';
import { Button } from '@components/ui/Button';
import { fontFamily, radius, shadows } from '@design/index';
import { useLocationStore, useUIStore, useAuthStore } from '@store/index';
import { locationService } from '../../src/services/location/location.service';
import { startLocationBootstrap } from '../../src/services/location/locationBootstrap';
import { validateServiceArea } from '../../src/config/serviceArea.config';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { showAlert } from '../../src/components/feedback/AppAlert';
import type { VerifiedLocation } from '../../src/types/location.types';

/**
 * Runs after the customer is already on the home screen, once the background GPS fix lands.
 * Honest, non-blocking notice when they are physically outside the service area: never pretends
 * they are in Faisalabad, never blocks browsing.
 */
function notifyIfOutsideServiceArea(fix: VerifiedLocation) {
  const store = useLocationStore.getState();
  // They already chose a saved address meanwhile: the GPS position is no longer what they use.
  if (store.locationMode === 'address') return;
  if (validateServiceArea({ lat: fix.lat, lng: fix.lng }).isServiceable) return;
  showAlert(
    'We currently operate only in Faisalabad',
    'You appear to be outside our service area. You can still explore services and workers, but bookings can only be placed for a Faisalabad address.',
    [
      { text: 'Keep exploring', style: 'cancel' },
      { text: 'Set a Faisalabad address', onPress: () => globalRouter.push('/profile/addresses/add' as any) },
    ]
  );
}

export default function LocationPermissionScreen() {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const setPermissionStatus = useLocationStore((state) => state.setPermissionStatus);
  const setIsServicesEnabled = useLocationStore((state) => state.setIsServicesEnabled);
  const showToast = useUIStore((state) => state.showToast);
  const user = useAuthStore((state) => state.user);

  const [isLoading, setIsLoading] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  // Synchronous guards: state updates are async, so a fast double tap could otherwise slip through.
  const inFlightRef = useRef(false);
  const hasNavigatedRef = useRef(false);

  const navigateToHome = (withWelcome = true) => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    router.replace('/(tabs)/' as any);
    if (withWelcome) {
      showToast({ type: 'success', title: `Welcome, ${user?.name || 'there'}! 👋` });
    }
  };

  /**
   * Only the OS permission prompt is awaited here. GPS acquisition, reverse geocoding and the
   * service-area check all continue in the background after navigation (locationBootstrap).
   */
  const handleAllow = async () => {
    if (inFlightRef.current || hasNavigatedRef.current) return;
    inFlightRef.current = true;
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
        if (!permState.canAskAgain) {
          setShowBlockedModal(true);
        } else {
          // Denied once: proceed gracefully to home without assigning fake location
          navigateToHome(true);
        }
        return;
      }

      // 2. Hardware GPS disabled check (needs the customer's decision, so it is the one prompt kept)
      if (!permState.servicesEnabled) {
        if (Platform.OS === 'web') {
          showToast({
            type: 'info',
            title: 'Please enable location access in your browser settings.',
          });
          navigateToHome(true);
        } else {
          showAlert(
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

      // 3. Permission granted + GPS on: start the background pipeline (instant OS-cached fix, then
      //    a fresh GPS fix, address resolution and the service-area check) and enter the app NOW.
      //    The home screen's location header joins this same run instead of starting another one.
      void startLocationBootstrap({ onFreshFix: notifyIfOutsideServiceArea });
      navigateToHome(true);
    } catch (_err) {
      // Never strand the customer here; home shows an honest "Select location" state.
      navigateToHome(true);
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  };

  const handleNotNow = () => {
    if (inFlightRef.current) return;
    setPermissionStatus('denied');
    navigateToHome(true);
  };

  return (
    <Screen bg={palette.white} edges={['top', 'left', 'right']}>
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
            label="Share Current Location"
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

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
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
    backgroundColor: colors.bgHover,
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
    backgroundColor: colors.modalBackground,
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
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: colors.buttonPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSettingsText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: palette.pureWhite,
  },
});
