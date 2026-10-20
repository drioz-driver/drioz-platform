import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { api, APIError } from "./api";
const TASK = "drioz-driver-location",
  CONSENT = "drioz.location.consent";
export async function stopTracking() {
  await SecureStore.deleteItemAsync(CONSENT);
  if (await Location.hasStartedLocationUpdatesAsync(TASK))
    await Location.stopLocationUpdatesAsync(TASK);
}
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
  TASK,
  async ({ data, error }) => {
    if (error || !data?.locations.length) return;
    if ((await SecureStore.getItemAsync(CONSENT)) !== "yes") {
      await stopTracking();
      return;
    }
    const position = data.locations[data.locations.length - 1];
    if (Date.now() - position.timestamp > 120000) return;
    try {
      await api("driver/location", {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    } catch (e) {
      if (e instanceof APIError && [401, 403, 409].includes(e.status))
        await stopTracking();
    }
  },
);
export async function startTracking() {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted")
    throw Error("Location permission is required for driver tracking");
  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== "granted")
    throw Error(
      "Allow background location in device settings to share while driving with the screen locked",
    );
  const point = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  await api("driver/location", {
    lat: point.coords.latitude,
    lng: point.coords.longitude,
  });
  await SecureStore.setItemAsync(CONSENT, "yes", {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  try {
    await Location.startLocationUpdatesAsync(TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 15000,
      distanceInterval: 30,
      deferredUpdatesInterval: 15000,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      activityType: Location.ActivityType.AutomotiveNavigation,
      foregroundService: {
        notificationTitle: "DRIOZ location sharing",
        notificationBody:
          "You are sharing driver location while online or on a journey.",
        killServiceOnDestroy: true,
      },
    });
  } catch (e) {
    await stopTracking();
    throw e;
  }
}
export async function trackingActive() {
  return (
    (await SecureStore.getItemAsync(CONSENT)) === "yes" &&
    (await Location.hasStartedLocationUpdatesAsync(TASK))
  );
}
