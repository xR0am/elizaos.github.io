ALTER TABLE `pr_reviews` RENAME COLUMN "submitted_at" TO "created_at";--> statement-breakpoint
CREATE INDEX `idx_pr_reviews_author_date` ON `pr_reviews` (`author`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_pr_reviews_state` ON `pr_reviews` (`state`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_repositories` (
	`repo_id` text PRIMARY KEY NOT NULL,
	`last_fetched_at` text DEFAULT '',
	`last_updated` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_repositories`("repo_id", "last_fetched_at", "last_updated") SELECT "repo_id", "last_fetched_at", "last_updated" FROM `repositories`;--> statement-breakpoint
DROP TABLE `repositories`;--> statement-breakpoint
ALTER TABLE `__new_repositories` RENAME TO `repositories`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_issue_comments_author_date` ON `issue_comments` (`author`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_pr_comments_author_date` ON `pr_comments` (`author`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_raw_commits_repo_author_date` ON `raw_commits` (`repository`,`author`,`committed_date`);--> statement-breakpoint
CREATE INDEX `idx_raw_issues_repo_author_date` ON `raw_issues` (`repository`,`author`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_raw_issues_state` ON `raw_issues` (`state`);--> statement-breakpoint
CREATE INDEX `idx_raw_prs_repo_author_date` ON `raw_pull_requests` (`repository`,`author`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_raw_prs_state` ON `raw_pull_requests` (`state`);--> statement-breakpoint
CREATE INDEX `idx_raw_prs_merged` ON `raw_pull_requests` (`merged`);--> statement-breakpoint
CREATE INDEX `idx_user_daily_summaries_username_date` ON `user_daily_summaries` (`username`,`date`);--> statement-breakpoint
CREATE INDEX `idx_user_daily_summaries_score` ON `user_daily_summaries` (`score`);--> statement-breakpoint
CREATE INDEX `idx_user_stats_total_prs` ON `user_stats` (`total_prs`);--> statement-breakpoint
CREATE INDEX `idx_user_stats_last_updated` ON `user_stats` (`last_updated`);--> statement-breakpoint
CREATE INDEX `idx_user_tag_scores_tag` ON `user_tag_scores` (`tag`);--> statement-breakpoint
CREATE INDEX `idx_user_tag_scores_score` ON `user_tag_scores` (`score`);--> statement-breakpoint
CREATE INDEX `idx_user_tag_scores_username_tag` ON `user_tag_scores` (`username`,`tag`);--> statement-breakpoint
CREATE INDEX `idx_users_score` ON `users` (`score`);