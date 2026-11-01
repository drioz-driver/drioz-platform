-- DRIOZ scale readiness (additive only; safe to re-run).
SET search_path = drioz_staging;

-- Pulse endpoint: latest change per user, read straight from an index.
CREATE INDEX IF NOT EXISTS bookings_customer_updated ON bookings (customer_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS bookings_driver_updated ON bookings (driver_id, updated_at DESC) WHERE driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notifications_user_unread ON notifications (user_id) WHERE read = 0;
CREATE INDEX IF NOT EXISTS replies_ticket_created_desc ON replies (ticket_id, created_at DESC);

-- Booking history for drivers and the foreign keys the Supabase advisor flagged.
CREATE INDEX IF NOT EXISTS bookings_driver_created ON bookings (driver_id, created_at DESC) WHERE driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS driver_trip_money_driver_mode ON driver_trip_money (driver_id, mode);
CREATE INDEX IF NOT EXISTS gateway_orders_booking ON gateway_orders (booking_id);
CREATE INDEX IF NOT EXISTS gateway_payments_customer ON gateway_payments (customer_id);
CREATE INDEX IF NOT EXISTS incentive_awards_driver ON incentive_awards (driver_id);
CREATE INDEX IF NOT EXISTS inspections_driver ON inspections (driver_id);
CREATE INDEX IF NOT EXISTS location_requests_city ON location_requests (city_id);
CREATE INDEX IF NOT EXISTS location_requests_customer_created ON location_requests (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ratings_rater ON ratings (rater_id);
CREATE INDEX IF NOT EXISTS ride_offer_events_booking ON ride_offer_events (booking_id);
CREATE INDEX IF NOT EXISTS tickets_booking ON tickets (booking_id);
CREATE INDEX IF NOT EXISTS wallet_entries_booking ON wallet_entries (booking_id);
CREATE INDEX IF NOT EXISTS payouts_booking_status ON payouts (booking_id, status);
