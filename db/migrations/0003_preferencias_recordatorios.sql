CREATE TABLE `notification_prefs` (
	`user_id` char(36) NOT NULL,
	`type` enum('maintenance','warranty','tasks','weekly') NOT NULL,
	`enabled` boolean NOT NULL,
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `notification_prefs_user_id_type_pk` PRIMARY KEY(`user_id`,`type`)
);
--> statement-breakpoint
ALTER TABLE `notification_prefs` ADD CONSTRAINT `notification_prefs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;