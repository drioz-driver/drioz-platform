# DRIOZ wallet and Razorpay checkout

Stack: Next.js App Router / Node.js, Supabase Auth, private PostgreSQL schema `drioz_staging`, React Native / Expo Android and iOS.

## Implemented

- POST `/api/create-order`: authenticated server-created INR orders, minimum 100 paise, maximum top-up ₹10,000. Top-ups accept `{amount, currency:"INR", key:<uuid>}`. Trip payments accept `{purpose:"booking",bookingId,key:<uuid>}`; the server calculates the outstanding fare. A client-supplied receipt is never used as an identity or authorization boundary.
- POST `/api/verify-payment`: accepts the three Razorpay proof fields. Checks ownership, stored order ID, HMAC-SHA256 with timing-safe comparison, and provider-side payment amount/currency/order/captured status. Authorized payments remain pending. Replays cannot credit a wallet twice.
- GET `/api/wallet`: own balance, ledger and completed journey balances.
- POST `/api/wallet/pay`: `{bookingId,key:<uuid>}`. Atomic debit with balance check and replay protection.
- POST `/api/wallet/reconcile`: recovers captured payments when the success callback was interrupted (up to five recent pending orders per check). Webhooks are recommended for automatic recovery of all outstanding orders.
- POST `/api/razorpay/webhook`: raw body signature validation using a separate webhook secret; captured events reuse the same idempotent settlement logic.
- Web `/wallet`: Razorpay Standard Checkout script, modal cancellation/failure handling, retry verification and ledger.
- Native Account → Wallet & online payments: official Razorpay React Native SDK; the same protected backend and ledger.

Test and live balances are separate. Test receipts never enter the real `payments` table or count toward partner payouts. The wallet is DRIOZ service credit only; this does not implement transfers, withdrawal, automatic partner payouts, chargeback management or gateway refund initiation. Existing manual reconciliation remains available for actual external receipts/refunds.

## Database

The migration `supabase/migrations/20261021025159_razorpay_wallet.sql` creates four private tables, indexes, checks and RLS. It was applied to the existing DRIOZ project through the SQL editor on 21 October 2026. Public/anon/authenticated table access was revoked. Application server access continues through the existing private PostgreSQL adapter.

Do not rerun CREATE TABLE statements against that database. For a new environment, apply the migration once inside a transaction after the existing base schema. The file was generated with the Supabase CLI; application used the SQL editor rather than `db push`.

## Configuration

Keep these server-only: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and optional `RAZORPAY_WEBHOOK_SECRET`. `.env` is ignored by Git. `.env.example` contains placeholders only. The frontend receives only the public key ID returned with an order; there is no secret under a NEXT_PUBLIC or EXPO_PUBLIC prefix.

The initially supplied key pair returned Razorpay 401 Authentication failed during a real ₹1 order-creation probe; no order or payment was created. Replace it with a matching key pair. Configure Vercel Production/Preview environment values as appropriate and redeploy. Existing DATABASE_URL and Supabase configuration must remain intact. Until credentials are configured, wallet UI displays an unavailable status and disables online payment actions.

In Razorpay Test Mode, enable automatic payment capture and configure the webhook URL `https://www.drioz.com/api/razorpay/webhook`, events `payment.captured` and `order.paid`, and a separate secret matching the server variable. No webhook secret is inferred from the API secret. Live activation needs matching live keys and the provider's account activation requirements. A manual gateway refund does not automatically reverse spent wallet credits; reconcile any refunds with Operations.

## How to test

1. Configure valid test credentials and the existing app database/auth environment. `pnpm install` then `pnpm dev` runs the website locally; the deployed website is the practical place to test the existing secure login.
2. Sign in, open Wallet, select ₹100 or enter an amount from ₹1 to ₹10,000, and press Add test money.
3. Complete Razorpay checkout with its documented test details. Check that the captured payment adds exactly one ledger credit. Dismissal/failure must not credit anything. Use Check payment status to recover an interrupted confirmation.
4. Pay an existing completed test journey from wallet or online; verify balance and remaining due. Do not mark a real journey completed just to run this test.
5. Repeating verification/webhook delivery must not duplicate credit. Invalid signatures, amounts, foreign orders and insufficient funds must be rejected.
6. In Android open Account → Wallet & online payments. Rebuild after native dependency installation; Expo Go does not contain the Razorpay native module. The iOS JavaScript bundle can be checked on Windows, but building/signing an iOS app requires macOS/Xcode or an authorized cloud build.

Automated checks: `node --experimental-strip-types --test tests/payments.test.ts tests/postgres.test.ts tests/mobile-api.test.ts tests/auth.test.ts`, `pnpm typecheck`, `pnpm build`; native `npx tsc --noEmit`, Android release build and iOS bundle export.

Reference: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
