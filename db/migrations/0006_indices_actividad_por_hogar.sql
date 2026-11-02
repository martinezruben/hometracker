CREATE INDEX `box_items_hh_idx` ON `box_items` (`household_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ml_hh_idx` ON `maintenance_logs` (`household_id`,`done_at`);