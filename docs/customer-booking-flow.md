# DRIOZ customer booking flow

Reference lock: retain the existing cream/forest/green DRIOZ homepage and the user-approved trip options. Public booking form first; account access belongs after the estimate. DRIOZ supplies a driver for the customer's own car.

Research (21 October 2026):
- https://www.nngroup.com/articles/login-walls/ — delay account barriers until users understand the value and reason.
- https://www.uber.com/global/en/price-estimate/ — public trip estimates before commitment.
- https://developer.uber.com/docs/riders/ride-requests/tutorials/api/curl — authentication required for actual ride requests and history.
- https://www.driveu.in/blog/driveu-outstation-drivers-things-to-know-before-the-trip-clqc3l8n02387081wr3zwkunlrb/ — own-car driver service and outstation estimate before request. DRIOZ retains its own fares and service terms.

Implemented journey:
1. Public homepage displays the booking form; no account required.
2. Choose one-way, round-trip package or scheduled outstation; provide pickup/destination, car and transmission.
3. Public coverage/estimate endpoints expose pricing and aggregate availability, never driver identity, private profiles, booking history or precise driver GPS. Guest requests are throttled and cannot create bookings or quotes.
4. Book a driver opens sign-in/create-account options. It saves only allowlisted trip fields in sessionStorage for 30 minutes; no addresses appear in the login URL. Storage failure is shown before navigation.
5. Login or signup returns to the booking form and restores the trip; Google/email confirmation root callbacks can also restore the same-tab draft. Switching tabs/devices is outside sessionStorage persistence.
6. The latest estimate is recalculated. The customer explicitly confirms the request; login does not dispatch a driver. Existing server-side quote, fare, service availability, role and idempotency checks still apply.
7. Clear the draft after successful request. Show requested/accepted/arrived/in-progress/completed states accurately. No online payment or SMS capability is implied.

Exceptions: unsupported city, no available partners, failed estimate, expired estimate, stale session, failed signup/verification and refresh failures must retain entered trip data and show actionable messages.
