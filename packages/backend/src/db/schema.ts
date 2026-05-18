import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

// ──────────────────── Users ────────────────────

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  feishuUserId: text('feishu_user_id').unique().notNull(),
  feishuUnionId: text('feishu_union_id').unique(),
  name: text('name').notNull(),
  email: text('email'),
  avatarUrl: text('avatar_url'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const usersRelations = relations(users, ({ many }) => ({
  assignedIssues: many(issues, { relationName: 'assignee' }),
  reportedIssues: many(issues, { relationName: 'reporter' }),
  comments: many(comments),
  timeLogs: many(timeLogs),
  memberships: many(projectMembers),
  activities: many(activityLogs),
}))

// ──────────────────── Projects ────────────────────

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text('key').unique().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  feishuGroupId: text('feishu_group_id'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const projectsRelations = relations(projects, ({ many }) => ({
  members: many(projectMembers),
  issues: many(issues),
  sprints: many(sprints),
  boards: many(boards),
  workflows: many(workflows),
  labels: many(labels),
  gitProviders: many(gitProviders),
}))

export const projectMembers = sqliteTable('project_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['OWNER', 'ADMIN', 'MEMBER'] }).default('MEMBER').notNull(),
}, (t) => [
  uniqueIndex('project_members_unique').on(t.projectId, t.userId),
])

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectMembers.userId], references: [users.id] }),
}))

// ──────────────────── Workflows ────────────────────

export const workflows = sqliteTable('workflows', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
})

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  project: one(projects, { fields: [workflows.projectId], references: [projects.id] }),
  statuses: many(workflowStatuses),
}))

export const workflowStatuses = sqliteTable('workflow_statuses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workflowId: text('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category', { enum: ['TODO', 'IN_PROGRESS', 'DONE'] }).notNull(),
  order: integer('order').notNull(),
  color: text('color').default('#6B7280').notNull(),
}, (t) => [
  uniqueIndex('workflow_statuses_unique').on(t.workflowId, t.name),
])

export const workflowStatusesRelations = relations(workflowStatuses, ({ one, many }) => ({
  workflow: one(workflows, { fields: [workflowStatuses.workflowId], references: [workflows.id] }),
  issues: many(issues),
}))

// ──────────────────── Issues ────────────────────

export const issues = sqliteTable('issues', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  key: text('key').unique().notNull(),
  sequenceNum: integer('sequence_num').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type', { enum: ['EPIC', 'STORY', 'TASK', 'BUG', 'SUB_TASK'] }).notNull(),
  priority: text('priority', { enum: ['HIGHEST', 'HIGH', 'MEDIUM', 'LOW', 'LOWEST'] }).default('MEDIUM').notNull(),
  storyPoints: integer('story_points'),
  statusId: text('status_id').notNull().references(() => workflowStatuses.id),
  assigneeId: text('assignee_id').references(() => users.id),
  reporterId: text('reporter_id').notNull().references(() => users.id),
  parentId: text('parent_id'),
  sprintId: text('sprint_id').references(() => sprints.id),
  boardColumnId: text('board_column_id').references(() => boardColumns.id),
  columnOrder: integer('column_order').default(0).notNull(),
  dueDate: text('due_date'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()).notNull(),
}, (t) => [
  index('issues_project_sprint').on(t.projectId, t.sprintId),
  index('issues_project_type').on(t.projectId, t.type),
  index('issues_assignee').on(t.assigneeId),
])

export const issuesRelations = relations(issues, ({ one, many }) => ({
  project: one(projects, { fields: [issues.projectId], references: [projects.id] }),
  status: one(workflowStatuses, { fields: [issues.statusId], references: [workflowStatuses.id] }),
  assignee: one(users, { fields: [issues.assigneeId], references: [users.id], relationName: 'assignee' }),
  reporter: one(users, { fields: [issues.reporterId], references: [users.id], relationName: 'reporter' }),
  parent: one(issues, { fields: [issues.parentId], references: [issues.id], relationName: 'subtasks' }),
  children: many(issues, { relationName: 'subtasks' }),
  sprint: one(sprints, { fields: [issues.sprintId], references: [sprints.id] }),
  boardColumn: one(boardColumns, { fields: [issues.boardColumnId], references: [boardColumns.id] }),
  comments: many(comments),
  timeLogs: many(timeLogs),
  labels: many(issueLabels),
  activities: many(activityLogs),
  mergeRequests: many(mergeRequests),
  commits: many(commitRefs),
  gitBranches: many(gitBranches),
}))

// ──────────────────── Labels ────────────────────

export const labels = sqliteTable('labels', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').default('#3B82F6').notNull(),
})

export const labelsRelations = relations(labels, ({ one, many }) => ({
  project: one(projects, { fields: [labels.projectId], references: [projects.id] }),
  issues: many(issueLabels),
}))

export const issueLabels = sqliteTable('issue_labels', {
  issueId: text('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  labelId: text('label_id').notNull().references(() => labels.id, { onDelete: 'cascade' }),
}, (t) => [
  uniqueIndex('issue_labels_pk').on(t.issueId, t.labelId),
])

export const issueLabelsRelations = relations(issueLabels, ({ one }) => ({
  issue: one(issues, { fields: [issueLabels.issueId], references: [issues.id] }),
  label: one(labels, { fields: [issueLabels.labelId], references: [labels.id] }),
}))

// ──────────────────── Sprints ────────────────────

export const sprints = sqliteTable('sprints', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  goal: text('goal'),
  status: text('status', { enum: ['PLANNED', 'ACTIVE', 'COMPLETED'] }).default('PLANNED').notNull(),
  startDate: text('start_date'),
  endDate: text('end_date'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const sprintsRelations = relations(sprints, ({ one, many }) => ({
  project: one(projects, { fields: [sprints.projectId], references: [projects.id] }),
  issues: many(issues),
  snapshots: many(sprintSnapshots),
}))

export const sprintSnapshots = sqliteTable('sprint_snapshots', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sprintId: text('sprint_id').notNull().references(() => sprints.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  totalPoints: integer('total_points').notNull(),
  completedPoints: integer('completed_points').notNull(),
  remainingPoints: integer('remaining_points').notNull(),
  totalIssues: integer('total_issues').notNull(),
  completedIssues: integer('completed_issues').notNull(),
}, (t) => [
  uniqueIndex('sprint_snapshots_unique').on(t.sprintId, t.date),
])

// ──────────────────── Board ────────────────────

export const boards = sqliteTable('boards', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').default('Main Board').notNull(),
})

export const boardsRelations = relations(boards, ({ one, many }) => ({
  project: one(projects, { fields: [boards.projectId], references: [projects.id] }),
  columns: many(boardColumns),
}))

export const boardColumns = sqliteTable('board_columns', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  boardId: text('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  statusId: text('status_id').notNull(),
  order: integer('order').notNull(),
  wipLimit: integer('wip_limit'),
})

export const boardColumnsRelations = relations(boardColumns, ({ one, many }) => ({
  board: one(boards, { fields: [boardColumns.boardId], references: [boards.id] }),
  issues: many(issues),
}))

// ──────────────────── Comments ────────────────────

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  issueId: text('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  authorId: text('author_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const commentsRelations = relations(comments, ({ one }) => ({
  issue: one(issues, { fields: [comments.issueId], references: [issues.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}))

// ──────────────────── Time Tracking ────────────────────

export const timeLogs = sqliteTable('time_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  issueId: text('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  minutes: integer('minutes').notNull(),
  description: text('description'),
  logDate: text('log_date').notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
}, (t) => [
  index('time_logs_issue').on(t.issueId),
  index('time_logs_user_date').on(t.userId, t.logDate),
])

export const timeLogsRelations = relations(timeLogs, ({ one }) => ({
  issue: one(issues, { fields: [timeLogs.issueId], references: [issues.id] }),
  user: one(users, { fields: [timeLogs.userId], references: [users.id] }),
}))

// ──────────────────── Activity Log ────────────────────

export const activityLogs = sqliteTable('activity_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  issueId: text('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id),
  action: text('action').notNull(),
  detail: text('detail'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
}, (t) => [
  index('activity_logs_issue_date').on(t.issueId, t.createdAt),
])

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  issue: one(issues, { fields: [activityLogs.issueId], references: [issues.id] }),
  user: one(users, { fields: [activityLogs.userId], references: [users.id] }),
}))

// ──────────────────── Git Integration ────────────────────

export const gitProviders = sqliteTable('git_providers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['GITLAB', 'GITHUB'] }).notNull(),
  baseUrl: text('base_url').notNull(),
  accessToken: text('access_token').notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const gitProvidersRelations = relations(gitProviders, ({ one, many }) => ({
  project: one(projects, { fields: [gitProviders.projectId], references: [projects.id] }),
  repositories: many(gitRepositories),
}))

export const gitRepositories = sqliteTable('git_repositories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  providerId: text('provider_id').notNull().references(() => gitProviders.id, { onDelete: 'cascade' }),
  externalId: text('external_id').notNull(),
  name: text('name').notNull(),
  fullPath: text('full_path').notNull(),
  defaultBranch: text('default_branch').default('main').notNull(),
}, (t) => [
  uniqueIndex('git_repos_unique').on(t.providerId, t.externalId),
])

export const gitRepositoriesRelations = relations(gitRepositories, ({ one, many }) => ({
  provider: one(gitProviders, { fields: [gitRepositories.providerId], references: [gitProviders.id] }),
  mergeRequests: many(mergeRequests),
  commits: many(commitRefs),
  branches: many(gitBranches),
}))

export const mergeRequests = sqliteTable('merge_requests', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  repoId: text('repo_id').notNull().references(() => gitRepositories.id, { onDelete: 'cascade' }),
  issueId: text('issue_id').references(() => issues.id),
  externalId: text('external_id').notNull(),
  title: text('title').notNull(),
  state: text('state').notNull(),
  author: text('author').notNull(),
  sourceBranch: text('source_branch').notNull(),
  targetBranch: text('target_branch').notNull(),
  ciStatus: text('ci_status'),
  webUrl: text('web_url'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()).notNull(),
}, (t) => [
  uniqueIndex('merge_requests_unique').on(t.repoId, t.externalId),
])

export const mergeRequestsRelations = relations(mergeRequests, ({ one, many }) => ({
  repository: one(gitRepositories, { fields: [mergeRequests.repoId], references: [gitRepositories.id] }),
  issue: one(issues, { fields: [mergeRequests.issueId], references: [issues.id] }),
  pipelines: many(pipelines),
}))

export const pipelines = sqliteTable('pipelines', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  mrId: text('mr_id').notNull().references(() => mergeRequests.id, { onDelete: 'cascade' }),
  externalId: text('external_id').notNull(),
  status: text('status').notNull(),
  webUrl: text('web_url'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const gitBranches = sqliteTable('git_branches', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  repoId: text('repo_id').notNull().references(() => gitRepositories.id, { onDelete: 'cascade' }),
  issueId: text('issue_id').notNull().references(() => issues.id),
  name: text('name').notNull(),
}, (t) => [
  uniqueIndex('git_branches_unique').on(t.repoId, t.name),
])

export const gitBranchesRelations = relations(gitBranches, ({ one }) => ({
  repository: one(gitRepositories, { fields: [gitBranches.repoId], references: [gitRepositories.id] }),
  issue: one(issues, { fields: [gitBranches.issueId], references: [issues.id] }),
}))

export const commitRefs = sqliteTable('commit_refs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  repoId: text('repo_id').notNull().references(() => gitRepositories.id, { onDelete: 'cascade' }),
  issueId: text('issue_id').references(() => issues.id),
  sha: text('sha').notNull(),
  message: text('message').notNull(),
  author: text('author').notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
}, (t) => [
  uniqueIndex('commit_refs_unique').on(t.repoId, t.sha),
])

export const commitRefsRelations = relations(commitRefs, ({ one }) => ({
  repository: one(gitRepositories, { fields: [commitRefs.repoId], references: [gitRepositories.id] }),
  issue: one(issues, { fields: [commitRefs.issueId], references: [issues.id] }),
}))
