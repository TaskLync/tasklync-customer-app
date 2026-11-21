import { ExpoConfig, ConfigContext } from 'expo/config';

// Maps SDK key for the native map only (restrict it to the Android package + SHA-1 and the iOS
// bundle id in Google Cloud). Provided by the environment / EAS environment variables — never
// committed. Geocoding & Places are called through the backend proxy, so the app needs no
// web-service key (audit LOC-003).
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || process.env.GOOGLE_MAPS_KEY || '';

/** TaskLync brand green (#16A34A, the app's `primaryDark`): launcher icon, splash and Android accent. */
const BRAND_GREEN = '#16A34A';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Tasklync',
  slug: 'tasklync',
  owner: 'rankstops910s-team',
  version: '1.0.0',
  scheme: 'tasklync',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  // Android `colorPrimary`. Without it Expo writes its template default (#023c69).
  primaryColor: BRAND_GREEN,
  // The launch splash is configured on the `expo-splash-screen` plugin below. SDK 57 no longer reads a
  // top-level `splash` key, so it must not be reintroduced here (it would silently do nothing).
  ios: {
    bundleIdentifier: 'com.tasklync.user',
    supportsTablet: false,
    // Universal Links: requires https://tasklync.pk/.well-known/apple-app-site-association
    associatedDomains: ['applinks:tasklync.pk'],
    infoPlist: {
      // Foreground ("While Using") only — the app never tracks location in the background (audit LOC-021).
      NSLocationWhenInUseUsageDescription:
        'Tasklync uses your location while you use the app to find nearby professionals and to place your service address on the map.',
      NSCameraUsageDescription: 'Tasklync needs access to your camera to take profile photos.',
      NSPhotoLibraryUsageDescription: 'Tasklync needs access to your photo library to select profile photos.',
      NSPhotoLibraryAddUsageDescription: 'Tasklync needs access to save photos.',
    },
  },
  android: {
    package: 'com.tasklync.user',
    versionCode: 1,
    googleServicesFile: './google-services.json',
    // 'resize' (default): Android resizes the root window when the keyboard opens.
    // This allows chat message lists to adapt dynamically, keeps the ChatHeader pinned,
    // and pairs cleanly with KeyboardAvoidingView behavior=undefined on Android without double-adjustment.
    softwareKeyboardLayoutMode: 'resize',
    // Verified App Links: requires https://tasklync.pk/.well-known/assetlinks.json (see deployment/deep-linking).
    // Only entity pages open the app; the rest of tasklync.pk (terms, privacy, ...) stays in the browser.
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: ['/worker', '/company'].map((pathPrefix) => ({
          scheme: 'https',
          host: 'tasklync.pk',
          pathPrefix,
        })),
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      // Android 13+ themed (monochrome) launcher icons use this silhouette instead of a generated one.
      monochromeImage: './assets/images/android-icon-monochrome.png',
      backgroundColor: BRAND_GREEN,
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
    './plugins/withTransparentNavigationBar',
    'expo-font',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Tasklync uses your location while you use the app to find nearby professionals and to place your service address on the map.',
        // `false` removes the "Always" usage strings (expo-location plugin → IOSConfig.Permissions).
        locationAlwaysAndWhenInUsePermission: false,
        locationAlwaysPermission: false,
        isIosBackgroundLocationEnabled: false,
        isAndroidBackgroundLocationEnabled: false,
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
        icon: './assets/images/android-icon-monochrome.png',
        color: BRAND_GREEN,
        defaultChannel: 'tasklync_general_notifications',
        sounds: [
          './assets/sounds/receive_message.mp3',
          './assets/sounds/send_message.mp3',
        ],
      },
    ],
    'expo-secure-store',
    'expo-image',
    [
      // Must be configured: listed without options this plugin is a no-op, and the APK then ships the
      // native template's placeholder `splashscreen_logo` as the launch window background (the
      // non-TaskLync graphic seen on Android 11 and older / slower devices).
      'expo-splash-screen',
      {
        backgroundColor: BRAND_GREEN,
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        // dp. The TL mark fills ~80% x 56% of the source, so its diagonal (~156dp) stays inside the
        // 192dp circle Android 12+ shows on the 288dp splash canvas: no clipping of the T or L corners.
        imageWidth: 160,
      },
    ],
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
     "eas": {
        "projectId": "97f76505-cbf1-4499-89b5-0250bb73cd69"
      }
  },
 
});
