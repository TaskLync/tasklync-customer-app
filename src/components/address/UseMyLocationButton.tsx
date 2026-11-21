import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { LocationOffIcon, MyLocationIcon } from '../ui/Icon/icons';
import { fontFamily, radius, shadows, fontSize } from '../../design';
import { FreshLocationResult, LocationError, VerifiedLocation } from '../../types/location.types';
import { locationService } from '../../services/location/location.service';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';
import { showAlert } from '../feedback/AppAlert';
import { AppDialog } from '../feedback/AppDialog';

export interface UseMyLocationButtonProps {
  onLocationFound: (coords: { lat: number; lng: number }) => void;
  fetchLocation?: () => Promise<{ lat: number; lng: number } | null>;
  acquireLocation?: () => Promise<FreshLocationResult>;
  isFetching?: boolean;
  error?: LocationError | null;
  onError?: (error: LocationError) => void;
  /**
   * Called with a real but low-confidence fix (approximate permission or a weak signal). The
   * screen may CENTRE the map on it; it must not place or save an address with it.
   */
  onApproximateLocation?: (location: VerifiedLocation) => void;
}

export const UseMyLocationButton: React.FC<UseMyLocationButtonProps> = ({
  onLocationFound,
  fetchLocation,
  acquireLocation,
  isFetching = false,
  error = null,
  onError,
  onApproximateLocation,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
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
      if (locationError?.approximateLocation && onApproximateLocation) {
        onApproximateLocation(locationError.approximateLocation);
      }

      if (
        locationError?.code === 'PERMISSION_DENIED' ||
        locationError?.code === 'PERMISSION_BLOCKED'
      ) {
        setShowPermissionModal(true);
      } else if (locationError?.code === 'SERVICES_DISABLED') {
        showAlert(
          'Location is turned off',
          locationError.userMessage ||
            'Turn on location in your device settings to use your current location.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: openSystemSettings },
          ]
        );
      } else if (locationError?.code === 'APPROXIMATE_PERMISSION') {
        showAlert('Precise location is off', locationError.userMessage, [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Allow precise',
            onPress: async () => {
              // Android 12+: re-requesting shows the "upgrade to precise" dialog. iOS and
              // "don't ask again" cases can only be changed in Settings.
              const res = await locationService.requestPermission();
              if (!isMountedRef.current) return;
              if (res.granted && res.precision === 'precise') {
                void handlePress();
              } else {
                openSystemSettings();
              }
            },
          },
        ]);
      } else if (locationError?.code === 'MOCK_DETECTED') {
        showAlert(
          'Mock location detected',
          'Turn off mock locations in developer options to use your real location.'
        );
      } else {
        showAlert(
          'Weak GPS signal',
          locationError?.userMessage ||
            "Couldn't get an accurate location. Check your signal and try again."
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
            <MyLocationIcon size={22} color={colors.primaryDark} strokeWidth={2.4} />
          )}
        </Pressable>
      </Animated.View>

      {/* Permission Denied Explainer Modal */}
      <AppDialog
        visible={showPermissionModal}
        icon={<LocationOffIcon size={22} color={colors.textDanger} strokeWidth={2} />}
        title="Location access needed"
        message="Turn on precise location in Settings so we can place the pin at your door."
        onRequestClose={() => setShowPermissionModal(false)}
        dismissOnBackdropPress
        actions={[
          { label: 'Not now', onPress: () => setShowPermissionModal(false), variant: 'secondary' },
          { label: 'Open Settings', onPress: openSystemSettings, variant: 'primary' },
        ]}
      />
    </>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  wrapper: {
    shadowColor: palette.black,
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
    borderColor: colors.buttonPrimary,
    backgroundColor: colors.buttonPrimary,
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
    backgroundColor: colors.modalBackground,
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
    backgroundColor: colors.buttonPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtnText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: palette.pureWhite,
  },
});
