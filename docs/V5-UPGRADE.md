# Upgrading drioz.com from `github-ready` to v5

v5 is your live `github-ready` code (Vercel + Supabase Postgres + Razorpay + driver wallet + 10-second offers)
with the redesign, steering animations, separate DRIOZ / DRIOZ Partner apps and the v1.3 feature set merged in.
Nothing that works today is removed: login (email, mobile OTP, Google), Razorpay checkout, wallets, DRIOZ500,
bank transfers, guest booking, the address search and the schedule wheel all keep their code paths.

Do the steps in this order. Steps 1–2 are the only ones that touch production.

## 1. Database — one additive migration

Open Supabase → SQL editor and run **`supabase/migrations/20261030090000_v5_features.sql`** once.

* It only **adds** columns, tables and indexes (`IF NOT EXISTS` everywhere). No table, column, function or row is
  changed or dropped, and your wallet triggers are untouched.
* New tables get the same lockdown as the rest (`ENABLE ROW LEVEL SECURITY` + `REVOKE … FROM anon, authenticated`).
* If you deploy the code before running it, signed-in users see a clear "database is out of date" message instead of
  a broken screen — login itself keeps working.

## 2. Deploy the web app (Vercel)

Push v5 to a **new branch** first (for example `v5`) and open the Vercel preview. When you are happy, merge to `main`.

Existing environment variables stay as they are. Optional new ones (see `.env.example`): `PUSH_ENABLED`,
`EXPO_ACCESS_TOKEN`, `MSG91_*`, `IDFY_*`, `DRIOZ_GSTIN`, `DRIOZ_LEGAL_NAME`, `DRIOZ_ADDRESS`, `DRIOZ_SAC`,
`DRIOZ_SOS_PHONE`. Each feature switches itself on only when its settings exist.

## 3. Supabase Auth redirect URLs

Authentication → URL configuration → Redirect URLs must contain:

* `https://www.drioz.com/auth/callback**` (and your Vercel preview domain while testing)
* `drioz://auth/callback` — DRIOZ customer app
* `driozpartner://auth/callback` — DRIOZ Partner app

## 4. Mobile apps (two apps now)

`mobile/drioz-customer` (DRIOZ, `com.drioz.app` — same store identity as your current app) and
`mobile/drioz-partner` (DRIOZ Partner, `com.drioz.partner` — new store listing). In each folder:

```
cp .env.example .env      # fill EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, GOOGLE_MAPS_ANDROID_KEY, EAS_PROJECT_ID
npm install
npx eas build --platform all --profile preview
```

Both apps include Razorpay (native module), so use a development or EAS build — not Expo Go.

## What changed for each person

**Customers (web + DRIOZ app):** premium redesign; live driver position and ETA; GST invoices (when `DRIOZ_GSTIN` is
set); rate the driver; SOS; share live status with family; saved places; company billing; free cancellation for 5
minutes after assignment, then the city fee; profile edit and self-service account deletion; Hindi and Telugu in the app.

**Partners (web `/partner` + DRIOZ Partner app):** the 10-second offer now shows as the steering-wheel popup
(rolling wheel strip, countdown ring, "ride is back" when a missed ride returns to you); mandatory before/after car
checks with photos; quick messages to the customer; extra hours, tolls and parking at completion; earnings today/
week/month; bonuses; 14-day shift planner; ride credit card linked to the wallet; licence-expiry reminders.

**Operations:** live map, analytics (revenue, offer acceptance, time to assign, partner health), busy-time pricing,
city cancellation fees, corporate accounts, partner bonuses and payouts, automated licence check (IDfy), shift plans.
Admins and operators can open both the customer site and the partner portal from the sidebar.

## How the merge treated your existing systems

| System | v5 behaviour |
|---|---|
| Ride offers | Your `lib/ride-offers.ts` is the only dispatcher (10 s, exclusive, rotation, presence, wallet check). v5 adds a history table `ride_offer_events` for analytics and richer popup data (distance to pickup, hours, car type). When a ride is booked, online partners also get a push "New ride request nearby" so they open the app. |
| Wallet & Razorpay | Unchanged. Extra time, tolls and parking are folded into `fare`/`partner_fare` at completion so checkout and the wallet completion trigger charge and settle the final amount. Payouts managed by the wallet are flagged so finance doesn't pay twice. |
| Auth | Unchanged server code. The sign-in page now has a partner variant (`/partner/login`, `/partner/signup`). |
| File storage | Supabase Storage. Car-check photos are compressed on the device (≈250 KB each) to stay under Vercel's 4.5 MB request limit. |
