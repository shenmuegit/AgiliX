-- Seed: Demo user
INSERT OR IGNORE INTO users (id, feishu_user_id, name, email, created_at, updated_at)
VALUES ('demo-user-001', 'demo_user', 'Demo User', 'demo@agilix.dev', datetime('now'), datetime('now'));

-- Seed: Demo project
INSERT OR IGNORE INTO projects (id, key, name, description, created_at, updated_at)
VALUES ('demo-project-001', 'AGX', 'AgiliX Demo', 'AgiliX demo project', datetime('now'), datetime('now'));

-- Seed: Project member
INSERT OR IGNORE INTO project_members (id, project_id, user_id, role)
VALUES ('demo-member-001', 'demo-project-001', 'demo-user-001', 'OWNER');

-- Seed: Default workflow
INSERT OR IGNORE INTO workflows (id, project_id, name)
VALUES ('demo-workflow-001', 'demo-project-001', 'Default');

INSERT OR IGNORE INTO workflow_statuses (id, workflow_id, name, category, "order", color)
VALUES
  ('status-todo', 'demo-workflow-001', 'To Do', 'TODO', 0, '#6B7280'),
  ('status-inprogress', 'demo-workflow-001', 'In Progress', 'IN_PROGRESS', 1, '#3B82F6'),
  ('status-inreview', 'demo-workflow-001', 'In Review', 'IN_PROGRESS', 2, '#8B5CF6'),
  ('status-done', 'demo-workflow-001', 'Done', 'DONE', 3, '#10B981');

-- Seed: Default board
INSERT OR IGNORE INTO boards (id, project_id, name)
VALUES ('demo-board-001', 'demo-project-001', 'Main Board');

INSERT OR IGNORE INTO board_columns (id, board_id, status_id, "order")
VALUES
  ('col-todo', 'demo-board-001', 'status-todo', 0),
  ('col-inprogress', 'demo-board-001', 'status-inprogress', 1),
  ('col-inreview', 'demo-board-001', 'status-inreview', 2),
  ('col-done', 'demo-board-001', 'status-done', 3);
