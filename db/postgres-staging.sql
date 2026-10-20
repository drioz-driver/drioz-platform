CREATE SCHEMA drioz_staging;

REVOKE ALL ON SCHEMA drioz_staging FROM PUBLIC;

SET LOCAL search_path=drioz_staging;

CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'customer' NOT NULL,
	"disabled" bigint DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL
);

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "cities" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"enabled" bigint DEFAULT 0 NOT NULL,
	"base" bigint NOT NULL,
	"hourly" bigint NOT NULL,
	"night" bigint DEFAULT 0 NOT NULL,
	"tax_bps" bigint DEFAULT 0 NOT NULL,
	"commission_bps" bigint DEFAULT 2000 NOT NULL,
	"cancellation" bigint DEFAULT 0 NOT NULL,
	"zones" text DEFAULT '[]' NOT NULL
);

ALTER TABLE "cities" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "drivers" (
	"user_id" text PRIMARY KEY NOT NULL,
	"city_id" text NOT NULL,
	"phone" text NOT NULL,
	"licence" text NOT NULL,
	"licence_expiry" text NOT NULL,
	"verification" text DEFAULT 'pending' NOT NULL,
	"review_note" text DEFAULT '' NOT NULL,
	"online" bigint DEFAULT 0 NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"location_at" bigint,
	"updated_at" bigint NOT NULL,
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON UPDATE no action ON DELETE no action
);

ALTER TABLE "drivers" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"driver_id" text,
	"city_id" text NOT NULL,
	"pickup" text NOT NULL,
	"destination" text NOT NULL,
	"pickup_lat" double precision NOT NULL,
	"pickup_lng" double precision NOT NULL,
	"destination_lat" double precision NOT NULL,
	"destination_lng" double precision NOT NULL,
	"trip_type" text NOT NULL,
	"transmission" text NOT NULL,
	"scheduled_at" bigint,
	"status" text DEFAULT 'requested' NOT NULL,
	"fare" bigint NOT NULL,
	"partner_fare" bigint NOT NULL,
	"breakdown" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("driver_id") REFERENCES "drivers"("user_id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON UPDATE no action ON DELETE no action
);

ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "audit" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"target" text NOT NULL,
	"action" text NOT NULL,
	"details" text DEFAULT '{}' NOT NULL,
	"created_at" bigint NOT NULL
);

ALTER TABLE "audit" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"kind" text NOT NULL,
	"object_key" text NOT NULL,
	"mime" text NOT NULL,
	"size" bigint NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" bigint NOT NULL,
	FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action
);

ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"message" text NOT NULL,
	"read" bigint DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL
);

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"amount" bigint NOT NULL,
	"method" text NOT NULL,
	"reference" text NOT NULL,
	"status" text NOT NULL,
	"created_at" bigint NOT NULL,
	FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON UPDATE no action ON DELETE no action
);

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "payouts" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"driver_id" text NOT NULL,
	"amount" bigint NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reference" text,
	"created_at" bigint NOT NULL,
	FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON UPDATE no action ON DELETE no action
);

ALTER TABLE "payouts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "pins" (
	"booking_id" text PRIMARY KEY NOT NULL,
	"hash" text NOT NULL,
	"expires_at" bigint NOT NULL,
	"attempts" bigint DEFAULT 0 NOT NULL,
	FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON UPDATE no action ON DELETE no action
);

ALTER TABLE "pins" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"data" text NOT NULL,
	"expires_at" bigint NOT NULL
);

ALTER TABLE "quotes" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"hits" bigint NOT NULL,
	"expires_at" bigint NOT NULL
);

ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"booking_id" text,
	"category" text NOT NULL,
	"subject" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" bigint NOT NULL,
	FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON UPDATE no action ON DELETE no action
);

ALTER TABLE "tickets" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "replies" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"user_id" text NOT NULL,
	"message" text NOT NULL,
	"created_at" bigint NOT NULL,
	FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON UPDATE no action ON DELETE no action
);

ALTER TABLE "replies" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "shares" (
	"hash" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"expires_at" bigint NOT NULL
);

ALTER TABLE "shares" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "location_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"city_id" text NOT NULL,
	"data" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" bigint NOT NULL,
	FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON UPDATE no action ON DELETE no action
);

ALTER TABLE "location_requests" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "auth_recovery" (
	"hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" bigint NOT NULL
);

ALTER TABLE "auth_recovery" ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX "customer_request" ON "bookings" ("customer_id","idempotency_key");

CREATE INDEX "city_status" ON "bookings" ("city_id","status","created_at");

CREATE UNIQUE INDEX "payment_ref" ON "payments" ("reference");

CREATE UNIQUE INDEX "payout_booking" ON "payouts" ("booking_id");

CREATE UNIQUE INDEX one_active_driver ON bookings(driver_id) WHERE driver_id IS NOT NULL AND status IN ('assigned','arrived','in_progress');

CREATE UNIQUE INDEX "location_request_retry" ON "location_requests" ("customer_id","idempotency_key");
