ALTER TABLE `box_items` ADD `quantity` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `box_items` ADD `category` varchar(80);--> statement-breakpoint
ALTER TABLE `boxes` ADD `number` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `boxes` ADD `color` enum('blue','orange','green','purple') DEFAULT 'blue' NOT NULL;--> statement-breakpoint
UPDATE `boxes` b JOIN (SELECT `id`, ROW_NUMBER() OVER (PARTITION BY `household_id` ORDER BY `created_at`, `id`) AS rn FROM `boxes`) x ON x.`id` = b.`id` SET b.`number` = x.rn, b.`color` = ELT(((x.rn - 1) MOD 4) + 1, 'blue', 'orange', 'green', 'purple');--> statement-breakpoint
ALTER TABLE `boxes` ADD CONSTRAINT `boxes_hh_number_uq` UNIQUE(`household_id`,`number`);
