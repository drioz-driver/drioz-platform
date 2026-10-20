# DRIOZ private pilot

The hosted site now uses a Vinext React frontend, Cloudflare Worker API, D1 records and private R2 documents, with Supabase email/password and Google authentication plus private ChatGPT preview access. The existing `production/` directory retains the separately built Next.js/NestJS/PostgreSQL architecture; it is not the runtime serving this Site. The old browser-local preview is preserved in `legacy-demo/` for reference and regression testing.

## Implemented

- Secure identity; account-owned data; owner admin bootstrap from the runtime owner email; operator, finance and support roles; suspended-account checks; same-origin writes and write throttling.
- Worldwide Google address search and configurable regions; admin can add city/country service areas under Operations → Cities. Approved local drivers determine customer coverage. Customers see the configured fare and Book a driver, with no request-for-quote flow. Additional currencies need pricing support before customer booking opens in those regions.
- Six initial configurable INR rate cards; launch gate; circular service zones; server-calculated expiring quotes; hours, night surcharge, tax and commission; idempotent bookings; scheduling.
- Partner applications, licence expiry checks, private file uploads/downloads, document review and driving assessment evidence; approval required for availability and dispatch.
- Trip-specific booking: One Way has no package duration; Round Trip needs only pickup and a 2/4/6/8/12 hour package; Outstation includes direction, estimated usage and a required schedule. Transmission and vehicle category are stored with each quote. Address-only customer requests with a private operations location-verification queue before dispatch.
- Customer booking history and fare statements; manual assignment, nearest available partner assignment using fresh consented coordinates, partner acceptance, reassignment and atomic conflict protection.
- Arrival, six-digit customer trip-start codes protected with a runtime HMAC key, expiration, five-attempt lockout, trip completion and partner earnings records.
- Opt-in browser geolocation while online or on an active journey; recent coordinates for assigned customers; short-lived status-only sharing links that respect the Site's private audience.
- In-app notifications; support ticket conversations; incident category; activity audit; manual receipts/refunds and payout reconciliation. Financial forms only record transactions made independently and do not move money.
- Responsive customer, partner and operations interfaces; mobile web manifest.

## Run and verify

Use the Sites skill for installation, build and publication. Backend checks: `npm run test:backend`; TypeScript: `npm run typecheck`. Build through the Sites build helper. Migrations live under `drizzle/` and are applied by Sites publication. These migrations must not be replayed manually against a hosted database.

The integration tests use SQLite in memory with the same migration SQL and API domain handlers. They cover identity and permissions, quotes, service areas, booking retries, complete trip flow, OTP lockout, concurrent assignments, nearest dispatch, reconciliation races, verification gates, support isolation and immutable agreed prices. They do not replace browser tests, real provider tests or production load testing.

## Runtime configuration

`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` activate managed authentication. `DRIOZ_OWNER_EMAIL` identifies the verified sign-in email initially assigned admin access. `TRIP_PIN_SECRET` protects start codes. Both are stored as hosted secrets, not committed. Platform bindings are `DB` and `BUCKET`. Accounts establish identity through platform-injected headers, never client-supplied roles.

## Before the first pilot trip

Sign in using the owner email; open Operations → Cities; configure a service-area centre/radius and pricing, then enable a city. Default city rates are illustrative; initial cities become bookable once approved valid partners join, unless admin has explicitly paused them. Review rates before operational use. Onboard a driver, independently verify licence and identity, conduct the driving assessment, review all required evidence, then approve the partner. Go online and accept or assign a customer booking. The private Site access policy must allow each pilot participant before they can sign in.

## Not complete for public launch

- Google Maps address search, driving route preview and device GPS map are integrated through GOOGLE_MAPS_BROWSER_KEY. Live browser/provider and device GPS verification remain pending. Fares use service packages rather than road distance. A nearest-partner match uses straight-line distance. Worldwide addresses do not imply worldwide driver coverage.
- Email/password, mobile OTP and Google sign-in integration is implemented; provider activation and real end-to-end tests are pending. See `docs/AUTH_SETUP.md`. SMS/push delivery and real payment gateway/refund/payout execution still need provider setup.
- Native Android/iOS apps and app-store distribution remain unbuilt. The mobile web manifest is not a native app.
- No automated request-expiry/retry worker, background dispatch queue, monitored emergency service or SOS integration.
- Overtime beyond agreed hours needs a separate agreed quote; cancellation charges are not collected. Outstation bookings are limited to configured service zones until dedicated route rules are implemented.
- Current operational lists return the latest 100 records; large-volume pagination, monitoring/alerting, backup/restore drills, retention/deletion flows and production load/security reviews remain launch work.
- Browser visual verification is blocked by preview infrastructure in this environment. Only builds, type checks and domain integration tests are verified.

Do not represent this as ready for public transport operations, as a monitored safety service, or as a live payment platform.

## Android and iOS source

The `mobile/` directory contains the Expo / React Native customer and driver app, its locked dependencies, native location/auth configuration, EAS build profiles and setup guide. It uses `/api/mobile/*` with remotely verified Supabase bearer sessions and the same booking domain. See `mobile/README.md` for current private-API access, signing, maps and device-test requirements. Native JavaScript exports are verified; no APK/IPA or store release has been generated.
