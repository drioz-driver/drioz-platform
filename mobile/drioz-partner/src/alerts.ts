import { AppState, Platform, Vibration } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { money } from "./api";
import { PUSH_FLAG } from "./push";

/**
 * Local alerts for ride offers. While a partner is online and sharing location,
 * the background location task also checks for a waiting offer and raises a
 * high-priority local notification so a backgrounded app still hears about it.
 * When remote push is registered (push.ts) the server already notifies the
 * device, so the local fallback stays silent to avoid double alerts.
 */
const LAST = "drioz.lastOfferAlert";
Notifications.setNotificationHandler({
  handleNotification: async (n) => {
    // In the foreground the offer popup itself is the alert — don't stack a banner on top.
    const offer = ["offer", "offer_wake"].includes((n.request.content.data as any)?.type) || !!(n.request.content.data as any)?.offerId;
    const quiet = offer && AppState.currentState === "active";
    return { shouldShowBanner: !quiet, shouldShowList: !quiet, shouldPlaySound: !quiet, shouldSetBadge: false };
  },
});
export async function prepareAlerts() {
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("ride-offers", {
      name: "Ride offers",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400, 200, 400],
      lightColor: "#00E699",
      sound: "default",
    });
  const current = await Notifications.getPermissionsAsync();
  if (!current.granted && current.canAskAgain) await Notifications.requestPermissionsAsync();
}
export async function alertOffer(offer: { id: string; partnerFare: number; pickup: string; seconds: number }, foreground: boolean) {
  if ((await SecureStore.getItemAsync(LAST)) === offer.id) return;
  await SecureStore.setItemAsync(LAST, offer.id);
  if (foreground) {
    Vibration.vibrate([0, 350, 150, 350, 150, 350]);
    return;
  }
  if ((await SecureStore.getItemAsync(PUSH_FLAG)) === "yes") return; // server push already delivered it
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `New ride · ${money(offer.partnerFare)}`,
      body: `Pickup: ${offer.pickup}. Open DRIOZ Partner to accept within ${offer.seconds}s.`,
      data: { type: "offer", offerId: offer.id },
      sound: "default",
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: Platform.OS === "android" ? { channelId: "ride-offers" } : null,
  });
}
