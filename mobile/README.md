# DRIOZ mobile apps

There are **two completely separate apps**. Each folder is its own Expo project with its own `package.json`, lockfile, source code, icons, store identity and EAS project. Nothing from the partner app is bundled into the customer app.

| | `drioz-customer/` | `drioz-partner/` |
|---|---|---|
| Store name | **DRIOZ** | **DRIOZ Partner** |
| For | Customers booking a driver | Driver partners |
| iOS bundle / Android package | `com.drioz.app` | `com.drioz.partner` |
| URL scheme | `drioz://` | `driozpartner://` |
| Location | When-in-use only (background location removed from manifest) | Background location + foreground service while online / on a trip |
| Notifications | Trip updates (push) | Ride wake-ups, trip updates (push) |
| Screens | Book, Journeys, Wallet, Inbox, Account (Support inside) | Drive (10-second offers, online switch, ride credit, onboarding & documents), Trips, Wallet, Inbox, Account |
| Payments | Razorpay checkout + wallet (`react-native-razorpay`) | Wallet recharge, DRIOZ500, bank transfers |

The customer app contains no partner screens, links, wording or code: no "become a partner", no "open partner app", no ride-offer popup, no driver onboarding. If a driver account signs in to DRIOZ, it is told the account can't book rides and is asked to sign in with a customer account.

Both apps call the same DRIOZ backend (`/api/mobile/*`, and `/api/wallet` etc. for payments) with Supabase bearer sessions. Both need a development or EAS build (Razorpay is a native module), not Expo Go. Because they are independent projects, the design system (`src/ui.tsx`, `src/theme.ts`, `src/Steering.tsx`) exists in both; change both when you change the brand.

## Admin access

Admins and operators can sign in to **both** apps to check each workflow (a `STAFF` badge shows in the header). In DRIOZ Partner, Account → **Open live dispatch** shows every waiting ride, who currently has the offer, the seconds left and the history. To test the driver flow end to end: apply in DRIOZ Partner, approve yourself on the website (Operations → Partners), then go online.

## Ride offers (DRIOZ Partner)

The server (`lib/ride-offers.ts`) offers each waiting ride to **one** partner at a time for **10 seconds**. Keep DRIOZ Partner open while online: the app polls every 2 seconds, which is also how the server knows you are available. The popup shows a rolling steering-wheel strip, a countdown ring around a turning wheel, vibration and haptics. Accept → the ride is yours (the platform fee is reserved from your ride credit). Pass or let it expire → it moves to the next partner; when nobody takes it, it comes back to you and the popup says **"Ride is back"**. When a ride is booked, online partners also get a push notification so they open the app.

## Run

Node ≥ 22.13. Each app is installed and run on its own:

```sh
cd mobile/drioz-customer          # or mobile/drioz-partner
npm ci
cp .env.example .env              # EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run typecheck
npm start                         # development build (dev client), not Expo Go
```

Add both redirect URLs in Supabase → Authentication → URL Configuration: `drioz://auth/callback` and `driozpartner://auth/callback`.

## Build and publish

### Mumbai migration

The EAS development, preview and production profiles now explicitly use the Mumbai Supabase project. These are public client settings; no server API key is bundled. Both installed apps need a new native build because their Supabase URL is embedded in the JavaScript bundle. Keep the website on Sydney until the new builds are ready for the coordinated cutover. Distribute the Mumbai builds after the website backend is switched, and have users sign in again.

Run inside each app folder — each is its own EAS project and its own store listing:

```sh
npx eas-cli@latest init                                      # set EAS_PROJECT_ID in .env
npx eas-cli@latest build --platform android --profile preview  # internal APK
npx eas-cli@latest build --platform ios --profile preview      # internal iOS build
npx eas-cli@latest build --platform all --profile production   # Play Store AAB + App Store IPA
```

- Android Maps needs a Maps SDK key restricted to the app's package name and signing SHA-1 (`GOOGLE_MAPS_ANDROID_KEY`). Create one key per app, or one key restricted to both. iOS uses Apple Maps.
- DRIOZ Partner needs the Play Console background-location declaration and the App Store location justification.
- Apple Sign-In entitlement is only added when `EXPO_PUBLIC_APPLE_SIGN_IN=true`.
- Remote push (APNs/FCM) is not configured; DRIOZ Partner raises local notifications for offers while it is running in the background and sharing location.

## Verified here

Both apps type-check, and Metro exports Android and iOS JavaScript bundles for each (four bundles). The customer bundle was scanned and contains none of the partner-only screens or endpoints. Native config introspection confirms the separate bundle IDs, schemes and permissions. Simulators and physical devices are not available in this environment — test on real Android and iOS hardware before release.
