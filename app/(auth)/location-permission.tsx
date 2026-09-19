import { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, CheckCircle2, MapPinOff, X } from 'lucide-react-native';

import { Screen } from '@components/layout/Screen';
import { StickyFooter } from '@components/layout/StickyFooter';
import { Text } from '@components/ui/Text';
import { Button } from '@components/ui/Button';
import { colors, fontFamily, radius, palette, shadows, fontSize } from '@design/index';
import { useLocationStore, useUIStore, useAuthStore } from '@store/index';
import { locationService } from '../../src/services/location/location.service';
import { validateServiceArea, SERVICE_UNAVAILABLE_MESSAGE } from '../../src/config/serviceArea.config';

const FEATURES = [
  'Find verified workers closest to you',
  'Track workers in real-time as they travel',
  'Get accurate arrival time estimates',
];

export default function LocationPermissionScreen() {
  const router = useRouter();
  const setPermissionStatus = useLocationStore((state) => state.setPermissionStatus);
  const setCurrentLocation = useLocationStore((state) => state.setCurrentLocation);
  const setCurrentCity = useLocationStore((state) => state.setCurrentCity);
  const setIsServicesEnabled = useLocationStore((state) => state.setIsServicesEnabled);
  const showToast = useUIStore((state) => state.showToast);
  const user = useAuthStore((state) => state.user);

  const [isLoading, setIsLoading] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);

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
      // 1. Request permission
      const permState = await locationService.requestPermission();
      setPermissionStatus(
        permState.status === 'granted' ? 'granted' : permState.status === 'denied' ? 'denied' : 'undetermined'
      );
      setIsServicesEnabled(permState.servicesEnabled);

      // If user permanently blocked permission, guide them to settings
      if (!permState.granted) {
        if (!permState.canAskAgain) {
          setIsLoading(false);
          setShowBlockedModal(true);
          return;
        }

        // Just denied this time, proceed gracefully to home
        setIsLoading(false);
        navigateToHome(true);
        return;
      }

      // 2. Hardware GPS disabled check
      if (!permState.servicesEnabled) {
        Alert.alert(
          'Location Services Off',
          'Your device location is turned off. Please turn on GPS in your device settings to detect nearby workers.',
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
        setIsLoading(false);
        return;
      }

      // 3. Acquire initial coordinates & geocode
      const coords = await locationService.getCurrentPosition({
        enableHighAccuracy: false,
        timeoutMs: 6000,
        useCacheFirst: false,
      });

      if (coords) {
        const validation = validateServiceArea(coords);
        if (!validation.isServiceable) {
          setIsLoading(false);
          Alert.alert('Service Unavailable', SERVICE_UNAVAILABLE_MESSAGE);
          return;
        }

        setCurrentLocation(coords);
        const geo = await locationService.reverseGeocode(coords);
        if (geo?.cityName) {
          setCurrentCity(geo.cityName);
        }
      }

      setIsLoading(false);
      navigateToHome(true);
    } catch (_err) {
      setIsLoading(false);
      navigateToHome(true);
    }
  };

  const handleNotNow = () => {
    if (isLoading) return;
    setPermissionStatus('denied');
    navigateToHome(true);
  };

  return (
    <Screen bg="#FAFAFA" statusBarStyle="dark-content" edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.animationPlaceholder} accessibilityLabel="Animated map showing location feature">
          <MapPin size={80} color={colors.primary} />
        </View>

        <Text variant="h1" color="primary" align="center" style={styles.title}>
          Enable location{'\n'}access
        </Text>

        <Text variant="body1" color="muted" align="center" style={styles.subtitle}>
          We use your location to find the best workers near you
        </Text>

        <View style={styles.featureList}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <CheckCircle2 size={20} color={colors.primary} style={styles.featureIcon} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <StickyFooter>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleAllow}
          style={styles.allowButton}
          disabled={isLoading}
          label={isLoading ? 'Detecting Location...' : 'Allow Location'}
        />
        <Pressable
          onPress={handleNotNow}
          disabled={isLoading}
          hitSlop={12}
          style={styles.notNowButton}
          accessibilityLabel="Skip location access for now"
        >
          <Text style={styles.notNowText}>Not now</Text>
        </Pressable>
      </StickyFooter>

      {/* Modal if permission was permanently denied */}
      <Modal
        visible={showBlockedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBlockedModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <MapPinOff size={24} color={palette.danger} strokeWidth={2.2} />
              </View>
              <Pressable
                onPress={() => {
                  setShowBlockedModal(false);
                  navigateToHome(true);
                }}
                style={styles.closeBtn}
                accessibilityLabel="Close"
              >
                <X size={20} color={palette.gray500} />
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
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    paddingTop: 40,
  },
  animationPlaceholder: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 28,
  },
  featureList: {
    width: '100%',
    backgroundColor: colors.bgCard,
    padding: 16,
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  allowButton: {
    marginBottom: 10,
  },
  notNowButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  notNowText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: palette.white,
    borderRadius: 20,
    padding: 20,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 6,
  },
  modalTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.h3,
    lineHeight: 24,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  modalDescription: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.body2,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: 20,
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
