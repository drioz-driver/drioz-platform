-- DRIOZ PostgreSQL performance indexes (additive, reversible).
-- Execute on a staging database first, with EXPLAIN (ANALYZE, BUFFERS)
-- and representative data. Never run automatically on deployment.
-- For large existing tables, apply each index separately with
-- CREATE INDEX CONCURRENTLY outside a transaction.
-- Target schema must be explicit to avoid indexing the wrong database.
CREATE INDEX IF NOT EXISTS idx_drioz_drivers_city_online_fresh
  ON drioz_staging.drivers (city_id, online, location_at DESC)
  WHERE verification = 'approved';
CREATE INDEX IF NOT EXISTS idx_drioz_bookings_customer_recent
  ON drioz_staging.bookings (customer_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_drioz_bookings_driver_active
  ON drioz_staging.bookings (driver_id, updated_at DESC)
  WHERE driver_id IS NOT NULL AND status IN ('assigned', 'arrived', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_drioz_bookings_scheduled
  ON drioz_staging.bookings (scheduled_at, id)
  WHERE scheduled_at IS NOT NULL AND status IN ('requested', 'assigned');
CREATE INDEX IF NOT EXISTS idx_drioz_notifications_user_recent
  ON drioz_staging.notifications (user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_drioz_documents_owner_recent
  ON drioz_staging.documents (owner_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_drioz_tickets_user_recent
  ON drioz_staging.tickets (user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_drioz_audit_recent
  ON drioz_staging.audit (created_at DESC, id DESC);
