// app.config.js - Dynamic Expo configuration
// This file bypasses git dependency issues

const config = {
  name: "Founder Connect",
  slug: "founder-connect",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "founderconnect",
  userInterfaceStyle: "automatic",
  newArchEnabled: false,
  
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.founderconnect.app",
    infoPlist: {
      NSCameraUsageDescription: "Profil fotoğrafı ve post paylaşımı için kamera erişimi gerekli",
      NSPhotoLibraryUsageDescription: "Profil fotoğrafı ve post paylaşımı için galeri erişimi gerekli",
      NSLocationWhenInUseUsageDescription: "Yakındaki girişimcileri görmek için konum erişimi gerekli",
      NSMicrophoneUsageDescription: "Sesli mesaj göndermek için mikrofon erişimi gerekli"
    }
  },
  
  androidStatusBar: {
    backgroundColor: "#000000",
    barStyle: "light-content"
  },
  
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#000000"
    },
    package: "com.founderconnect.app",
    versionCode: 1,
    permissions: [
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.CAMERA",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.READ_MEDIA_VIDEO",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.RECORD_AUDIO",
      "android.permission.VIBRATE"
    ]
  },
  
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png"
  },
  
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
        locationAlwaysAndWhenInUsePermission: "Yakındaki girişimcileri görmek için konum erişimi gerekli"
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
    "expo-video"
  ],
  
  experiments: {
    typedRoutes: true
  },
  
  // Disable OTA updates to avoid git dependency
  updates: {
    enabled: false,
    checkAutomatically: "ON_ERROR_RECOVERY",
    fallbackToCacheTimeout: 0
  },
  
  // Runtime version without git
  runtimeVersion: "1.0.0",
  
  extra: {
    router: {},
    eas: {
      projectId: "founder-connect"
    },
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
  
  owner: "okan_1"
};

// Export configuration
module.exports = config;
