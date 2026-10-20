import type { ExpoConfig } from "expo/config";
const config: ExpoConfig = {
  name: "DRIOZ",
  slug: "drioz-mobile",
  version: "0.1.0",
  scheme: "drioz",
  orientation: "portrait",
  userInterfaceStyle: "light",
  ios: {
    bundleIdentifier: "com.drioz.app",
    supportsTablet: true,
    usesAppleSignIn: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "DRIOZ uses your location to select pickup addresses and show your position.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "Driver partners can choose to share location while online or on a trip, including with the app in the background.",
      UIBackgroundModes: ["location"],
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.drioz.app",
    ...(process.env.GOOGLE_MAPS_ANDROID_KEY
      ? {
          config: {
            googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY },
          },
        }
      : {}),
  },
  plugins: [
    "expo-dev-client",
    "expo-secure-store",
    "expo-document-picker",
    "expo-web-browser",
    "expo-apple-authentication",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Allow DRIOZ driver location sharing while online or on an active trip.",
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
  ],
  extra: {
    ...(process.env.EAS_PROJECT_ID
      ? { eas: { projectId: process.env.EAS_PROJECT_ID } }
      : {}),
  },
};
export default config;
