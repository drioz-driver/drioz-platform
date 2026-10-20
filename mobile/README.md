# DRIOZ for Android and iOS

Native React Native application using Expo SDK 57, connected to the same Supabase Auth and DRIOZ Worker/D1/R2 API as the website. One application shows the customer experience or driver experience based on the server-owned account role. Admin remains on the website. This is native source, not a WebView wrapper.

## Implemented

- Email/password sign-in and customer/driver registration; Google OAuth with PKCE and the system browser; encrypted, chunked SecureStore session persistence; optional Apple ID sign-in; password recovery through the existing website.
- Native map selection of exact pickup/destination points, device geolocation and platform reverse geocoding. City coverage is detected automatically. No manual city/country selector or Request a quote button.
- One Way without hours; Round Trip pickup/package hours; Outstation direction/hours and required schedule. Vehicle/transmission selection, automatic estimates, immutable server fare checks, idempotent booking, history and cancellation.
- Partner profile, expiry and document upload; distinct licence/identity/assessment controls; approved-driver availability; accept/arrive/start with customer code/complete; earnings records.
- Explicit consent for background driver GPS, native permission requests, Android foreground service notification, stop control, sign-out/offline cleanup and a last-reported GPS map. OS restrictions can still stop delivery. It is not a guaranteed 24/7 tracker.
- Assigned-customer access to recent driver location; private support messages, in-app inbox and account controls. Inbox refreshes while open; remote push notifications are not implemented.
- A new `/api/mobile/*` surface validates every bearer session against Supabase, ignores browser identity headers/cookies, limits requests and uses the existing authorization and trip rules. Native requests do not bypass the private hosting audience.

## Run

Use Node >=22.13. From this directory:

```sh
npm ci
cp .env.example .env
# Fill in configuration, then:
npx expo install --check
npm run typecheck
npx expo start --dev-client
```

Use a development build, not Expo Go, for background tracking and native configuration. Android Maps requires your own Maps SDK for Android key, restricted to `com.drioz.app` and the signing certificate SHA-1. The website's browser-restricted key cannot be reused. iOS uses Apple Maps by default.

Copy the Supabase project URL and publishable key into the two EXPO_PUBLIC variables. These are public app configuration; never put a service-role key, signing credential, trip PIN secret or database credential in the mobile app. `EXPO_PUBLIC_API_URL` must be the HTTPS origin serving the DRIOZ backend. Restart Metro after environment changes; rebuild binaries for native key/config changes.

### API access blocker

The current Sites audience is owner-private. Installed apps do not carry ChatGPT browser cookies, so the hosting layer may stop them before `/api/mobile/*`. An authenticated, network-accessible API deployment is needed for real-device operation. Do not embed the Sites bypass token or remove access protection as a workaround. Keep every API operation behind Supabase bearer validation and the domain authorization checks. Coordinate a separately reachable backend or a deliberate hosting access change before live tests. No audience or domain changes were made for this mobile implementation.

### Supabase mobile sign-in

Add exactly `drioz://auth/callback` to Supabase Authentication → URL Configuration → Redirect URLs. Retain the existing web redirects. Google provider must already be configured in Supabase; its OAuth client callback remains the Supabase callback URL, not the custom app scheme. Email confirmation must return to the same device/app to access the PKCE verifier.

If enabling Apple login, configure the Apple provider/capability for your developer account and set `EXPO_PUBLIC_APPLE_SIGN_IN=true`. Validate the applicable App Store social sign-in requirements before release. The optional Apple feature is not enabled by default.

## Create installable builds

After configuring your Expo account and choosing final application identifiers:

```sh
npx eas-cli@latest login
npx eas-cli@latest init
# Add the real returned project ID to EAS_PROJECT_ID; configure matching EAS build env values.
npx eas-cli@latest build --platform android --profile development
npx eas-cli@latest build --platform ios --profile development
# Internal testing: Android APK / provisioned iOS app
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform ios --profile preview
# Store builds: Android AAB / signed iOS archive
npx eas-cli@latest build --platform all --profile production
```

`eas.json` defines development, internal-preview and production profiles. No account, Expo project UUID, signing certificate, provisioning profile or store credentials are fabricated or included. iOS internal builds need an Apple Developer team and registered test devices; TestFlight is another distribution option after production build setup. EAS can compile iOS in the cloud without a local Mac. Local iOS builds need Xcode/macOS; Android local builds need Android Studio/SDK/JDK. Java alone is insufficient.

## Verification performed here

Dependencies installed with a lockfile; native TypeScript and backend TypeScript checked; API tests cover bearer-only authentication, rejection of unverified/expired sessions, exclusion of staff mutations, customer-owned booking and cross-account isolation, and bounded request sizes. Metro exports Android and iOS JavaScript bundles. A Metro bundle is not an installable APK/IPA and does not prove native GPS, maps or OAuth behavior on hardware.

## Real-device checks before release

- Verify both customer and driver sign-in, email confirmation, Google and enabled Apple flows on physical Android/iOS devices, including cancellation and cold-start deep links.
- Test map key restrictions, current-position permission denied/allowed, pickup detection, One Way/Round Trip/Outstation prices and duplicate booking retries against the reachable API.
- Verify driver approval gates, all three evidence types, online/offline, acceptance conflicts, customer start-code expiry/lockout, completion, history and account isolation.
- Verify GPS with foreground, background, locked screen, Android battery optimization, revoked permissions, sign-out, offline and app termination. iOS/Android can stop a killed app; do not promise uninterrupted tracking. Stale server positions expire after two minutes.
- Supply production icons/splash assets, public privacy policy/support URLs, retention and account deletion process, location disclosures/Data Safety labels, store screenshots, content rating and store review access. Account deletion is currently an Operations-assisted request, not automatic in-app erasure; store-readiness review is still required.
- Live payments, remote push delivery and guaranteed emergency dispatch remain unimplemented, consistent with the website.

References: https://docs.expo.dev/versions/v57.0.0/ · https://docs.expo.dev/versions/latest/sdk/location/ · https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth
