// app.config.js - Dynamic Expo configuration
// Network Solution - Girişimcilerin Buluşma Noktası

const config = {
  name: "Network Solution",
  slug: "network-solution",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "networksolution",
  userInterfaceStyle: "automatic",
  newArchEnabled: false,
  
  // Splash Screen
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#000000"
  },
  
  // iOS Configuration
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.networksolution.app",
    buildNumber: "1",
    infoPlist: {
      NSCameraUsageDescription: "Profil fotoğrafı ve post paylaşımı için kamera erişimi gerekli",
      NSPhotoLibraryUsageDescription: "Profil fotoğrafı ve post paylaşımı için galeri erişimi gerekli",
      NSPhotoLibraryAddUsageDescription: "Fotoğrafları kaydetmek için galeri erişimi gerekli",
      NSLocationWhenInUseUsageDescription: "Yakındaki girişimcileri görmek için konum erişimi gerekli",
      NSLocationAlwaysUsageDescription: "Yakındaki girişimcileri görmek için konum erişimi gerekli",
      NSMicrophoneUsageDescription: "Sesli mesaj göndermek için mikrofon erişimi gerekli",
      NSContactsUsageDescription: "Arkadaşlarınızı davet etmek için rehber erişimi gerekli",
      UIBackgroundModes: ["fetch", "remote-notification"],
      ITSAppUsesNonExemptEncryption: false,
      LSApplicationQueriesSchemes: ["mailto", "tel", "sms"]
    },
    config: {
      usesNonExemptEncryption: false
    }
  },
  
  // Android Status Bar
  androidStatusBar: {
    backgroundColor: "#000000",
    barStyle: "light-content",
    translucent: false
  },
  
  // Android Navigation Bar
  androidNavigationBar: {
    backgroundColor: "#000000",
    barStyle: "light-content"
  },
  
  // Android Configuration
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#000000"
    },
    package: "com.networksolution.app",
    versionCode: 1,
    permissions: [
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.CAMERA",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.READ_MEDIA_VIDEO",
      "android.permission.READ_MEDIA_AUDIO",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.RECORD_AUDIO",
      "android.permission.VIBRATE",
      "android.permission.RECEIVE_BOOT_COMPLETED",
      "android.permission.WAKE_LOCK",
      "android.permission.POST_NOTIFICATIONS"
    ],
    blockedPermissions: [
      "android.permission.READ_PHONE_STATE",
      "android.permission.READ_CALL_LOG"
    ],
    // Google Play Store için gerekli
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json"
  },
  
  // Web Configuration
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
    name: "Network Solution",
    shortName: "NetSol",
    description: "Girişimcilerin Buluşma Noktası",
    themeColor: "#6366f1",
    backgroundColor: "#000000"
  },
  
  // Plugins
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#000000"
      }
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission: "Yakındaki girişimcileri görmek için konum erişimi gerekli",
        isAndroidBackgroundLocationEnabled: false
      }
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Profil fotoğrafı ve post paylaşımı için galeri erişimi gerekli",
        cameraPermission: "Profil fotoğrafı ve post paylaşımı için kamera erişimi gerekli"
      }
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/images/notification-icon.png",
        color: "#6366f1",
        sounds: []
      }
    ],
    [
      "expo-audio",
      {
        microphonePermission: "Sesli mesaj göndermek için mikrofon erişimi gerekli"
      }
    ],
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: "ca-app-pub-3940256099942544~3347511713",
        iosAppId: "ca-app-pub-3940256099942544~1458002511"
      }
    ],
    "@react-native-community/datetimepicker",
    "expo-font",
    "expo-web-browser",
    "expo-asset",
    "expo-video",
    "expo-secure-store",
    "expo-clipboard"
  ],
  
  // Experiments
  experiments: {
    typedRoutes: true
  },
  
  // Updates (OTA) - Disabled for local builds
  updates: {
    enabled: false,
    checkAutomatically: "ON_ERROR_RECOVERY",
    fallbackToCacheTimeout: 0
  },
  
  // Runtime Version
  runtimeVersion: "1.0.0",
  
  // Extra Configuration
  extra: {
    router: {
      origin: false
    },
    eas: {
      projectId: "network-solution"
    },
    // App Info
    appName: "Network Solution",
    appVersion: "1.0.0",
    buildDate: new Date().toISOString().split('T')[0],
    // Environment variables for the app
    EXPO_PUBLIC_BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL || "",
    EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
    EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || ""
  },
  
  // Owner
  owner: "okan_1"
};

// Export configuration
module.exports = config;
