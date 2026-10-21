# Driver wallet

## Rules shipped
- DRIOZ500: ₹500 promotional commission credit, once per approved driving licence per test/live mode. No expiry or transferable value.
- Recharge funds and promotional credit stay separate from withdrawable ride earnings. Server-side validation enforces this, not just the screen.
- New ride acceptance is atomic with a sufficient-balance check against the quoted platform deduction. Existing active/legacy trips remain operational.
- Deductions happen on completion, using the final stored bill and partner fare, promotional credit first, recharge second. The existing city rate card and tax calculation remain authoritative; no new percentage was invented. The amount `fare - partner_fare` includes existing platform/tax amounts.
- If the final deduction exceeds funds, recharge can become negative; completing the active journey is never blocked. New rides and withdrawals remain restricted until cleared.
- Fully online-paid rides restore any promo/recharge deduction and credit the net partner fare after four hours, on a 15-minute database schedule. This prevents double commission. The timer begins only when both full gateway payment and completion are recorded.
- Partial/mixed payments need finance reconciliation and do not automatically release driver earnings. Legacy trips are not backfilled into the new ledger or paid twice.
- Customer checkout now supports payment before or after a journey; customer wallet payments remain completion-only. Cancellation refunds require finance action.
- Recorded refunds and signed gateway refund/dispute events put affected driver earnings into review; withdrawals are blocked until finance resolves the issue. No automatic bank clawback is attempted.

## Bank transfers: manual activation required
Checkout collection credentials do not activate bank payouts. Obtain an approved, funded RazorpayX account, set a supported fixed egress IP/allowlist configuration for the deployment, and save these server-only Production variables:
- RAZORPAYX_KEY_ID (live)
- RAZORPAYX_KEY_SECRET
- RAZORPAYX_ACCOUNT_NUMBER (the business source account/customer identifier, not the driver's bank number)
- RAZORPAYX_WEBHOOK_SECRET (a separately chosen signing secret)

Redeploy after configuration. Keep bank transfers disabled until the payout account and network allowlist are ready. Configure `https://www.drioz.com/api/driver/payout-webhook` for payout events with the separate webhook secret. Enable payment.captured/order.paid plus refund.processed/payment.dispute.created on the collection webhook.

Drivers save bank details in Wallet. Finance must verify the holder and register/verify the beneficiary in RazorpayX, then use `/driver-finance` to link its fund account ID. The server fetches the beneficiary and compares the full account number and IFSC; drivers never self-approve bank verification. Only masked details are returned to the browser/app.

Withdrawals reserve available earnings atomically, never coupons or recharge. Provider requests use a persistent UUID idempotency key. Unknown outcomes stay reserved; the same request is reconciled before releasing money. Only confirmed processed payouts show as complete. Failed/rejected/cancelled/reversed transfers restore earnings once. The provider's fees/taxes are borne by the source account, not silently charged to drivers.

No real bank transfer has been executed by the agent. Payout provider activation and bank verification are required before live end-to-end withdrawal testing.

## Database
Migration `20261021035305_driver_wallet.sql` creates six private RLS tables, invoker-only functions/triggers and revokes PUBLIC/anon/authenticated access. Apply in one transaction. Database functions use `drioz_staging,pg_temp` search path and no SECURITY DEFINER. Schedule `SELECT drioz_staging.driver_release_earnings()` every 15 minutes with Supabase pg_cron; the function is idempotent, checks due timestamps and skips locked settlements. Do not rerun migration CREATE statements once applied. Migration history must be reconciled before future CLI db push, because this project's existing production migrations have been applied through SQL Editor.

## Verification
Run root typecheck/build and the backend suites, including tests/driver-wallet.test.ts. Native source shares the same billing endpoints and is typechecked in C:/drioz-apk. Do not claim a signed iOS IPA from Windows.

References: https://razorpay.com/docs/api/x/payouts/create/bank-account/ and https://supabase.com/docs/guides/cron/quickstart .

## Release verification — 21 October 2026
Both production database migrations were applied through the SQL Editor to project amutkffxebdjenvwjuzq. Six driver tables have RLS enabled and no anon/authenticated SELECT access. Five invoker-only functions have no anon/authenticated EXECUTE access. The named 15-minute cron job is active; its release function was exercised with zero eligible real records. No synthetic rides, coupon redemptions or bank transfers were inserted into production.

56 backend tests passed. Android release compiled, installed and launched on the existing emulator; native TypeScript and the iOS JavaScript export passed. The phone-width web layout was checked with a temporary local fixture page, which was removed before committing. Bank payouts have not been activated or executed. A signed iOS app still requires macOS/Xcode or an authorized cloud build.
