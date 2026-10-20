# Vercel migration status

Work branch: vercel-migration. The approved mobile redesign remains unchanged.

## Implemented

- Standard Next.js dev/build/start commands; Cloudflare build commands retained with :sites suffixes for reference only. Active API routes now use server environment configuration.
- Parameterized PostgreSQL adapter supporting existing first/all/run and atomic batch contracts. Pool connections use the isolated drioz_staging schema; batch operations use serializable transactions. Millisecond timestamps retain safe numeric conversion.
- Private Supabase Storage adapter with owner/staff authorization retained in the operations layer. Downloads use short-lived links; upload payloads are limited to 4 MB on this adapter to fit Vercel's function payload limit. The same existing multipart request format is retained.
- Platform identity headers are disabled on the Vercel runtime. Supabase verifies browser sessions and mobile bearer tokens.
- Separate PostgreSQL staging schema with all 17 tables and existing unique indexes, RLS enabled, and no public schema access grant. Original SQLite migrations remain unchanged.
- Importer creates the staging schema once and compares every restored column value. It refuses an existing schema rather than overwriting data.

## Secure configuration required

DATABASE_URL must be a server-only pooled PostgreSQL connection with certificate validation. Configure SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY for the existing DRIOZ Auth project. Keep its user UUIDs unchanged. Configure SUPABASE_SERVICE_ROLE_KEY and SUPABASE_STORAGE_BUCKET only on the server; the bucket must be private. Supply existing TRIP_PIN_SECRET securely to preserve any active trip-code verification. DRIOZ_OWNER_EMAIL and GOOGLE_MAPS_BROWSER_KEY retain their current purpose.

The Supabase connector currently belongs to an account without DRIOZ project amutkffxebdjenvwjuzq. Do not provision into an unrelated project or change existing identity settings.

## Import rehearsal

Keep the private export outside the repository. Set DATABASE_URL securely and run `node scripts/import-staging.mjs <private-path-to-live-application-rows.json>` only against the selected staging database. This creates drioz_staging once and imports within a transaction. It is a rehearsal using a non-atomic partial export, not a final production migration.

## Before live release

Recover four missing uploaded documents, confirm bucket privacy, and verify file bytes and ownership. Obtain a consistent final export and reconcile writes since the rehearsal. Test real browser and mobile login, fare estimates, booking/driver transitions, role boundaries, recovery, files and payment/payout invariants against staging. Resolve any serialization failures safely without repeating external side effects. Review production audience requirements before exposure. Do not switch DNS until the full staging flow passes. Keep the existing site authoritative until cutover.

## Verification performed

Next.js production build and TypeScript compilation passed. All 38 auth, booking and PostgreSQL tests passed. The private drioz_staging schema was created in the existing DRIOZ Supabase project; imported table counts match all 58 exported rows. Created private bucket drioz-documents-staging (PDF/JPEG/PNG, 5 MB bucket limit; current Vercel upload route accepts 4 MB). Original document bytes remain missing. Live DNS and original Sites hosting are unchanged. Server credentials are not yet configured on Vercel, so real hosted end-to-end login and booking verification is pending.

