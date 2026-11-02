import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";
import { api, APIError } from "./api";
import { alertOffer } from "./alerts";
const TASK = "drioz-driver-location",
  CONSENT = "drioz.location.consent";
let trackingGeneration = 0;
let foregroundWatch: Location.LocationSubscription | null = null;
let starting: Promise<void> | null = null;
let heartbeat: ReturnType<typeof setInterval> | null = null;
let uploading = false, lastUpload = 0;
async function publish(position: Location.LocationObject) {
  if (uploading || Date.now() - lastUpload < 4500 || Date.now() - position.timestamp > 120000) return;
  uploading = true;
  try { await api("driver/location", {lat: position.coords.latitude, lng: position.coords.longitude}); lastUpload = Date.now(); }
  finally { uploading = false; }
}
export async function stopTracking() {
  trackingGeneration++;
  foregroundWatch?.remove(); foregroundWatch = null; lastUpload = 0;
  if (heartbeat) clearInterval(heartbeat); heartbeat = null;
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
      // Piggy-back an offer check so a backgrounded partner still gets alerted.
      if (AppState.currentState !== "active") {
        const r = await api("driver/offers");
        if (r?.offer) await alertOffer(r.offer, false);
      }
    } catch (e) {
      if (e instanceof APIError && [401, 403, 409].includes(e.status))
        await stopTracking();
    }
  },
);
/** Foreground tracking works even when the driver declines background permission. */
export async function startTracking(requestBackground = true) {
  if (starting) return starting;
  if (foregroundWatch && !requestBackground) return;
  const generation = trackingGeneration;
  starting = (async () => {
    if (!foregroundWatch) {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (generation !== trackingGeneration) return;
    if (permission.status !== "granted") throw Error("Allow Location access to share your position with your customer.");
    await SecureStore.setItemAsync(CONSENT, "yes", {keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY});
    // Subscribe before waiting for a GPS fix, so a slow first fix cannot prevent later updates.
    const watcher = await Location.watchPositionAsync({accuracy:Location.Accuracy.High,timeInterval:5000,distanceInterval:5}, point => { void publish(point).catch(() => {}); });
    if (generation !== trackingGeneration) { watcher.remove(); return; }
    foregroundWatch = watcher;
    void Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High}).then(publish).catch(() => {});
    heartbeat = setInterval(() => {if (AppState.currentState === "active") void Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High}).then(publish).catch(() => {});}, 10000);
    }
    let background;
    try { background = await Location.getBackgroundPermissionsAsync();
    if (requestBackground && background.canAskAgain && background.status !== "granted") background = await Location.requestBackgroundPermissionsAsync();
    } catch { return; }
    if (generation !== trackingGeneration || background.status !== "granted") return;
    try {
      if (await Location.hasStartedLocationUpdatesAsync(TASK)) return;
      await Location.startLocationUpdatesAsync(TASK, {
        accuracy:Location.Accuracy.High,timeInterval:5000,distanceInterval:0,deferredUpdatesInterval:5000,
        pausesUpdatesAutomatically:false,showsBackgroundLocationIndicator:true,
        activityType:Location.ActivityType.AutomotiveNavigation,
        foregroundService:{notificationTitle:"DRIOZ location sharing",notificationBody:"Your customer can follow your location while you are on a journey.",killServiceOnDestroy:true},
      });
    } catch { /* Keep the foreground watcher running when background tracking is unavailable. */ }
  })().finally(() => { starting = null; });
  return starting;
}
export async function resumeTracking() {
  if ((await SecureStore.getItemAsync(CONSENT)) === "yes") await startTracking(false);
}
export async function trackingActive() {
  return (await SecureStore.getItemAsync(CONSENT)) === "yes" && (!!foregroundWatch || await Location.hasStartedLocationUpdatesAsync(TASK));
}
