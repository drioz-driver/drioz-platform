CREATE TABLE `auth_recovery` (
	`hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL
);
