# DRIOZ scale upgrade — 2 November 2026

Built on the `v5-integration` branch (`67f8e14`). `pnpm typecheck` is clean, both Expo apps typecheck, and all tests pass.

## What changed

| Area | Before | After |
|---|---|---|
| Dashboard refresh (web + both apps) | Full snapshot (~25 queries, large JSON) every 10–15 s | Tiny `pulse` check every 10 s; full snapshot only when something changed, or once a minute |
| Price fetch (apps) | 500 ms wait, then `coverage`, then `estimate` (two sequential requests) | 300 ms wait, one `price` request returns both |
| Price fetch (web) | 650 ms wait; queued behind any running dashboard refresh | 300 ms wait; runs in parallel with other reads |
| Web requests | Every request (all tabs) ran one at a time through one lock | Reads run in parallel; only writes take the lock exclusively |
| App sign-in check | Supabase Auth called on every app request | Verified token remembered for up to 60 s per server instance; suspension still checked every request |
| Database statements | Each statement: BEGIN SERIALIZABLE, SET, query, COMMIT (4 round trips) | Single statements: 3 round trips, READ COMMITTED; snapshot: one REPEATABLE READ transaction (apps too) |
| Write conflicts | Serializable batches failed the user's request on conflict | Batches retry up to 3 times with jitter |
| Rate limiting | Two writes on every request (count + cleanup) | One write; cleanup by a 5-minute database job |
| Booking history | `customer_id = ? OR driver_id = ?` scan | Two index lookups combined |

New database migrations (already applied to the staging database):
`supabase/migrations/20261102090000_scale_readiness.sql`, `supabase/migrations/20261102090100_rate_limit_sweep.sql`.

## Deploy order
1. Server (this repo) — new endpoints `GET pulse` and `POST price` are additive; old apps keep working.
2. Apps — new builds use `pulse` and `price`, and fall back to plain refresh against an older server.

## Still required for 5–10 lakh users
1. **Move to Mumbai.** `vercel.json` runs functions in `syd1` and the database is in Sydney. Indian users pay ~120–150 ms per request on network distance alone. Create a Supabase project in `ap-south-1`, copy the data, then set `"regions":["bom1"]`. Change both together; never one without the other.
2. **Server-side dispatch.** Ride offers are created inside each online driver's 2-second poll (`lib/ride-offers.ts`), as a serializable transaction that locks the city's waiting bookings. With thousands of drivers this becomes the bottleneck. Move matching to a background worker triggered on booking creation, keep a presence heartbeat, and deliver offers by push + Realtime.
3. **Push instead of polling.** `push_tokens` is empty on staging: confirm EAS push credentials and `PUSH_ENABLED=true`.
4. **Least-privilege database role.** The server connects as `postgres`. Create a dedicated role with access to `drioz_staging` only, set its default `search_path`, and use it in `DATABASE_URL` (transaction pooler, port 6543).
5. **Rate limiting in Redis** (for example Upstash) once traffic grows; Postgres works for now.
6. **Denormalise driver rating** onto `drivers` instead of averaging all ratings for every booking row.
7. **Compute and connections:** larger Supabase compute, pooler in transaction mode, read replica for operations dashboards.
8. **Load test** the booking → offer → accept path before launch.

## Driver cancellation polish (same release)
- Partner app: the reason is now a choice (vehicle/travel issue, personal emergency, customer unavailable, other with a note), translated into Hindi and Telugu.
- Partner web portal: drivers can cancel an accepted ride with a reason (previously app only).
- Ride offers: the reject button shows a visible “Reject” label in the app and on the web.
- `tests/driver-cancel.test.ts` covers reasons, audit details, other drivers and started journeys.

## Notes
- The legacy single app in `mobile/` (outside `drioz-customer` / `drioz-partner`) was not changed. Retire it once both new apps ship.
- `tests/features.test.ts` keeps every PGlite database open until the file ends (~3.3 GB). On machines with 4 GB RAM run it on its own, or close each database after its test.
