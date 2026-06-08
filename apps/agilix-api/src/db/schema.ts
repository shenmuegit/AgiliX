import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  glyph: text('glyph').notNull(),
  color: text('color').notNull(),
  activeIterationCode: text('active_iteration_code').notNull(),
})

export const members = sqliteTable('members', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  capacity: integer('capacity').notNull(),
})

export const iterations = sqliteTable(
  'iterations',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    dateRangeLabel: text('date_range_label').notNull(),
    calendarTitle: text('calendar_title').notNull(),
    calendarWeeksJson: text('calendar_weeks_json').notNull(),
    day: integer('day').notNull(),
    totalDays: integer('total_days').notNull(),
    goal: text('goal').notNull(),
    velocity: integer('velocity').notNull(),
  },
  (table) => [uniqueIndex('iterations_project_code').on(table.projectId, table.code)],
)

export const issues = sqliteTable(
  'issues',
  {
    key: text('key').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    iterationId: text('iteration_id')
      .notNull()
      .references(() => iterations.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['story', 'bug', 'task', 'tech'] }).notNull(),
    title: text('title').notNull(),
    status: text('status', { enum: ['todo', 'doing', 'review', 'blocked', 'done'] }).notNull(),
    priority: text('priority', { enum: ['high', 'medium', 'low'] }).notNull(),
    assigneeId: text('assignee_id')
      .notNull()
      .references(() => members.id),
    storyPoints: integer('story_points').notNull(),
    blockerReason: text('blocker_reason'),
  },
  (table) => [
    index('issues_project_status').on(table.projectId, table.status),
    index('issues_assignee').on(table.assigneeId),
  ],
)

export const issueEvents = sqliteTable('issue_events', {
  id: text('id').primaryKey(),
  issueKey: text('issue_key')
    .notNull()
    .references(() => issues.key, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  actorId: text('actor_id').references(() => members.id),
  message: text('message').notNull(),
  createdAt: text('created_at').notNull(),
})

export const documents = sqliteTable(
  'documents',
  {
    id: text('id').primaryKey(),
    scope: text('scope', { enum: ['global', 'project'] }).notNull(),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    directory: text('directory').notNull(),
    body: text('body').notNull(),
    updatedAtLabel: text('updated_at_label').notNull(),
  },
  (table) => [index('documents_project').on(table.projectId)],
)

export const docIssueLinks = sqliteTable(
  'doc_issue_links',
  {
    docId: text('doc_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    issueKey: text('issue_key')
      .notNull()
      .references(() => issues.key, { onDelete: 'cascade' }),
  },
  (table) => [uniqueIndex('doc_issue_links_unique').on(table.docId, table.issueKey)],
)

export const docComments = sqliteTable('doc_comments', {
  id: text('id').primaryKey(),
  docId: text('doc_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  authorId: text('author_id')
    .notNull()
    .references(() => members.id),
  body: text('body').notNull(),
  resolved: integer('resolved', { mode: 'boolean' }).notNull(),
  createdAtLabel: text('created_at_label').notNull(),
})

export const standups = sqliteTable('standups', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  dateLabel: text('date_label').notNull(),
  weekdayLabel: text('weekday_label').notNull(),
  timeLabel: text('time_label').notNull(),
  calendarLabel: text('calendar_label').notNull(),
})

export const standupItems = sqliteTable('standup_items', {
  id: text('id').primaryKey(),
  standupId: text('standup_id')
    .notNull()
    .references(() => standups.id, { onDelete: 'cascade' }),
  memberId: text('member_id')
    .notNull()
    .references(() => members.id),
  yesterdayJson: text('yesterday_json').notNull(),
  todayJson: text('today_json').notNull(),
  blockersJson: text('blockers_json').notNull(),
})

export const milestones = sqliteTable('milestones', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  iterationId: text('iteration_id')
    .notNull()
    .references(() => iterations.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  startDay: integer('start_day').notNull(),
  endDay: integer('end_day').notNull(),
  status: text('status', { enum: ['done', 'doing', 'risk', 'planned'] }).notNull(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => members.id),
})

export const feishuNotifications = sqliteTable('feishu_notifications', {
  id: text('id').primaryKey(),
  trigger: text('trigger').notNull(),
  targetGroup: text('target_group').notNull(),
  payloadJson: text('payload_json').notNull(),
  status: text('status', { enum: ['queued', 'sent', 'failed'] }).notNull(),
  createdAt: text('created_at').notNull(),
})

export const feishuQueries = sqliteTable('feishu_queries', {
  id: text('id').primaryKey(),
  command: text('command').notNull(),
  responseTitle: text('response_title').notNull(),
  responseBodyJson: text('response_body_json').notNull(),
  createdAt: text('created_at').notNull(),
})
