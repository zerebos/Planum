CREATE TABLE `command_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`context_id` text NOT NULL,
	`command_name` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `command_stats_context_cmd_idx` ON `command_stats` (`context_id`,`command_name`);--> statement-breakpoint
CREATE INDEX `command_stats_context_idx` ON `command_stats` (`context_id`);--> statement-breakpoint
CREATE TABLE `guild_configs` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`ignored_roles` text DEFAULT '[]' NOT NULL,
	`ignored_channels` text DEFAULT '[]' NOT NULL,
	`level_up_message` text,
	`should_dm` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `guild_rewards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`level` integer NOT NULL,
	`role_id` text NOT NULL,
	`remove_previous` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guild_rewards_guild_role_idx` ON `guild_rewards` (`guild_id`,`role_id`);--> statement-breakpoint
CREATE INDEX `guild_rewards_guild_idx` ON `guild_rewards` (`guild_id`);--> statement-breakpoint
CREATE TABLE `user_levels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`user_id` text NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`level` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_levels_guild_user_idx` ON `user_levels` (`guild_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `user_levels_guild_xp_idx` ON `user_levels` (`guild_id`,`xp`);