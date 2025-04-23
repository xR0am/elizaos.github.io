CREATE TABLE `issue_comment_reactions` (
	`id` text PRIMARY KEY NOT NULL,
	`comment_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	`user` text,
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`comment_id`) REFERENCES `issue_comments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_issue_comment_reactions_comment_id` ON `issue_comment_reactions` (`comment_id`);--> statement-breakpoint
CREATE INDEX `idx_issue_comment_reactions_user` ON `issue_comment_reactions` (`user`);--> statement-breakpoint
CREATE INDEX `idx_issue_comment_reactions_content` ON `issue_comment_reactions` (`content`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_issue_comment_reaction_user_content` ON `issue_comment_reactions` (`comment_id`,`user`,`content`);--> statement-breakpoint
CREATE TABLE `issue_reactions` (
	`id` text PRIMARY KEY NOT NULL,
	`issue_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	`user` text,
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`issue_id`) REFERENCES `raw_issues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_issue_reactions_issue_id` ON `issue_reactions` (`issue_id`);--> statement-breakpoint
CREATE INDEX `idx_issue_reactions_user` ON `issue_reactions` (`user`);--> statement-breakpoint
CREATE INDEX `idx_issue_reactions_content` ON `issue_reactions` (`content`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_issue_reaction_user_content` ON `issue_reactions` (`issue_id`,`user`,`content`);--> statement-breakpoint
CREATE TABLE `pr_closing_issue_references` (
	`id` text PRIMARY KEY NOT NULL,
	`pr_id` text NOT NULL,
	`issue_id` text NOT NULL,
	`issue_number` integer NOT NULL,
	`issue_title` text NOT NULL,
	`issue_state` text NOT NULL,
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`pr_id`) REFERENCES `raw_pull_requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`issue_id`) REFERENCES `raw_issues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_pr_closing_issue_refs_pr_id` ON `pr_closing_issue_references` (`pr_id`);--> statement-breakpoint
CREATE INDEX `idx_pr_closing_issue_refs_issue_id` ON `pr_closing_issue_references` (`issue_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_pr_closing_issue_ref` ON `pr_closing_issue_references` (`pr_id`,`issue_id`);--> statement-breakpoint
CREATE TABLE `pr_comment_reactions` (
	`id` text PRIMARY KEY NOT NULL,
	`comment_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	`user` text,
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`comment_id`) REFERENCES `pr_comments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_pr_comment_reactions_comment_id` ON `pr_comment_reactions` (`comment_id`);--> statement-breakpoint
CREATE INDEX `idx_pr_comment_reactions_user` ON `pr_comment_reactions` (`user`);--> statement-breakpoint
CREATE INDEX `idx_pr_comment_reactions_content` ON `pr_comment_reactions` (`content`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_pr_comment_reaction_user_content` ON `pr_comment_reactions` (`comment_id`,`user`,`content`);--> statement-breakpoint
CREATE TABLE `pr_reactions` (
	`id` text PRIMARY KEY NOT NULL,
	`pr_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	`user` text,
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`pr_id`) REFERENCES `raw_pull_requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_pr_reactions_pr_id` ON `pr_reactions` (`pr_id`);--> statement-breakpoint
CREATE INDEX `idx_pr_reactions_user` ON `pr_reactions` (`user`);--> statement-breakpoint
CREATE INDEX `idx_pr_reactions_content` ON `pr_reactions` (`content`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_pr_reaction_user_content` ON `pr_reactions` (`pr_id`,`user`,`content`);--> statement-breakpoint
CREATE TABLE `tag_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text DEFAULT '',
	`patterns` text DEFAULT '[]' NOT NULL,
	`weight` real DEFAULT 1 NOT NULL,
	`dependencies` text DEFAULT '[]',
	`enabled` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tag_rules_name_unique` ON `tag_rules` (`name`);--> statement-breakpoint
CREATE INDEX `idx_tag_rules_name` ON `tag_rules` (`name`);--> statement-breakpoint
CREATE INDEX `idx_tag_rules_category` ON `tag_rules` (`category`);--> statement-breakpoint
CREATE INDEX `idx_tag_rules_enabled` ON `tag_rules` (`enabled`);--> statement-breakpoint
DROP INDEX `idx_pr_reviews_state`;--> statement-breakpoint
ALTER TABLE `user_tag_scores` ADD `score_snapshots` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `user_tag_scores` ADD `activity_log` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `user_tag_scores` ADD `last_activity_date` text;--> statement-breakpoint
ALTER TABLE `user_tag_scores` ADD `first_activity_date` text;--> statement-breakpoint
ALTER TABLE `user_tag_scores` ADD `streak_days` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user_tag_scores` ADD `total_actions` integer DEFAULT 0;--> statement-breakpoint
CREATE INDEX `idx_user_tag_scores_last_activity` ON `user_tag_scores` (`last_activity_date`);--> statement-breakpoint
CREATE INDEX `idx_user_tag_scores_first_activity` ON `user_tag_scores` (`first_activity_date`);