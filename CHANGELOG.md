# Changelog

## 2.0.0 — v5 (30 October 2026)

Built on `github-ready` (`a820cdaa`, 21 Oct 2026). Upgrade steps: `docs/V5-UPGRADE.md`.

### Added
- **Design system** — mint #00E699 / graphite brand across web and both apps, light/dark tokens, Inter + Instrument Serif.
- **Steering-wheel motion** — loaders, "finding your driver", on-the-road strip, and the partner ride-offer popup (rolling wheel strip, countdown ring, haptics, "ride is back").
- **Separate partner experience** — `/partner` portal and the DRIOZ Partner app; the customer site and DRIOZ app contain no partner screens. Staff can open both.
- **Trips** — live driver location and ETA, public family share page, before/after car checks with photos, quick driver messages, SOS, two-way ratings, extra time / tolls / parking at completion, late-cancellation fee after a 5-minute free window.
- **Money** — GST tax invoices with CGST/SGST and sequential numbers, company accounts with "bill to company", busy-time pricing rules, partner bonus campaigns.
- **Operations** — live map, analytics with partner-health flags, IDfy licence verification, shift plans, offer pipeline monitor.
- **Accounts** — profile and phone editing, saved places, self-service account deletion, privacy and terms pages.
- **Notifications** — Expo push (both apps), MSG91 SMS and WhatsApp for trip events.
- **Apps** — two Expo projects (`mobile/drioz-customer`, `mobile/drioz-partner`) carrying over Razorpay wallet, address search, schedule wheel and driver wallet; Hindi and Telugu.
- **Database** — `supabase/migrations/20261030090000_v5_features.sql` (additive only).

### Fixed
- Configured owner email is promoted to admin even if the account signed up first (the sign-in fast path skipped it).
- Scheduled pickups in the app are always interpreted in IST, whatever the phone's time zone.
- Saving a city in Operations no longer resets its cancellation fee.
- Driver wallet payouts are not offered for manual payout a second time.
- `tests/booking-form.test.mjs` failed because its loader could not resolve the schedule wheel.
- Mobile session refreshes are shared, so parallel requests no longer race and sign the user out.
- Web layout overflow on phones in the partner dashboard.

### Tests
134 automated tests (PostgreSQL via PGlite with the full Supabase schema, wallet and timed offers switched on; SQLite for legacy suites). `pnpm test`.
