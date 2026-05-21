CREATE TABLE `milestones` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL REFERENCES `projects`(`id`) ON DELETE CASCADE,
  `name` text NOT NULL,
  `description` text,
  `status` text DEFAULT 'ACTIVE' NOT NULL,
  `git_ref` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);

ALTER TABLE `issues` ADD `milestone_id` text REFERENCES `milestones`(`id`);
