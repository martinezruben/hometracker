CREATE TABLE `appliance_invoices` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`created_by` char(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	`appliance_id` char(36) NOT NULL,
	`file_key` varchar(500) NOT NULL,
	`mime` varchar(60) NOT NULL,
	`size` int NOT NULL DEFAULT 0,
	CONSTRAINT `appliance_invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `appliance_invoices` ADD CONSTRAINT `appliance_invoices_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appliance_invoices` ADD CONSTRAINT `appliance_invoices_appliance_id_appliances_id_fk` FOREIGN KEY (`appliance_id`) REFERENCES `appliances`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `appliance_invoices_appliance_idx` ON `appliance_invoices` (`appliance_id`,`deleted_at`);