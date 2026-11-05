import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { api } from "./api";
import type { Offer } from "./OfferPopup";
import { alertOffer } from "./alerts";

/** Maps the server's timed offer (lib/ride-offers.ts) to the popup model. */
function toOffer(raw: any, seenBookings: Set<string>): Offer {
  return {
    id: raw.offer_id,
    bookingId: raw.id,
    // "Ride is back" when this partner has already seen (missed or passed) the same booking.
    round: seenBookings.has(raw.id) ? 2 : 1,
    expiresAt: Number(raw.expires_at),
    seconds: Number(raw.seconds || Math.round((raw.expires_at - raw.offered_at) / 1000) || 10),
    pickup: raw.pickup,
    destination: raw.destination,
    tripType: raw.trip_type,
    transmission: raw.transmission,
    scheduledAt: raw.scheduled_at ? Number(raw.scheduled_at) : null,
    partnerFare: Number(raw.partner_fare),localPricing:raw.localPricing,
    hours: raw.hours ?? null,
    vehicleCategory: raw.vehicleCategory ?? null,
    pickupDistanceKm: raw.pickupDistanceKm ?? null,
  } as Offer;
}

/**
 * Exclusive 10-second ride offers. Polling every 2 s while online is also the partner's
 * presence heartbeat: the server only offers rides to partners seen in the last 15 s,
 * so DRIOZ Partner must stay open (foreground) to receive offers.
 */
export function useOffers({ enabled }: { enabled: boolean }) {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [availability,setAvailability]=useState<any>(null);
  const [skew, setSkew] = useState(0);
  const accepted = useRef(new Set<string>());
  const handled = useRef(new Set<string>()),
    seen = useRef(new Set<string>()),
    pending = useRef(false);
  const consider = useCallback((raw: any, server?: number) => {
    if (server) setSkew(server - Date.now());
    if (!raw || handled.current.has(raw.offer_id) || accepted.current.has(raw.id)) return;
    const next = toOffer(raw, seen.current);
    setOffer((current) => (current?.id === next.id ? current : current && current.expiresAt > (server || Date.now()) ? current : next));
    alertOffer(next, AppState.currentState === "active").catch(() => {});
  }, []);
  const poll = useCallback(() => {
    if (pending.current) return;
    pending.current = true;
    api("driver/offers")
      .then((r) => {setAvailability(r.availability||null);consider(r.offers?.[0] || null, r.serverNow)})
      .catch(() => setAvailability({error:"Ride requests are reconnecting. Keep the app open."}))
      .finally(() => {
        pending.current = false;
      });
  }, [consider]);
  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (AppState.currentState === "active") poll();
    };
    tick();
    const t = setInterval(tick, 2000);
    const sub = AppState.addEventListener("change", (state) => state === "active" && poll());
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, [enabled, poll]);
  const close = useCallback(() => {
    setOffer((current) => {
      if (current) {
        handled.current.add(current.id);
        seen.current.add(current.bookingId);
      }
      return null;
    });
  }, []);
  return { offer, availability, skew, close, markAccepted: (o: Offer) => { handled.current.add(o.id); accepted.current.add(o.bookingId); }, pollNow: poll, markHandled: (id: string) => handled.current.add(id) };
}
