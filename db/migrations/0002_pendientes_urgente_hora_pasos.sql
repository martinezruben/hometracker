CREATE TABLE `task_steps` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`created_by` char(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	`task_id` char(36) NOT NULL,
	`title` varchar(200) NOT NULL,
	`done` boolean NOT NULL DEFAULT false,
	CONSTRAINT `task_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `urgent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `due_time` varchar(5);--> statement-breakpoint
ALTER TABLE `tasks` ADD `category` varchar(80);--> statement-breakpoint
ALTER TABLE `tasks` ADD `done_by` char(36);--> statement-breakpoint
ALTER TABLE `task_steps` ADD CONSTRAINT `task_steps_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_steps` ADD CONSTRAINT `task_steps_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `task_steps_task_idx` ON `task_steps` (`task_id`);