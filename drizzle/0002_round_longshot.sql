CREATE TABLE `task_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`source_block_id` text,
	`scheduled_date` text NOT NULL,
	`start_minutes` integer NOT NULL,
	`end_minutes` integer NOT NULL,
	`timezone` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_task_schedules_task_unique` ON `task_schedules` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_task_schedules_owner_date` ON `task_schedules` (`owner_id`,`scheduled_date`);