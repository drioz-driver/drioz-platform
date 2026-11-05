import type { ExpoConfig } from "expo/config";

/** DRIOZ Partner — driver app (ride offers, trips, earnings). */
const NIGHT = "#07110E";
// The Apple capability ships by default (as in the original app); the sign-in button shows only when EXPO_PUBLIC_APPLE_SIGN_IN=true.
const apple = process.env.EXPO_PUBLIC_APPLE_SIGN_IN !== "false";
const config: ExpoConfig = {
  name: "DRIOZ Partner",
  slug: "drioz-partner",
  owner: "cliquelog",
  version: "2.0.0",
  scheme: "driozpartner",
  orientation: "portrait",
  icon: "./assets/icon.png",
  web: { favicon: "./assets/icon.png" },
  userInterfaceStyle: "light",
  backgroundColor: NIGHT,
  primaryColor: "#00E699",
  description: "Drive with DRIOZ: accept ride requests near you, complete trips and track your earnings.",
  ios: {
    bundleIdentifier: "com.drioz.partner",
    supportsTablet: false,
    usesAppleSignIn: apple,
    infoPlist: {
      NSCameraUsageDescription: "DRIOZ Partner uses the camera to photograph the customer's car before and after each trip.",
      NSLocationWhenInUseUsageDescription: "DRIOZ Partner uses your location to match you with nearby ride requests.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "While you are online or on a trip, DRIOZ Partner shares your location with operations and your assigned customer, including when the app is in the background.",
      UIBackgroundModes: ["location"],
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.drioz.partner",
    adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#00E699" },
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_LOCATION",
      "VIBRATE",
      "POST_NOTIFICATIONS",
      "CAMERA",
    ],
    ...(process.env.GOOGLE_MAPS_ANDROID_KEY ? { config: { googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY } } } : {}),
  },
  plugins: [
    "expo-dev-client",
    "expo-secure-store",
    "expo-document-picker",
    "expo-web-browser",
    ...(apple ? ["expo-apple-authentication"] : []),
    ["expo-splash-screen", { image: "./assets/splash.png", imageWidth: 240, android: { imageWidth: 140 }, resizeMode: "contain", backgroundColor: NIGHT }],
    ["expo-notifications", { color: "#00E699" }],
    [
      "expo-image-picker",
      {
        cameraPermission: "DRIOZ Partner uses the camera to photograph the customer's car before and after each trip.",
        photosPermission: false,
        microphonePermission: false,
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission: "Allow DRIOZ Partner to share your location while you are online or on an active trip.",
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
  ],
  extra: { eas: { projectId: process.env.EAS_PROJECT_ID || "3a46fadd-bb35-4d74-966e-8249d10ca589" } },
};
export default config;
