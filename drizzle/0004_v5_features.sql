ALTER TABLE `users` ADD `phone` text;--> statement-breakpoint
ALTER TABLE `users` ADD `company_id` text;--> statement-breakpoint
ALTER TABLE `drivers` ADD `gps_flags` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `drivers` ADD `date_of_birth` text;--> statement-breakpoint
ALTER TABLE `drivers` ADD `kyc_status` text DEFAULT 'not_run' NOT NULL;--> statement-breakpoint
ALTER TABLE `drivers` ADD `kyc_result` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `company_id` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `extras` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `cancellation_fee` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `assigned_at` integer;--> statement-breakpoint
ALTER TABLE `bookings` ADD `started_at` integer;--> statement-breakpoint
ALTER TABLE `bookings` ADD `completed_at` integer;--> statement-breakpoint
CREATE TABLE `ratings` (
	`booking_id` text NOT NULL REFERENCES `bookings`(`id`),
	`rater_id` text NOT NULL REFERENCES `users`(`id`),
	`ratee_id` text NOT NULL REFERENCES `users`(`id`),
	`by_role` text NOT NULL,
	`stars` integer NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY (`booking_id`,`rater_id`)
);--> statement-breakpoint
CREATE INDEX `ratings_ratee` ON `ratings` (`ratee_id`,`by_role`);--> statement-breakpoint
CREATE TABLE `inspections` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL REFERENCES `bookings`(`id`),
	`driver_id` text NOT NULL REFERENCES `users`(`id`),
	`phase` text NOT NULL,
	`checklist` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`photos` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `inspection_phase` ON `inspections` (`booking_id`,`phase`);--> statement-breakpoint
CREATE TABLE `saved_places` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL REFERENCES `users`(`id`),
	`label` text NOT NULL,
	`address` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`created_at` integer NOT NULL
);--> statement-breakpoint
CREATE INDEX `saved_places_user` ON `saved_places` (`user_id`);--> statement-breakpoint
CREATE TABLE `push_tokens` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL REFERENCES `users`(`id`),
	`app` text NOT NULL,
	`platform` text NOT NULL,
	`updated_at` integer NOT NULL
);--> statement-breakpoint
CREATE INDEX `push_tokens_user` ON `push_tokens` (`user_id`,`app`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`booking_id` text PRIMARY KEY NOT NULL REFERENCES `bookings`(`id`),
	`number` text NOT NULL,
	`issued_at` integer NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `invoice_number` ON `invoices` (`number`);--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`gstin` text DEFAULT '' NOT NULL,
	`billing_email` text NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);--> statement-breakpoint
CREATE TABLE `incentives` (
	`id` text PRIMARY KEY NOT NULL,
	`city_id` text,
	`title` text NOT NULL,
	`target_trips` integer NOT NULL,
	`bonus` integer NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);--> statement-breakpoint
CREATE TABLE `incentive_awards` (
	`id` text PRIMARY KEY NOT NULL,
	`incentive_id` text NOT NULL REFERENCES `incentives`(`id`),
	`driver_id` text NOT NULL REFERENCES `users`(`id`),
	`amount` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reference` text,
	`created_at` integer NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `incentive_award_once` ON `incentive_awards` (`incentive_id`,`driver_id`);--> statement-breakpoint
CREATE TABLE `availability_plans` (
	`driver_id` text NOT NULL REFERENCES `users`(`id`),
	`day` text NOT NULL,
	`start_min` integer NOT NULL,
	`end_min` integer NOT NULL,
	`off` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY (`driver_id`,`day`)
);--> statement-breakpoint
CREATE INDEX `availability_day` ON `availability_plans` (`day`);--> statement-breakpoint
CREATE TABLE `surge_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`city_id` text NOT NULL REFERENCES `cities`(`id`),
	`label` text NOT NULL,
	`multiplier_bps` integer NOT NULL,
	`days` integer DEFAULT 127 NOT NULL,
	`start_min` integer NOT NULL,
	`end_min` integer NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);--> statement-breakpoint
CREATE INDEX `surge_city` ON `surge_rules` (`city_id`,`active`);--> statement-breakpoint
CREATE INDEX `bookings_completed` ON `bookings` (`driver_id`,`completed_at`);--> statement-breakpoint
CREATE INDEX `bookings_company` ON `bookings` (`company_id`,`created_at`);
--> statement-breakpoint
CREATE TABLE `ride_offer_events` (
	`offer_id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL REFERENCES `bookings`(`id`),
	`driver_id` text NOT NULL,
	`attempt` integer NOT NULL,
	`offered_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`outcome` text,
	`responded_at` integer
);--> statement-breakpoint
CREATE INDEX `ride_offer_events_offered` ON `ride_offer_events` (`offered_at`);--> statement-breakpoint
CREATE INDEX `ride_offer_events_driver` ON `ride_offer_events` (`driver_id`,`offered_at`);
