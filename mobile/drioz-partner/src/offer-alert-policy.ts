/**
 * Decides how a ride offer should alert the partner. Pure (no React Native or
 * Expo imports) so it can be unit-tested from the repo root.
 *
 * A registered push token must NOT silence the local alert: the server may have
 * push disabled, and an `offer_wake` push carries no offerId. The local alert is
 * suppressed only when this exact offer was already alerted or is already on
 * screen as a notification.
 */
export type OfferAlertAction = "skip" | "vibrate" | "notify";

export function offerAlertAction(input: {
  offerId: string | null | undefined;
  foreground: boolean;
  lastAlertedOfferId: string | null | undefined;
  presentedOfferIds: readonly string[];
}): OfferAlertAction {
  const { offerId, foreground, lastAlertedOfferId, presentedOfferIds } = input;
  if (!offerId) return "skip";
  if (offerId === lastAlertedOfferId) return "skip";
  if (presentedOfferIds.includes(offerId)) return "skip";
  return foreground ? "vibrate" : "notify";
}

/** Offer ids of notifications currently shown; notifications without a string data.offerId (e.g. offer_wake) are ignored. */
export function presentedOfferIds(notifications: readonly unknown[] | null | undefined): string[] {
  const ids: string[] = [];
  for (const n of notifications ?? []) {
    const id = (n as any)?.request?.content?.data?.offerId;
    if (typeof id === "string" && id) ids.push(id);
  }
  return ids;
}
