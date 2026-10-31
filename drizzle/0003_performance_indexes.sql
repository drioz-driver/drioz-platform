CREATE INDEX IF NOT EXISTS `notifications_user_created` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tickets_user_created` ON `tickets` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `replies_ticket_created` ON `replies` (`ticket_id`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `documents_owner_created` ON `documents` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `drivers_city_verification` ON `drivers` (`city_id`,`verification`,`online`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `bookings_customer_created` ON `bookings` (`customer_id`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `bookings_driver_status` ON `bookings` (`driver_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `payments_booking` ON `payments` (`booking_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `payouts_driver_created` ON `payouts` (`driver_id`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `audit_created` ON `audit` (`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `audit_target_action` ON `audit` (`target`,`action`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `rate_limits_expiry` ON `rate_limits` (`expires_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `location_requests_status` ON `location_requests` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `shares_expiry` ON `shares` (`expires_at`);
