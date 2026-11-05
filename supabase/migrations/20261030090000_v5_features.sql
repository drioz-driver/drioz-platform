-- DRIOZ v5: ratings, inspections, saved places, push tokens, GST invoices, corporate billing,
-- incentives, availability planner, surge rules, offer analytics and trip timestamps.
-- Additive only: no existing column, table or function is changed or dropped.
SET LOCAL search_path=drioz_staging;

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS gps_flags bigint NOT NULL DEFAULT 0;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS date_of_birth text;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'not_run';
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS kyc_result text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS extras text NOT NULL DEFAULT '{}';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_fee bigint NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS assigned_at bigint;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS started_at bigint;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completed_at bigint;

CREATE TABLE IF NOT EXISTS ratings(
 booking_id text NOT NULL REFERENCES bookings(id),
 rater_id text NOT NULL REFERENCES users(id),
 ratee_id text NOT NULL REFERENCES users(id),
 by_role text NOT NULL CHECK(by_role IN ('customer','driver')),
 stars bigint NOT NULL CHECK(stars BETWEEN 1 AND 5),
 tags text NOT NULL DEFAULT '[]',
 comment text NOT NULL DEFAULT '',
 created_at bigint NOT NULL,
 PRIMARY KEY(booking_id,rater_id)
);
CREATE INDEX IF NOT EXISTS ratings_ratee ON ratings(ratee_id,by_role);

CREATE TABLE IF NOT EXISTS inspections(
 id text PRIMARY KEY,
 booking_id text NOT NULL REFERENCES bookings(id),
 driver_id text NOT NULL REFERENCES users(id),
 phase text NOT NULL CHECK(phase IN ('pre','post')),
 checklist text NOT NULL,
 notes text NOT NULL DEFAULT '',
 photos text NOT NULL DEFAULT '[]',
 created_at bigint NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS inspection_phase ON inspections(booking_id,phase);

CREATE TABLE IF NOT EXISTS saved_places(
 id text PRIMARY KEY,
 user_id text NOT NULL REFERENCES users(id),
 label text NOT NULL,
 address text NOT NULL,
 lat double precision NOT NULL,
 lng double precision NOT NULL,
 created_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS saved_places_user ON saved_places(user_id);

CREATE TABLE IF NOT EXISTS push_tokens(
 token text PRIMARY KEY,
 user_id text NOT NULL REFERENCES users(id),
 app text NOT NULL CHECK(app IN ('customer','partner')),
 platform text NOT NULL,
 updated_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS push_tokens_user ON push_tokens(user_id,app);

CREATE TABLE IF NOT EXISTS invoices(
 booking_id text PRIMARY KEY REFERENCES bookings(id),
 number text NOT NULL UNIQUE,
 issued_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS companies(
 id text PRIMARY KEY,
 name text NOT NULL,
 gstin text NOT NULL DEFAULT '',
 billing_email text NOT NULL,
 address text NOT NULL DEFAULT '',
 active bigint NOT NULL DEFAULT 1,
 created_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS incentives(
 id text PRIMARY KEY,
 city_id text,
 title text NOT NULL,
 target_trips bigint NOT NULL,
 bonus bigint NOT NULL,
 starts_at bigint NOT NULL,
 ends_at bigint NOT NULL,
 active bigint NOT NULL DEFAULT 1,
 created_at bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS incentive_awards(
 id text PRIMARY KEY,
 incentive_id text NOT NULL REFERENCES incentives(id),
 driver_id text NOT NULL REFERENCES users(id),
 amount bigint NOT NULL,
 status text NOT NULL DEFAULT 'pending',
 reference text,
 created_at bigint NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS incentive_award_once ON incentive_awards(incentive_id,driver_id);

CREATE TABLE IF NOT EXISTS availability_plans(
 driver_id text NOT NULL REFERENCES users(id),
 day text NOT NULL,
 start_min bigint NOT NULL,
 end_min bigint NOT NULL,
 off bigint NOT NULL DEFAULT 0,
 updated_at bigint NOT NULL,
 PRIMARY KEY(driver_id,day)
);
CREATE INDEX IF NOT EXISTS availability_day ON availability_plans(day);

CREATE TABLE IF NOT EXISTS surge_rules(
 id text PRIMARY KEY,
 city_id text NOT NULL REFERENCES cities(id),
 label text NOT NULL,
 multiplier_bps bigint NOT NULL CHECK(multiplier_bps BETWEEN 10100 AND 30000),
 days bigint NOT NULL DEFAULT 127,
 start_min bigint NOT NULL,
 end_min bigint NOT NULL,
 active bigint NOT NULL DEFAULT 1,
 created_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS surge_city ON surge_rules(city_id,active);

-- History of every timed offer (ride_offers keeps only the live slot per booking).
CREATE TABLE IF NOT EXISTS ride_offer_events(
 offer_id text PRIMARY KEY,
 booking_id text NOT NULL REFERENCES bookings(id),
 driver_id text NOT NULL,
 attempt bigint NOT NULL,
 offered_at bigint NOT NULL,
 expires_at bigint NOT NULL,
 outcome text CHECK(outcome IN ('accepted','passed')),
 responded_at bigint
);
CREATE INDEX IF NOT EXISTS ride_offer_events_offered ON ride_offer_events(offered_at);
CREATE INDEX IF NOT EXISTS ride_offer_events_driver ON ride_offer_events(driver_id,offered_at);

CREATE INDEX IF NOT EXISTS notifications_user_created ON notifications(user_id,created_at);
CREATE INDEX IF NOT EXISTS tickets_user_created ON tickets(user_id,created_at);
CREATE INDEX IF NOT EXISTS replies_ticket_created ON replies(ticket_id,created_at);
CREATE INDEX IF NOT EXISTS documents_owner_created ON documents(owner_id,created_at);
CREATE INDEX IF NOT EXISTS drivers_city_verification ON drivers(city_id,verification,online);
CREATE INDEX IF NOT EXISTS bookings_customer_created ON bookings(customer_id,created_at);
CREATE INDEX IF NOT EXISTS bookings_driver_status ON bookings(driver_id,status);
CREATE INDEX IF NOT EXISTS bookings_completed ON bookings(driver_id,completed_at);
CREATE INDEX IF NOT EXISTS bookings_company ON bookings(company_id,created_at);
CREATE INDEX IF NOT EXISTS payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS payouts_driver_created ON payouts(driver_id,created_at);
CREATE INDEX IF NOT EXISTS audit_created ON audit(created_at);
CREATE INDEX IF NOT EXISTS audit_target_action ON audit(target,action);
CREATE INDEX IF NOT EXISTS rate_limits_expiry ON rate_limits(expires_at);
CREATE INDEX IF NOT EXISTS location_requests_status ON location_requests(status,created_at);
CREATE INDEX IF NOT EXISTS shares_expiry ON shares(expires_at);

-- Same lockdown as every other DRIOZ table: only the server (service connection) reads or writes.
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE incentives ENABLE ROW LEVEL SECURITY;
ALTER TABLE incentive_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE surge_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_offer_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ratings,inspections,saved_places,push_tokens,invoices,companies,incentives,incentive_awards,availability_plans,surge_rules,ride_offer_events FROM anon,authenticated;
