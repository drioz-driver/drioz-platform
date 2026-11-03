import type { ExpoConfig } from "expo/config";

/** DRIOZ — customer app (book a driver). */
const NIGHT = "#07110E";
// The Apple capability ships by default (as in the original app); the sign-in button shows only when EXPO_PUBLIC_APPLE_SIGN_IN=true.
const apple = process.env.EXPO_PUBLIC_APPLE_SIGN_IN !== "false";
const config: ExpoConfig = {
  name: "DRIOZ",
  slug: "drioz-customer",
  owner: "cliquelog",
  version: "2.0.0",
  scheme: "drioz",
  orientation: "portrait",
  icon: "./assets/icon.png",
  web: { favicon: "./assets/icon.png" },
  userInterfaceStyle: "light",
  backgroundColor: NIGHT,
  primaryColor: "#00E699",
  description: "Book a verified personal driver for your own car — one way, round trip or outstation.",
  ios: {
    bundleIdentifier: "com.drioz.app",
    supportsTablet: false,
    usesAppleSignIn: apple,
    infoPlist: {
      NSLocationWhenInUseUsageDescription: "DRIOZ uses your location to set your pickup point and to share it with our safety team if you press SOS.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.drioz.app",
    adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: NIGHT },
    // Customers never need background location — only while picking a pickup point.
    permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION", "POST_NOTIFICATIONS"],
    blockedPermissions: ["android.permission.ACCESS_BACKGROUND_LOCATION"],
    ...(process.env.GOOGLE_MAPS_ANDROID_KEY ? { config: { googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY } } } : {}),
  },
  plugins: [
    ["expo-audio", { microphonePermission: false, recordAudioAndroid: false, enableBackgroundPlayback: false, enableBackgroundRecording: false }],
    "expo-dev-client",
    "expo-secure-store",
    "expo-web-browser",
    ...(apple ? ["expo-apple-authentication"] : []),
    ["expo-splash-screen", { image: "./assets/splash.png", imageWidth: 220, android: { imageWidth: 140 }, resizeMode: "contain", backgroundColor: NIGHT }],
    ["expo-location", { locationWhenInUsePermission: "DRIOZ uses your location to set your pickup point and to share it with our safety team if you press SOS." }],
    ["expo-notifications", { color: "#00E699" }],
  ],
  extra: { eas: { projectId: process.env.EAS_PROJECT_ID || "0b3db625-6526-483c-b385-4aa8d1b9d48c" } },
};
export default config;
