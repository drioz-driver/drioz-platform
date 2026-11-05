# Timed driver ride offers

A server-owned 10-second lease is exclusive to one eligible online driver. Polling advances expired or passed offers to the next eligible driver and wraps to the earlier driver when nobody else is eligible. Every re-offer has a fresh UUID. Accept checks the current UUID, driver ownership and server deadline inside the same transaction as booking assignment and wallet reservation. Expired or replayed accepts cannot assign a ride or reserve commission.

Eligibility preserves approval, valid licence, city, no active ride, and enough commission credit. Only drivers actively polling within the previous 15 seconds receive in-app offers. One driver cannot receive overlapping active offers from the dispatcher. Customer cancellation and staff assignment make the offer ineligible immediately at the next poll.

Web and native foreground alerts poll every 2 seconds, use the returned server time, show earnings/route/trip details, and have Accept/Pass controls and a progress bar. Native alerts include a short tick and haptic feedback. Closed-app/locked-phone push notifications are not configured by this change; foreground presence prevents silently reserving offers for inactive devices.

Migration 20261021144941_driver_timed_offers.sql applied to the private drioz_staging schema on 2026-10-21. Both new tables have RLS enabled; anon and authenticated have no SELECT permission. No production bookings, offers, payments or transfers were created during testing. Six isolated PostgreSQL offer tests and 39 existing backend/API/wallet tests passed (45 total).


## v5 additions

* The web partner portal (`/partner`) and DRIOZ Partner app show the offer as the steering-wheel popup (`app/_ui/offer-popup.tsx`, `mobile/drioz-partner/src/OfferPopup.tsx`). "Ride is back" appears when the same booking returns to a partner who already saw it.
* Each offer is also written to `ride_offer_events` (offer id, driver, attempt, times, outcome `accepted`/`passed`, or expired when neither) for analytics and partner-health flags. `ride_offers` still holds only the live slot per booking.
* Poll results add `hours`, `vehicleCategory`, `seconds` and `pickupDistanceKm` (when the partner shared a location in the last 2 minutes).
* A new booking pushes "New ride request nearby" (`type: offer_wake`) to online partners in the city so they bring the app to the foreground; the offer itself still goes only through polling.
