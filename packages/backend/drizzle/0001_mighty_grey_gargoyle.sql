ALTER TABLE `issues` ADD `external_issue_id` text;--> statement-breakpoint
ALTER TABLE `issues` ADD `external_issue_url` text;--> statement-breakpoint
ALTER TABLE `issues` ADD `sync_enabled` integer DEFAULT true;--> statement-breakpoint
CREATE INDEX `issues_external` ON `issues` (`project_id`,`external_issue_id`);