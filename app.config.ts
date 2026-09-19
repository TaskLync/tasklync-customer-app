import { ExpoConfig, ConfigContext } from 'expo/config';

const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ||
  process.env.GOOGLE_MAPS_KEY ||
  'AIzaSyAacbf9vAzo8hluo0LbBx9Cz55CyuP9iPU';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Tasklync',
  slug: 'tasklync-user',
  owner: 'uzairsarwar164',
  version: '1.0.0',
  scheme: 'tasklync',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  // @ts-ignore
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#16A34A',
  },
  ios: {
    bundleIdentifier: 'com.tasklync.user',
    supportsTablet: false,
    infoPlist: {
      NSLocationWhenInUseUsageDescription: 'Tasklync uses your location to find nearby service workers.',
      NSLocationAlwaysAndWhenInUseUsageDescription: 'Tasklync uses your location to find nearby service workers even when the app is in background.',
      NSCameraUsageDescription: 'Tasklync needs access to your camera to take profile photos.',
      NSPhotoLibraryUsageDescription: 'Tasklync needs access to your photo library to select profile photos.',
      NSPhotoLibraryAddUsageDescription: 'Tasklync needs access to save photos.',
    },
  },
  android: {
    package: 'com.tasklync.user',
    versionCode: 1,
    googleServicesFile: './google-services.json',
    // 'pan' mode: Android pans the entire layout up when keyboard opens.
    // This is the correct pairing with KeyboardAvoidingView behavior='height'.
    // 'resize' (default) shrinks the root view which causes layout jitter
    // and breaks SafeAreaView bottom insets on many Android OEMs.
    softwareKeyboardLayoutMode: 'pan',
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundColor: '#16A34A',
    },
    config: {
      googleMaps: {
        apiKey: GOOGLE_MAPS_API_KEY,
      },
    },
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'RECEIVE_BOOT_COMPLETED',
      'VIBRATE',
      'POST_NOTIFICATIONS',
      'WAKE_LOCK',
    ],
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: 'Allow $(PRODUCT_NAME) to use your location.',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Allow $(PRODUCT_NAME) to access your camera.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/images/icon.png',
        color: '#16A34A',
        defaultChannel: 'tasklync_general_notifications',
        sounds: [
          './assets/sounds/receive_message.mp3',
          './assets/sounds/send_message.mp3',
        ],
      },
    ],
    'expo-secure-store',
    'expo-image',
    'expo-splash-screen',
    'expo-status-bar',
    'expo-web-browser',
    'expo-asset',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiBaseUrl: process.env.API_BASE_URL,
    googleMapsKey: GOOGLE_MAPS_API_KEY,
    eas: {
      projectId: process.env.EAS_PROJECT_ID || '90b1f7d5-14e1-4cf6-9035-b1beb8832a36',
    },
  },
});
