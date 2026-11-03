CREATE TABLE `ai_settings` (
	`household_id` char(36) NOT NULL,
	`api_key_enc` varchar(700),
	`api_key_last4` char(4),
	`model` varchar(60) NOT NULL DEFAULT 'claude-sonnet-5-5',
	`updated_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `ai_settings_household_id` PRIMARY KEY(`household_id`)
);
--> statement-breakpoint
ALTER TABLE `ai_settings` ADD CONSTRAINT `ai_settings_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;