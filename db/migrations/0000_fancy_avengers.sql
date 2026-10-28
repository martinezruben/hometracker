CREATE TABLE `appliances` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`created_by` char(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	`name` varchar(160) NOT NULL,
	`brand` varchar(120),
	`model` varchar(120),
	`serial` varchar(120),
	`location` varchar(160),
	`purchase_date` datetime,
	`warranty_until` datetime,
	`manual_key` varchar(500),
	`notes` text,
	CONSTRAINT `appliances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `box_items` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`created_by` char(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	`box_id` char(36) NOT NULL,
	`title` varchar(200) NOT NULL,
	`notes` text,
	CONSTRAINT `box_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `boxes` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`created_by` char(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	`name` varchar(160) NOT NULL,
	`location` varchar(160),
	`notes` text,
	CONSTRAINT `boxes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`created_by` char(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	`name` varchar(160) NOT NULL,
	`category` varchar(80),
	`phone` varchar(40),
	`email` varchar(255),
	`rating` int,
	`notes` text,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`created_by` char(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	`kind` enum('invoice','receipt','contract','warranty','other') NOT NULL,
	`title` varchar(200) NOT NULL,
	`issued_at` datetime,
	`expires_at` datetime,
	`amount` decimal(12,2),
	`file_key` varchar(500),
	`provider_id` char(36),
	`appliance_id` char(36),
	`notes` text,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`created_by` char(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	`title` varchar(200) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`spent_at` datetime NOT NULL,
	`category` varchar(80),
	`receipt_key` varchar(500),
	`provider_id` char(36),
	`notes` text,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `household_members` (
	`household_id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`role` enum('admin','member','viewer') NOT NULL DEFAULT 'member',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `household_members_household_id_user_id_pk` PRIMARY KEY(`household_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `households` (
	`id` char(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`created_by` char(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `households_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`token_hash` char(64) NOT NULL,
	`role` enum('admin','member','viewer') NOT NULL DEFAULT 'member',
	`email` varchar(255),
	`expires_at` datetime(3) NOT NULL,
	`accepted_at` datetime(3),
	`created_by` char(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `inv_token_uq` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `list_items` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`created_by` char(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	`list_id` char(36) NOT NULL,
	`title` varchar(200) NOT NULL,
	`quantity` varchar(40),
	`price` decimal(12,2),
	`status` enum('pending','done','available','sold') NOT NULL DEFAULT 'pending',
	`checked` boolean NOT NULL DEFAULT false,
	`notes` text,
	CONSTRAINT `list_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lists` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`created_by` char(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	`name` varchar(160) NOT NULL,
	`type` enum('shopping','sale','general') NOT NULL DEFAULT 'general',
	CONSTRAINT `lists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_logs` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`created_by` char(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	`appliance_id` char(36) NOT NULL,
	`plan_id` char(36),
	`done_at` datetime(3) NOT NULL,
	`cost` decimal(12,2),
	`provider_id` char(36),
	`notes` text,
	CONSTRAINT `maintenance_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_plans` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`created_by` char(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	`appliance_id` char(36) NOT NULL,
	`title` varchar(200) NOT NULL,
	`interval_value` int NOT NULL,
	`interval_unit` enum('day','week','month','year') NOT NULL,
	`next_due` datetime(3) NOT NULL,
	`remind_days_before` int NOT NULL DEFAULT 7,
	`assigned_to` char(36),
	`active` boolean NOT NULL DEFAULT true,
	`notes` text,
	CONSTRAINT `maintenance_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `otp_codes` (
	`id` char(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`code_hash` char(64) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`expires_at` datetime(3) NOT NULL,
	`consumed_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `otp_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `photos` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`created_by` char(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	`entity_type` enum('box','box_item','appliance','list_item','document','expense') NOT NULL,
	`entity_id` char(36) NOT NULL,
	`storage_key` varchar(500) NOT NULL,
	`thumb_key` varchar(500),
	`mime_type` varchar(100) NOT NULL,
	`size_bytes` int,
	`width` int,
	`height` int,
	`caption` varchar(300),
	CONSTRAINT `photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`endpoint_hash` char(64) NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` varchar(255) NOT NULL,
	`auth` varchar(255) NOT NULL,
	`user_agent` varchar(255),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `push_endpoint_uq` UNIQUE(`endpoint_hash`)
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`entity_type` varchar(40) NOT NULL,
	`entity_id` char(36) NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` varchar(500),
	`url` varchar(300),
	`fire_at` datetime(3) NOT NULL,
	`sent_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `reminders_id` PRIMARY KEY(`id`),
	CONSTRAINT `rem_dedupe_uq` UNIQUE(`user_id`,`entity_type`,`entity_id`,`fire_at`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` char(64) NOT NULL,
	`user_id` char(36) NOT NULL,
	`user_agent` varchar(255),
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`created_by` char(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	`title` varchar(200) NOT NULL,
	`notes` text,
	`due_at` datetime(3),
	`repeat_rule` varchar(120),
	`assigned_to` char(36),
	`done_at` datetime(3),
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` char(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(120),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_uq` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `appliances` ADD CONSTRAINT `appliances_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `box_items` ADD CONSTRAINT `box_items_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `box_items` ADD CONSTRAINT `box_items_box_id_boxes_id_fk` FOREIGN KEY (`box_id`) REFERENCES `boxes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `boxes` ADD CONSTRAINT `boxes_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_provider_id_contacts_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `contacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_appliance_id_appliances_id_fk` FOREIGN KEY (`appliance_id`) REFERENCES `appliances`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_provider_id_contacts_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `contacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `household_members` ADD CONSTRAINT `household_members_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `household_members` ADD CONSTRAINT `household_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `list_items` ADD CONSTRAINT `list_items_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `list_items` ADD CONSTRAINT `list_items_list_id_lists_id_fk` FOREIGN KEY (`list_id`) REFERENCES `lists`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lists` ADD CONSTRAINT `lists_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_logs` ADD CONSTRAINT `maintenance_logs_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_logs` ADD CONSTRAINT `maintenance_logs_appliance_id_appliances_id_fk` FOREIGN KEY (`appliance_id`) REFERENCES `appliances`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_logs` ADD CONSTRAINT `maintenance_logs_plan_id_maintenance_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `maintenance_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_logs` ADD CONSTRAINT `maintenance_logs_provider_id_contacts_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `contacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_plans` ADD CONSTRAINT `maintenance_plans_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_plans` ADD CONSTRAINT `maintenance_plans_appliance_id_appliances_id_fk` FOREIGN KEY (`appliance_id`) REFERENCES `appliances`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `photos` ADD CONSTRAINT `photos_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `push_subscriptions` ADD CONSTRAINT `push_subscriptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reminders` ADD CONSTRAINT `reminders_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `appliances_hh_idx` ON `appliances` (`household_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `box_items_box_idx` ON `box_items` (`box_id`);--> statement-breakpoint
CREATE INDEX `boxes_hh_idx` ON `boxes` (`household_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `contacts_hh_idx` ON `contacts` (`household_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `docs_hh_idx` ON `documents` (`household_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `docs_exp_idx` ON `documents` (`expires_at`);--> statement-breakpoint
CREATE INDEX `exp_hh_idx` ON `expenses` (`household_id`,`spent_at`);--> statement-breakpoint
CREATE INDEX `hm_user_idx` ON `household_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `li_list_idx` ON `list_items` (`list_id`);--> statement-breakpoint
CREATE INDEX `lists_hh_idx` ON `lists` (`household_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `ml_appliance_idx` ON `maintenance_logs` (`appliance_id`,`done_at`);--> statement-breakpoint
CREATE INDEX `mp_appliance_idx` ON `maintenance_plans` (`appliance_id`);--> statement-breakpoint
CREATE INDEX `mp_due_idx` ON `maintenance_plans` (`active`,`next_due`);--> statement-breakpoint
CREATE INDEX `otp_email_idx` ON `otp_codes` (`email`,`created_at`);--> statement-breakpoint
CREATE INDEX `photos_entity_idx` ON `photos` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `push_user_idx` ON `push_subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `rem_due_idx` ON `reminders` (`sent_at`,`fire_at`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `tasks_hh_idx` ON `tasks` (`household_id`,`done_at`,`due_at`);