ALTER TABLE `users` ADD `password_hash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `failed_logins` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `locked_until` datetime(3);