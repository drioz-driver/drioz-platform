import {localMoney} from './local-money';
import { AppState, Platform, Vibration } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { money } from "./api";
import { offerAlertAction, presentedOfferIds } from "./offer-alert-policy";

/**
 * Local alerts for ride offers. While a partner is online and sharing location,
 * the background location task also checks for a waiting offer and raises a
 * high-priority local notification so a backgrounded app still hears about it.
 * A registered push token does not silence this fallback (the server may not be
 * sending offer pushes). Double alerts are avoided per offer instead: skip when
 * this offer was already alerted or its notification is already on screen.
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
  const lastAlertedOfferId = await SecureStore.getItemAsync(LAST);
  if (lastAlertedOfferId === offer.id) return;
  const presented = await Notifications.getPresentedNotificationsAsync().catch(() => []);
  const action = offerAlertAction({ offerId: offer.id, foreground, lastAlertedOfferId, presentedOfferIds: presentedOfferIds(presented) });
  if (offer.id) await SecureStore.setItemAsync(LAST, offer.id);
  if (action === "skip") return;
  if (action === "vibrate") {
    Vibration.vibrate([0, 350, 150, 350, 150, 350]);
    return;
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `New ride · ${localMoney(offer.partnerFare,offer)}`,
      body: `Pickup: ${offer.pickup}. Open DRIOZ Partner to accept within ${offer.seconds}s.`,
      data: { type: "offer", offerId: offer.id },
      sound: "default",
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: Platform.OS === "android" ? { channelId: "ride-offers" } : null,
  });
}
