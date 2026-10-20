CREATE TABLE `location_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`city_id` text NOT NULL,
	`data` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`idempotency_key` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `location_request_retry` ON `location_requests` (`customer_id`,`idempotency_key`);