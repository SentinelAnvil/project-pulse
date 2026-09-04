CREATE TABLE `calendar_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`category` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`start_minutes` integer NOT NULL,
	`end_minutes` integer NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_calendar_blocks_owner_day` ON `calendar_blocks` (`owner_id`,`day_of_week`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_calendar_blocks_exact_unique` ON `calendar_blocks` (`owner_id`,`day_of_week`,`start_minutes`,`end_minutes`,`title`,`category`);--> statement-breakpoint
CREATE TABLE `calendar_settings` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
