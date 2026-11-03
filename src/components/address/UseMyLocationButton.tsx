import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Crosshair, MapPinOff, X } from 'lucide-react-native';
import { colors, palette, fontFamily, radius, shadows, fontSize } from '../../design';
import { FreshLocationResult, LocationError } from '../../types/location.types';
import { locationService } from '../../services/location/location.service';

export interface UseMyLocationButtonProps {
  onLocationFound: (coords: { lat: number; lng: number }) => void;
  fetchLocation?: () => Promise<{ lat: number; lng: number } | null>;
  acquireLocation?: () => Promise<FreshLocationResult>;
  isFetching?: boolean;
  error?: LocationError | null;
  onError?: (error: LocationError) => void;
}

export const UseMyLocationButton: React.FC<UseMyLocationButtonProps> = ({
  onLocationFound,
  fetchLocation,
  acquireLocation,
  isFetching = false,
  error = null,
  onError,
}) => {
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const isMountedRef = useRef<boolean>(true);
  const shakeOffset = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeOffset.value }, { scale: scale.value }],
  }));

  const triggerShake = () => {
    shakeOffset.value = withSequence(
      withTiming(-6, { duration: 35 }),
      withTiming(6, { duration: 35 }),
      withTiming(-4, { duration: 35 }),
      withTiming(4, { duration: 35 }),
      withTiming(0, { duration: 35 })
    );
  };

  const openSystemSettings = () => {
    setShowPermissionModal(false);
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:').catch(() => {});
    } else {
      Linking.openSettings().catch(() => {});
    }
  };

  const handlePress = async () => {
    if (isFetching) return;

    scale.value = withSequence(
      withTiming(0.92, { duration: 80 }),
      withSpring(1.0, { damping: 12, stiffness: 300 })
    );

    let resultCoords: { lat: number; lng: number } | null = null;
    let locationError: LocationError | null = error;

    if (acquireLocation) {
      const res = await acquireLocation();
      if (res.success) {
        resultCoords = { lat: res.location.lat, lng: res.location.lng };
      } else {
        locationError = res.error;
      }
    } else if (fetchLocation) {
      resultCoords = await fetchLocation();
      if (!resultCoords && !locationError) {
        const state = await locationService.checkLocationState();
        if (!state.granted) {
          locationError = {
            code: state.canAskAgain ? 'PERMISSION_DENIED' : 'PERMISSION_BLOCKED',
            message: 'Location permission was not granted.',
            userMessage: 'Location permission is required to detect your current position.',
            canAskAgain: state.canAskAgain,
          };
        } else if (!state.servicesEnabled) {
          locationError = {
            code: 'SERVICES_DISABLED',
            message: 'Location services are disabled on this device.',
            userMessage:
              'Device location services (GPS) are turned off. Please turn on GPS in your device settings.',
          };
        } else {
          locationError = {
            code: 'LOW_ACCURACY',
            message: 'GPS signal is too weak or timed out.',
            userMessage:
              'Weak GPS signal. Please move closer to a window or outdoors and try again.',
          };
        }
      }
    }

    if (!isMountedRef.current) return;

    if (resultCoords) {
      onLocationFound(resultCoords);
    } else {
      triggerShake();
      if (onError && locationError) {
        onError(locationError);
      }

      if (
        locationError?.code === 'PERMISSION_DENIED' ||
        locationError?.code === 'PERMISSION_BLOCKED'
      ) {
        setShowPermissionModal(true);
      } else if (locationError?.code === 'SERVICES_DISABLED') {
        Alert.alert(
          'Location Services Off',
          locationError.userMessage ||
            'Please enable GPS in your device settings to detect your current location.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: openSystemSettings },
          ]
        );
      } else if (locationError?.code === 'MOCK_DETECTED') {
        Alert.alert(
          'Mock Location Detected',
          'Mock/spoofed GPS coordinates were detected. Please disable GPS mocking in developer options.'
        );
      } else {
        Alert.alert(
          'GPS Signal Weak',
          locationError?.userMessage ||
            'Unable to acquire a high-confidence GPS position. Please check your signal and try again.'
        );
      }
    }
  };

  return (
    <>
      <Animated.View style={[styles.wrapper, animatedStyle]}>
        <Pressable
          onPress={handlePress}
          disabled={isFetching}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            isFetching && styles.buttonLocating,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Use my current GPS location"
          accessibilityHint="Acquires fresh, high-confidence GPS position and centers the map"
          accessibilityState={{ busy: isFetching, disabled: isFetching }}
        >
          {isFetching ? (
            <ActivityIndicator size="small" color={colors.primaryDark} />
          ) : (
            <Crosshair size={22} color={colors.primaryDark} strokeWidth={2.4} />
          )}
        </Pressable>
      </Animated.View>

      {/* Permission Denied Explainer Modal */}
      <Modal
        visible={showPermissionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPermissionModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <MapPinOff size={24} color={palette.danger} strokeWidth={2.2} />
              </View>
              <Pressable
                onPress={() => setShowPermissionModal(false)}
                style={styles.closeBtn}
                accessibilityLabel="Close"
              >
                <X size={20} color={palette.gray500} />
              </Pressable>
            </View>

            <Text style={styles.modalTitle} maxFontSizeMultiplier={1.3}>
              Location Access Needed
            </Text>
            <Text style={styles.modalDescription} maxFontSizeMultiplier={1.3}>
              To automatically place the pin at your current doorstep, please enable high-accuracy location permissions in Settings.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowPermissionModal(false)}
                style={styles.cancelBtn}
                accessibilityRole="button"
              >
                <Text style={styles.cancelBtnText} maxFontSizeMultiplier={1.3}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={openSystemSettings}
                style={styles.settingsBtn}
                accessibilityRole="button"
              >
                <Text style={styles.settingsBtnText} maxFontSizeMultiplier={1.3}>
                  Open Settings
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    shadowColor: palette.gray900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: radius.circle,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: palette.gray50,
    transform: [{ scale: 0.95 }],
  },
  buttonLocating: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
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
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: palette.iceGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: palette.gray700,
  },
  settingsBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtnText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: palette.white,
  },
});
