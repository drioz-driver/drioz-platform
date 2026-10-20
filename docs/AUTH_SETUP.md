# DRIOZ authentication activation

## Implemented source

- Dedicated `/login`, `/signup`, `/forgot-password` and `/reset-password` screens.
- Managed Supabase Auth integration for email/password, phone OTP and Google OAuth.
- Email confirmation/resend and PKCE callback exchange; password recovery with an expiring, single-use, hashed recovery grant bound to the provider user.
- Server-validated identities, HttpOnly/Secure/SameSite cookies, refresh-cookie propagation and non-cacheable auth responses.
- Per-IP and per-identifier attempt limits, OTP resend countdown, generic credential failures and password recovery responses.
- Server-side application roles and suspension checks. Public account creation can never create staff/admin access. Driver experience selection does not approve a driver.
- Local sign-out, global sign-out API scope, session-expiry handling and explicit private-preview fallback.

## Required project settings

Use a dedicated DRIOZ Supabase project. Add `SUPABASE_URL` and the project's publishable key as `SUPABASE_PUBLISHABLE_KEY` in the Site's runtime configuration, then redeploy. A service-role key is neither used nor required. Never place Google client secrets or SMS credentials in frontend code or the repository.

Set Site URL to `https://drioz-driver-platform.icyfinch4.chatgpt.site`. Allow the specific app callback path plus its next parameters in Supabase Redirect URLs. A restricted pattern for this deployment is `https://drioz-driver-platform.icyfinch4.chatgpt.site/auth/callback**`. Do not allow unrelated domains or a broad wildcard for production domains.

### Email and password

Enable email sign-in and **Confirm email**. Configure production SMTP, sender identity and delivery limits. Use the managed verification and recovery templates. The implemented PKCE confirmation/recovery flow expects the link to be opened in the same browser that initiated the request. Passwords are handled by Supabase and never stored by DRIOZ.

The app requires at least 12 characters for newly chosen passwords. Configure provider password security consistently. Activation must be tested with a newly created user, verification email, incorrect password, recovery, replayed/expired recovery link and sign-out.

### Google

Create a Google OAuth Web application. In Google Cloud, authorize the callback shown in your Supabase Google-provider settings, usually `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`. Enter the Google client ID and secret in Supabase's Google provider, then enable it. This is different from DRIOZ's own `/auth/callback`, which is a Supabase redirect URL. Complete the provider consent-screen and publishing requirements for the intended audience.

Test successful login, cancellation, returning users and duplicate-identity handling. Only provider-confirmed email can identify the configured DRIOZ owner; unverified email attached to a phone user cannot grant owner access.

### Mobile OTP

Enable the phone provider and configure a supported SMS service in Supabase. Configure the provider's country, sender and template requirements for the launch market. Use E.164 numbers. Keep server attempt limits and provider OTP expiry/rate limits enabled. Test real delivery, wrong/expired codes, resend cooldown and signup.

Public launch also needs the provider's bot-abuse/CAPTCHA protection configured and integrated; this private pilot's attempt limits are not a substitute for that review.

## Roles, identity and existing pilot data

Staff roles remain database-owned. The verified email matching `DRIOZ_OWNER_EMAIL` is bootstrapped as owner admin on first account creation; other new users are customers. Operators cannot grant themselves admin access. Driver applications and independent document/assessment approvals remain separate from login.

Managed identities use the `supabase:` namespace, preserving the existing ChatGPT pilot records. The integration does not silently merge an existing pilot identity, a phone identity and an email identity by matching display metadata. Use the same identity for an existing history. A verified account-linking/migration procedure must be planned before migrating users who already have pilot records.

The Site's existing private audience and ChatGPT access gate remain unchanged. Installing the Supabase plugin does not enable the project's providers or make DRIOZ public. A public standalone deployment or explicitly changed Site access is required for consumer access without the current private-preview gate.

## Verification limits

Automated tests cover identity trust, redirect safety, cookies, logout isolation, recovery replay/expiry and throttling. Live Google OAuth, SMTP/SMS delivery, cross-browser behavior and complete browser session tests require configured credentials and provider access. Do not describe these external flows as live until they have passed those checks.

References:
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/phone-login
- https://supabase.com/docs/guides/auth/passwords
