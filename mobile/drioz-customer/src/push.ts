/**
 * Expo push registration for DRIOZ (customer). Only active in builds that have
 * an EAS project ID (push credentials live in the EAS project). Fails soft.
 */
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { api } from "./api";

const TOKEN_KEY = "drioz.pushToken";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId || Constants.easConfig?.projectId || undefined;
}

export async function registerPush(): Promise<string | null> {
  try {
    const id = projectId();
    if (!id) return null;
    if (Platform.OS === "android")
      await Notifications.setNotificationChannelAsync("default", {
        name: "Trip updates",
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: "#00E699",
      });
    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) return null;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
    await api("push/register", { token, app: "customer", platform: Platform.OS === "ios" ? "ios" : "android" });
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    return token;
  } catch {
    return null;
  }
}

export async function unregisterPush() {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await api("push/unregister", { token }).catch(() => {});
  } catch {}
}

/** Calls back when the user taps a trip notification. */
export function onNotificationTap(handler: (data: Record<string, unknown>) => void) {
  const sub = Notifications.addNotificationResponseReceivedListener((response) =>
    handler((response.notification.request.content.data || {}) as Record<string, unknown>),
  );
  return () => sub.remove();
}
