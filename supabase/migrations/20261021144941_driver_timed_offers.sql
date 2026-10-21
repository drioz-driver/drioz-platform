SET LOCAL search_path=drioz_staging;
CREATE TABLE ride_offer_presence(
 driver_id text PRIMARY KEY REFERENCES drivers(user_id), seen_at bigint NOT NULL
);
CREATE TABLE ride_offers(
 booking_id text PRIMARY KEY REFERENCES bookings(id),
 driver_id text NOT NULL REFERENCES drivers(user_id),
 offer_id text NOT NULL UNIQUE,
 offered_at bigint NOT NULL, expires_at bigint NOT NULL,
 attempt integer NOT NULL DEFAULT 1 CHECK(attempt>0),
 state text NOT NULL CHECK(state IN ('offered','passed','accepted')),
 CHECK(expires_at>=offered_at)
);
CREATE INDEX ride_offers_driver_expiry ON ride_offers(driver_id,expires_at) WHERE state='offered';
ALTER TABLE ride_offer_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_offers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ride_offer_presence,ride_offers FROM anon,authenticated;
