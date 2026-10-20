# DRIOZ source export

The root project is the current hosted application: Vinext / React, Cloudflare Workers, D1 and R2. `production/` is an older, separate Next.js/NestJS prototype, and `legacy-demo/` is reference code. Neither serves the current site. Do not deploy either as the current app.

## Contents and setup

All tracked source, migrations, public assets, tests, configuration, lockfiles and documentation are included. Git history, dependencies, runtime credentials and generated builds are excluded.

Use Node >=22.13 and pnpm (see package.json and scripts/install-pnpm.sh), install dependencies, then run `npm run typecheck`, `npm run test:backend`, and `npm run test:auth`. Build with the Sites build workflow, which prepares Worker bindings and deployment metadata. Existing hosted database migrations are applied by Sites; do not replay them manually there. This is not a ready-to-upload Hostinger static site or a Vercel migration.

Configure SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, DRIOZ_OWNER_EMAIL, TRIP_PIN_SECRET (at least 32 random characters), GOOGLE_MAPS_BROWSER_KEY using your deployment's secret settings. Configure Supabase redirect URLs and Google provider, restrict Maps key to the actual website domains, and bind DB (D1) and BUCKET (R2). No live credentials are included. The .openai/hosting.json identity belongs to the existing DRIOZ site; create a separate project identity when deploying an independent copy.

## Coverage and booking

Customer pickup addresses determine the region automatically. There is no manual city/country selector and no customer request-for-quote flow. The form displays a server-calculated estimated fare and Book a driver. Configured INR rates apply only to their matching regions; regions without pricing show unavailable pricing rather than an invented amount or currency.

Initial seeded cities with approved valid partners can accept bookings at their stored rates. Explicit city settings, including pauses and service zones, take precedence. Customers without approved local driver coverage see the not-serving message. Registered but offline drivers produce temporary unavailability wording. Operations can add regions for partner registration; pricing in additional currencies still needs implementation before customer booking can open there. Historical quote conversations remain in Support.

## Limits

The current website audience is private. Payments/payouts are manual records, SMS/push/native apps are not active, and live provider/GPS verification remains needed. See README.md and docs/AUTH_SETUP.md for details.

## Mobile source

`mobile/` is the current native Android/iOS implementation. It has its own package.json/package-lock.json; install inside that directory with npm ci. See mobile/README.md for EAS profiles, environment settings, the current API reachability blocker and native device tests. Root source remains the web/backend deployment.
