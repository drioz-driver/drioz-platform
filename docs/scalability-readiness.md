# DRIOZ scalability readiness — initial safe improvements

This change intentionally does **not** edit production configuration, connect to live data, deploy, or claim a validated capacity.

## Added
- `db/performance-indexes.sql`: additive PostgreSQL indexes for approved-driver lookup, customer history, active driver bookings, scheduled work, notifications, documents, tickets and audit records. Indexes are hypotheses based on schema; inspect actual query plans before adoption.
- `scripts/load-test-dry-run.mjs`: bounded, read-only staging HTTP latency sampler. It refuses drioz.com and other DRIOZ subdomains, non-HTTPS, localhost, and production-named hosts. It is deliberately not a stress test.

## How to validate
1. Restore a recent sanitized dataset to **staging**. Verify table volume and actual query patterns.
2. Run `EXPLAIN (ANALYZE, BUFFERS)` on frequent availability, bookings, documents and operations queries. Compare before/after plans. Confirm `verification='approved'` matches domain code.
3. Apply individual indexes in staging and measure query latency, insert/update overhead and index size. On populated tables use `CREATE INDEX CONCURRENTLY` (not within a transaction).
4. Set `DRIOZ_LOAD_TEST_URL` to a dedicated staging HTTPS host and `DRIOZ_LOAD_TEST_ALLOW_STAGING=YES`, then run `node scripts/load-test-dry-run.mjs`. Expect no writes. The sampled endpoint must be intentionally exposed on staging.
5. Before real scale tests, add authenticated scenario testing, virtual customer and driver lifecycle scripts, GPS ingest benchmarking, dispatch race tests, Razorpay sandbox webhook tests and full observability.
6. Do not promote until signed mobile device testing, provider configuration, migration reconciliation, recoverable backups and an operations review are complete.

## Outstanding launch blockers (NOT fixed by this change)
- Four missing original uploaded documents and final migration reconciliation.
- Production payments, webhook settlement/refunds, payout flows.
- Automated dispatch retry/expiry background worker and notification delivery.
- Real-device Android/iOS background GPS, file uploads, OAuth and signed releases.
- Cursor pagination in existing operations endpoints.
- Independent security review, RLS policy checks and full performance testing.
- Review deployment region and cross-region database latency; avoid changing region without measurement.

## Suggested target exercise (after staging is ready)
10,000 simultaneous customer sessions, 5,000 active driver connections, 1,000 GPS updates/sec, 20 booking requests/sec. Report p95/p99, dispatch correctness, database saturation and recovery. These are **future validation targets**, not achieved results.
