-- Private application schema: never exposed through the public Data API.
SET LOCAL search_path=drioz_staging;
CREATE TABLE wallet_accounts (
 user_id text NOT NULL REFERENCES users(id), mode text NOT NULL CHECK(mode IN ('test','live')),
 balance bigint NOT NULL DEFAULT 0 CHECK(balance>=0), updated_at bigint NOT NULL,
 PRIMARY KEY(user_id,mode)
);
CREATE TABLE gateway_orders (
 id text PRIMARY KEY, customer_id text NOT NULL REFERENCES users(id), mode text NOT NULL CHECK(mode IN ('test','live')),
 purpose text NOT NULL CHECK(purpose IN ('topup','booking')), booking_id text REFERENCES bookings(id),
 amount bigint NOT NULL CHECK(amount>=100), currency text NOT NULL CHECK(currency='INR'),
 request_key text NOT NULL, receipt text NOT NULL UNIQUE, external_id text UNIQUE,
 status text NOT NULL DEFAULT 'creating' CHECK(status IN ('creating','created','pending','credited','failed')),
 payment_id text UNIQUE, created_at bigint NOT NULL, updated_at bigint NOT NULL,
 UNIQUE(customer_id,mode,request_key)
);
CREATE TABLE wallet_entries (
 id text PRIMARY KEY, user_id text NOT NULL, mode text NOT NULL, amount bigint NOT NULL CHECK(amount<>0),
 kind text NOT NULL CHECK(kind IN ('topup','trip_payment')), order_id text UNIQUE REFERENCES gateway_orders(id),
 booking_id text REFERENCES bookings(id), request_key text, created_at bigint NOT NULL,
 FOREIGN KEY(user_id,mode) REFERENCES wallet_accounts(user_id,mode), UNIQUE(user_id,mode,request_key)
);
CREATE TABLE gateway_payments (
 id text PRIMARY KEY, customer_id text NOT NULL REFERENCES users(id), mode text NOT NULL CHECK(mode IN ('test','live')),
 booking_id text NOT NULL REFERENCES bookings(id), amount bigint NOT NULL CHECK(amount>0),
 wallet_entry_id text NOT NULL UNIQUE REFERENCES wallet_entries(id), created_at bigint NOT NULL
);
CREATE INDEX wallet_history_owner ON wallet_entries(user_id,mode,created_at DESC);
CREATE INDEX gateway_order_owner ON gateway_orders(customer_id,mode,created_at DESC);
CREATE INDEX gateway_payment_booking ON gateway_payments(booking_id,mode);
ALTER TABLE wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gateway_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE gateway_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON wallet_accounts,gateway_orders,wallet_entries,gateway_payments FROM PUBLIC,anon,authenticated;
