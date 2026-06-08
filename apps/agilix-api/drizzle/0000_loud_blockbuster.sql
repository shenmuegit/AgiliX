CREATE TABLE `doc_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`doc_id` text NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`resolved` integer NOT NULL,
	`created_at_label` text NOT NULL,
	FOREIGN KEY (`doc_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `doc_issue_links` (
	`doc_id` text NOT NULL,
	`issue_key` text NOT NULL,
	FOREIGN KEY (`doc_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`issue_key`) REFERENCES `issues`(`key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `doc_issue_links_unique` ON `doc_issue_links` (`doc_id`,`issue_key`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`project_id` text,
	`title` text NOT NULL,
	`directory` text NOT NULL,
	`body` text NOT NULL,
	`updated_at_label` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `documents_project` ON `documents` (`project_id`);--> statement-breakpoint
CREATE TABLE `feishu_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`trigger` text NOT NULL,
	`target_group` text NOT NULL,
	`payload_json` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `feishu_queries` (
	`id` text PRIMARY KEY NOT NULL,
	`command` text NOT NULL,
	`response_title` text NOT NULL,
	`response_body_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `issue_events` (
	`id` text PRIMARY KEY NOT NULL,
	`issue_key` text NOT NULL,
	`type` text NOT NULL,
	`actor_id` text,
	`message` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`issue_key`) REFERENCES `issues`(`key`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `issues` (
	`key` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`iteration_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`priority` text NOT NULL,
	`assignee_id` text NOT NULL,
	`story_points` integer NOT NULL,
	`blocker_reason` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`iteration_id`) REFERENCES `iterations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignee_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `issues_project_status` ON `issues` (`project_id`,`status`);--> statement-breakpoint
CREATE INDEX `issues_assignee` ON `issues` (`assignee_id`);--> statement-breakpoint
CREATE TABLE `iterations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`day` integer NOT NULL,
	`total_days` integer NOT NULL,
	`goal` text NOT NULL,
	`velocity` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `iterations_project_code` ON `iterations` (`project_id`,`code`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`capacity` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`iteration_id` text NOT NULL,
	`title` text NOT NULL,
	`start_day` integer NOT NULL,
	`end_day` integer NOT NULL,
	`status` text NOT NULL,
	`owner_id` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`iteration_id`) REFERENCES `iterations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`glyph` text NOT NULL,
	`color` text NOT NULL,
	`active_iteration_code` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `standup_items` (
	`id` text PRIMARY KEY NOT NULL,
	`standup_id` text NOT NULL,
	`member_id` text NOT NULL,
	`yesterday_json` text NOT NULL,
	`today_json` text NOT NULL,
	`blockers_json` text NOT NULL,
	FOREIGN KEY (`standup_id`) REFERENCES `standups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `standups` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`date_label` text NOT NULL,
	`time_label` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
