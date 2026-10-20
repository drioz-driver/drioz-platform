CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`target` text NOT NULL,
	`action` text NOT NULL,
	`details` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`driver_id` text,
	`city_id` text NOT NULL,
	`pickup` text NOT NULL,
	`destination` text NOT NULL,
	`pickup_lat` real NOT NULL,
	`pickup_lng` real NOT NULL,
	`destination_lat` real NOT NULL,
	`destination_lng` real NOT NULL,
	`trip_type` text NOT NULL,
	`transmission` text NOT NULL,
	`scheduled_at` integer,
	`status` text DEFAULT 'requested' NOT NULL,
	`fare` integer NOT NULL,
	`partner_fare` integer NOT NULL,
	`breakdown` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`user_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_request` ON `bookings` (`customer_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `city_status` ON `bookings` (`city_id`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `cities` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`base` integer NOT NULL,
	`hourly` integer NOT NULL,
	`night` integer DEFAULT 0 NOT NULL,
	`tax_bps` integer DEFAULT 0 NOT NULL,
	`commission_bps` integer DEFAULT 2000 NOT NULL,
	`cancellation` integer DEFAULT 0 NOT NULL,
	`zones` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`object_key` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `drivers` (
	`user_id` text PRIMARY KEY NOT NULL,
	`city_id` text NOT NULL,
	`phone` text NOT NULL,
	`licence` text NOT NULL,
	`licence_expiry` text NOT NULL,
	`verification` text DEFAULT 'pending' NOT NULL,
	`review_note` text DEFAULT '' NOT NULL,
	`online` integer DEFAULT 0 NOT NULL,
	`lat` real,
	`lng` real,
	`location_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`message` text NOT NULL,
	`read` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`amount` integer NOT NULL,
	`method` text NOT NULL,
	`reference` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_ref` ON `payments` (`reference`);--> statement-breakpoint
CREATE TABLE `payouts` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`driver_id` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reference` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payout_booking` ON `payouts` (`booking_id`);--> statement-breakpoint
CREATE TABLE `pins` (
	`booking_id` text PRIMARY KEY NOT NULL,
	`hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`data` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`hits` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `replies` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` text NOT NULL,
	`user_id` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shares` (
	`hash` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`booking_id` text,
	`category` text NOT NULL,
	`subject` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'customer' NOT NULL,
	`disabled` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX one_active_driver ON bookings(driver_id) WHERE driver_id IS NOT NULL AND status IN ('assigned','arrived','in_progress');
