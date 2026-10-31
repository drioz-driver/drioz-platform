/**
 * Remote push for ride offers and trip updates (Expo push service → FCM / APNs).
 * Registration only happens when the build has an EAS project id; otherwise the
 * app keeps using local alerts from the background location task (alerts.ts).
 */
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { api } from "./api";

const TOKEN = "drioz.partner.pushToken";
export const PUSH_FLAG = "drioz.partner.pushRegistered";

export function pushProjectId(): string | null {
  const extra: any = Constants.expoConfig?.extra;
  return extra?.eas?.projectId || (Constants as any).easConfig?.projectId || null;
}

export async function registerPush() {
  const projectId = pushProjectId();
  if (!projectId || Platform.OS === "web") return null;
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return null;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await api("push/register", { token, app: "partner", platform: Platform.OS === "ios" ? "ios" : "android" });
  await SecureStore.setItemAsync(TOKEN, token);
  await SecureStore.setItemAsync(PUSH_FLAG, "yes");
  return token;
}

export async function unregisterPush() {
  const token = await SecureStore.getItemAsync(TOKEN);
  await SecureStore.deleteItemAsync(PUSH_FLAG).catch(() => {});
  if (!token) return;
  await api("push/unregister", { token }).catch(() => {});
  await SecureStore.deleteItemAsync(TOKEN).catch(() => {});
}

/** Calls `onOffer` when the partner taps an offer notification (cold start or background). */
export function onOfferTapped(onOffer: (offerId: string) => void) {
  Notifications.getLastNotificationResponseAsync()
    .then((r) => {
      const data: any = r?.notification.request.content.data;
      if (data?.type === "offer" || data?.type === "offer_wake" || data?.offerId) onOffer(String(data.offerId || ""));
    })
    .catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const data: any = r.notification.request.content.data;
    if (data?.type === "offer" || data?.type === "offer_wake" || data?.offerId) onOffer(String(data.offerId || ""));
  });
  return () => sub.remove();
}
