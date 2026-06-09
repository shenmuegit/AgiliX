import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  glyph: text('glyph').notNull(),
  color: text('color').notNull(),
  activeIterationId: text('active_iteration_id').notNull(),
  cadence: text('cadence').notNull(),
  templateKey: text('template_key').notNull(),
})

export const projectMembers = sqliteTable(
  'project_members',
  {
    projectId: text('project_id').notNull(),
    memberId: text('member_id').notNull(),
    sortOrder: integer('sort_order').notNull(),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.memberId] })],
)

export const iterations = sqliteTable('iterations', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  dateRangeLabel: text('date_range_label').notNull(),
  calendarTitle: text('calendar_title').notNull(),
  day: integer('day').notNull(),
  totalDays: integer('total_days').notNull(),
  goal: text('goal').notNull(),
  velocity: integer('velocity').notNull(),
})

export const iterationCalendarWeeks = sqliteTable('iteration_calendar_weeks', {
  id: text('id').primaryKey(),
  iterationId: text('iteration_id').notNull(),
  sortOrder: integer('sort_order').notNull(),
  label: text('label').notNull(),
  rangeLabel: text('range_label').notNull(),
})

export const iterationCalendarDays = sqliteTable('iteration_calendar_days', {
  id: text('id').primaryKey(),
  weekId: text('week_id').notNull(),
  sortOrder: integer('sort_order').notNull(),
  label: text('label').notNull(),
})

export const members = sqliteTable('members', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  capacity: integer('capacity').notNull(),
  onlineSortOrder: integer('online_sort_order').notNull(),
})

export const issues = sqliteTable('issues', {
  id: text('id').primaryKey(),
  key: text('key').notNull(),
  projectId: text('project_id').notNull(),
  iterationId: text('iteration_id').notNull(),
  type: text('type', { enum: ['story', 'bug', 'task', 'tech'] }).notNull(),
  title: text('title').notNull(),
  status: text('status', { enum: ['todo', 'doing', 'review', 'blocked', 'done'] }).notNull(),
  priority: text('priority', { enum: ['high', 'medium', 'low'] }).notNull(),
  handlerMemberId: text('handler_member_id').notNull(),
  storyPoints: integer('story_points').notNull(),
  blockerReason: text('blocker_reason'),
  description: text('description').notNull(),
  acceptanceCriteria: text('acceptance_criteria').notNull(),
  epicName: text('epic_name').notNull(),
  draft: integer('draft', { mode: 'boolean' }).notNull(),
})

export const issueEvents = sqliteTable('issue_events', {
  id: text('id').primaryKey(),
  issueId: text('issue_id').notNull(),
  eventType: text('event_type').notNull(),
  actorMemberId: text('actor_member_id').notNull(),
  message: text('message').notNull(),
  createdAt: text('created_at').notNull(),
})

export const issueLabels = sqliteTable(
  'issue_labels',
  {
    issueId: text('issue_id').notNull(),
    label: text('label').notNull(),
    sortOrder: integer('sort_order').notNull(),
  },
  (table) => [primaryKey({ columns: [table.issueId, table.label] })],
)

export const issueCollaborators = sqliteTable(
  'issue_collaborators',
  {
    issueId: text('issue_id').notNull(),
    memberId: text('member_id').notNull(),
    sortOrder: integer('sort_order').notNull(),
  },
  (table) => [primaryKey({ columns: [table.issueId, table.memberId] })],
)

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  scope: text('scope', { enum: ['global', 'project'] }).notNull(),
  projectId: text('project_id'),
  directoryId: text('directory_id').notNull(),
  title: text('title').notNull(),
  contentType: text('content_type', { enum: ['markdown', 'mermaid', 'diagram', 'mindmap'] }).notNull(),
  body: text('body').notNull(),
  editorMemberId: text('editor_member_id').notNull(),
  syncFeishuDoc: integer('sync_feishu_doc', { mode: 'boolean' }).notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const documentDirectories = sqliteTable('document_directories', {
  id: text('id').primaryKey(),
  scope: text('scope', { enum: ['global', 'project'] }).notNull(),
  projectId: text('project_id'),
  parentId: text('parent_id'),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const documentIssueLinks = sqliteTable(
  'document_issue_links',
  {
    docId: text('doc_id').notNull(),
    issueId: text('issue_id').notNull(),
  },
  (table) => [primaryKey({ columns: [table.docId, table.issueId] })],
)

export const documentComments = sqliteTable('document_comments', {
  id: text('id').primaryKey(),
  docId: text('doc_id').notNull(),
  authorMemberId: text('author_member_id').notNull(),
  body: text('body').notNull(),
  resolved: integer('resolved', { mode: 'boolean' }).notNull(),
  createdAt: text('created_at').notNull(),
})

export const standups = sqliteTable('standups', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  date: text('date').notNull(),
  dateLabel: text('date_label').notNull(),
  weekdayLabel: text('weekday_label').notNull(),
  timeLabel: text('time_label').notNull(),
  calendarLabel: text('calendar_label').notNull(),
})

export const standupItems = sqliteTable('standup_items', {
  id: text('id').primaryKey(),
  standupId: text('standup_id').notNull(),
  memberId: text('member_id').notNull(),
  sortOrder: integer('sort_order').notNull(),
  yesterdayText: text('yesterday_text').notNull(),
  todayText: text('today_text').notNull(),
  blockersText: text('blockers_text').notNull(),
})

export const milestones = sqliteTable('milestones', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  iterationId: text('iteration_id').notNull(),
  title: text('title').notNull(),
  startDay: integer('start_day').notNull(),
  endDay: integer('end_day').notNull(),
  status: text('status').notNull(),
  participantMemberId: text('participant_member_id').notNull(),
})

export const feishuMemberProfiles = sqliteTable('feishu_member_profiles', {
  memberId: text('member_id').primaryKey(),
  openId: text('open_id').notNull(),
  unionId: text('union_id').notNull(),
  avatarUrl: text('avatar_url').notNull(),
  displayName: text('display_name').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),
})

export const feishuNotifications = sqliteTable('feishu_notifications', {
  id: text('id').primaryKey(),
  trigger: text('trigger').notNull(),
  targetGroupId: text('target_group_id').notNull(),
  payloadJson: text('payload_json').notNull(),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
})

export const feishuQueries = sqliteTable('feishu_queries', {
  id: text('id').primaryKey(),
  command: text('command').notNull(),
  responseTitle: text('response_title').notNull(),
  responseBodyJson: text('response_body_json').notNull(),
  createdAt: text('created_at').notNull(),
})

export const feishuGroups = sqliteTable('feishu_groups', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  name: text('name').notNull(),
  purpose: text('purpose').notNull(),
  memberCountLabel: text('member_count_label').notNull(),
  status: text('status').notNull(),
  sortOrder: integer('sort_order').notNull(),
})

export const feishuBotRules = sqliteTable('feishu_bot_rules', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  ruleType: text('rule_type', { enum: ['scheduled_summary', 'iteration_weekly', 'risk_alert'] }).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  scheduleLabel: text('schedule_label').notNull(),
  targetGroupId: text('target_group_id').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull(),
  sortOrder: integer('sort_order').notNull(),
})
