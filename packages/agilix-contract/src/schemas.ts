import { z } from 'zod'

export const issueTypeValues = ['requirement', 'bug', 'task', 'tech_debt'] as const
export const issueStatusValues = ['todo', 'doing', 'blocked', 'done'] as const
export const issuePriorityValues = ['high', 'medium', 'low'] as const
export const docScopeValues = ['global', 'project'] as const
export const docContentTypeValues = ['markdown', 'mermaid', 'diagram', 'mindmap'] as const
export const botRuleTypeValues = ['scheduled_summary', 'iteration_weekly', 'risk_alert'] as const

const idSchema = z.string().min(1)
const nullableIdSchema = idSchema.nullable()
const jsonObjectSchema = z.record(z.unknown())

export const projectRowSchema = z.object({
  id: idSchema,
  code: z.string().min(1),
  name: z.string().min(1),
  glyph: z.string().min(1),
  color: z.string().min(1),
  active_iteration_id: idSchema,
  cadence: z.string().min(1),
  template_key: z.string().min(1),
}).strict()

export const projectMemberRowSchema = z.object({
  project_id: idSchema,
  member_id: idSchema,
  sort_order: z.number().int(),
}).strict()

export const iterationRowSchema = z.object({
  id: idSchema,
  project_id: idSchema,
  code: z.string().min(1),
  name: z.string().min(1),
  date_range_label: z.string().min(1),
  calendar_title: z.string().min(1),
  day: z.number().int(),
  total_days: z.number().int(),
  goal: z.string(),
  velocity: z.number().int(),
}).strict()

export const iterationCalendarWeekRowSchema = z.object({
  id: idSchema,
  iteration_id: idSchema,
  sort_order: z.number().int(),
  label: z.string().min(1),
  range_label: z.string().min(1),
}).strict()

export const iterationCalendarDayRowSchema = z.object({
  id: idSchema,
  week_id: idSchema,
  sort_order: z.number().int(),
  label: z.string().min(1),
}).strict()

export const memberRowSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  role: z.string().min(1),
  capacity: z.number().int(),
  online_sort_order: z.number().int(),
}).strict()

export const issueRowSchema = z.object({
  id: idSchema,
  key: z.string().min(1),
  project_id: idSchema,
  iteration_id: idSchema,
  type: z.enum(issueTypeValues),
  title: z.string().min(1),
  status: z.enum(issueStatusValues),
  priority: z.enum(issuePriorityValues),
  handler_member_id: idSchema,
  story_points: z.number().int(),
  blocker_reason: z.string().nullable(),
  description: z.string(),
  acceptance_criteria: z.string(),
  epic_name: z.string(),
  draft: z.boolean(),
}).strict()

export const issueEventRowSchema = z.object({
  id: idSchema,
  issue_id: idSchema,
  event_type: z.string().min(1),
  actor_member_id: idSchema,
  message: z.string(),
  created_at: z.string().min(1),
}).strict()

export const issueLabelRowSchema = z.object({
  issue_id: idSchema,
  label: z.string().min(1),
  sort_order: z.number().int(),
}).strict()

export const issueCollaboratorRowSchema = z.object({
  issue_id: idSchema,
  member_id: idSchema,
  sort_order: z.number().int(),
}).strict()

export const documentRowSchema = z.object({
  id: idSchema,
  scope: z.enum(docScopeValues),
  project_id: nullableIdSchema,
  directory_id: idSchema,
  title: z.string().min(1),
  content_type: z.enum(docContentTypeValues),
  body: z.string(),
  editor_member_id: idSchema,
  sync_feishu_doc: z.boolean(),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
}).strict()

export const documentDirectoryRowSchema = z.object({
  id: idSchema,
  scope: z.enum(docScopeValues),
  project_id: nullableIdSchema,
  parent_id: nullableIdSchema,
  name: z.string().min(1),
  sort_order: z.number().int(),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
}).strict()

export const documentIssueLinkRowSchema = z.object({
  doc_id: idSchema,
  issue_id: idSchema,
}).strict()

export const documentCommentRowSchema = z.object({
  id: idSchema,
  doc_id: idSchema,
  author_member_id: idSchema,
  body: z.string(),
  resolved: z.boolean(),
  created_at: z.string().min(1),
}).strict()

export const standupRowSchema = z.object({
  id: idSchema,
  project_id: idSchema,
  date: z.string().min(1),
  date_label: z.string().min(1),
  weekday_label: z.string().min(1),
  time_label: z.string().min(1),
  calendar_label: z.string().min(1),
}).strict()

export const standupItemRowSchema = z.object({
  id: idSchema,
  standup_id: idSchema,
  member_id: idSchema,
  sort_order: z.number().int(),
  yesterday_text: z.string(),
  today_text: z.string(),
  blockers_text: z.string(),
}).strict()

export const milestoneRowSchema = z.object({
  id: idSchema,
  project_id: idSchema,
  iteration_id: idSchema,
  title: z.string().min(1),
  start_day: z.number().int(),
  end_day: z.number().int(),
  status: z.string().min(1),
  participant_member_id: idSchema,
}).strict()

export const feishuMemberProfileRowSchema = z.object({
  member_id: idSchema,
  open_id: z.string().min(1),
  union_id: z.string().min(1),
  avatar_url: z.string().min(1),
  display_name: z.string().min(1),
  last_seen_at: z.string().min(1),
}).strict()

export const feishuNotificationRowSchema = z.object({
  id: idSchema,
  trigger: z.string().min(1),
  target_group_id: idSchema,
  payload_json: jsonObjectSchema,
  status: z.string().min(1),
  created_at: z.string().min(1),
}).strict()

export const feishuQueryRowSchema = z.object({
  id: idSchema,
  command: z.string().min(1),
  response_title: z.string().min(1),
  response_body_json: jsonObjectSchema,
  created_at: z.string().min(1),
}).strict()

export const feishuGroupRowSchema = z.object({
  id: idSchema,
  project_id: idSchema,
  name: z.string().min(1),
  purpose: z.string().min(1),
  member_count_label: z.string().min(1),
  status: z.string().min(1),
  sort_order: z.number().int(),
}).strict()

export const feishuBotRuleRowSchema = z.object({
  id: idSchema,
  project_id: idSchema,
  rule_type: z.enum(botRuleTypeValues),
  title: z.string().min(1),
  description: z.string(),
  schedule_label: z.string().min(1),
  target_group_id: idSchema,
  enabled: z.boolean(),
  sort_order: z.number().int(),
}).strict()

export const appStateResponseSchema = z.object({
  projects: z.array(projectRowSchema),
  project_members: z.array(projectMemberRowSchema),
  iterations: z.array(iterationRowSchema),
  iteration_calendar_weeks: z.array(iterationCalendarWeekRowSchema),
  iteration_calendar_days: z.array(iterationCalendarDayRowSchema),
  members: z.array(memberRowSchema),
  issues: z.array(issueRowSchema),
  issue_events: z.array(issueEventRowSchema),
  issue_labels: z.array(issueLabelRowSchema),
  issue_collaborators: z.array(issueCollaboratorRowSchema),
  documents: z.array(documentRowSchema),
  document_directories: z.array(documentDirectoryRowSchema),
  document_issue_links: z.array(documentIssueLinkRowSchema),
  document_comments: z.array(documentCommentRowSchema),
  standups: z.array(standupRowSchema),
  standup_items: z.array(standupItemRowSchema),
  milestones: z.array(milestoneRowSchema),
  feishu_member_profiles: z.array(feishuMemberProfileRowSchema),
  feishu_groups: z.array(feishuGroupRowSchema),
  feishu_bot_rules: z.array(feishuBotRuleRowSchema),
  feishu_notifications: z.array(feishuNotificationRowSchema),
  feishu_queries: z.array(feishuQueryRowSchema),
}).strict()

export const createProjectRequestSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  glyph: z.string().min(1),
  color: z.string().min(1),
  cadence: z.string().min(1),
  template_key: z.string().min(1),
  member_ids: z.array(idSchema),
}).strict()

export const createIssueRequestSchema = z.object({
  project_id: idSchema,
  iteration_id: idSchema,
  type: z.enum(issueTypeValues),
  title: z.string().min(1),
  description: z.string(),
  acceptance_criteria: z.string(),
  priority: z.enum(issuePriorityValues),
  story_points: z.number().int(),
  handler_member_id: idSchema,
  epic_name: z.string(),
  labels: z.array(z.string()),
  collaborator_member_ids: z.array(idSchema),
  draft: z.boolean(),
}).strict()

export const updateIssueStatusRequestSchema = z.object({
  status: z.enum(issueStatusValues),
}).strict()

export const saveAssignmentRequestSchema = z.object({
  handler_member_id: idSchema,
  collaborator_member_ids: z.array(idSchema),
}).strict()

export const createDocumentRequestSchema = z.object({
  scope: z.enum(docScopeValues),
  project_id: nullableIdSchema,
  directory_id: idSchema,
  title: z.string().min(1),
  content_type: z.enum(docContentTypeValues),
  body: z.string(),
  editor_member_id: idSchema,
  linked_issue_ids: z.array(idSchema),
  sync_feishu_doc: z.boolean(),
}).strict()

export const createDocumentCommentRequestSchema = z.object({
  author_member_id: idSchema,
  body: z.string(),
}).strict()

export const createDocumentDirectoryRequestSchema = z.object({
  scope: z.enum(docScopeValues),
  project_id: nullableIdSchema,
  parent_id: nullableIdSchema,
  name: z.string().min(1),
}).strict()

export const updateDocumentDirectoryRequestSchema = z.object({
  name: z.string().min(1).optional(),
  parent_id: nullableIdSchema.optional(),
}).strict().refine((value) => value.name !== undefined || value.parent_id !== undefined)

export const saveStandupRequestSchema = z.object({
  items: z.array(z.object({
    member_id: idSchema,
    yesterday_text: z.string(),
    today_text: z.string(),
    blockers_text: z.string(),
  }).strict()),
}).strict()

export const saveMilestoneRequestSchema = z.object({
  title: z.string().min(1),
  start_day: z.number().int(),
  end_day: z.number().int(),
  status: z.string().min(1),
  participant_member_id: idSchema,
}).strict()

export const botConfigGroupSchema = z.object({
  id: idSchema.optional(),
  name: z.string().min(1),
  purpose: z.string().min(1),
  member_count_label: z.string().min(1),
  status: z.string().min(1),
  sort_order: z.number().int(),
}).strict()

export const botConfigRuleSchema = z.object({
  id: idSchema.optional(),
  rule_type: z.enum(botRuleTypeValues),
  title: z.string().min(1),
  description: z.string(),
  schedule_label: z.string().min(1),
  target_group_id: idSchema,
  enabled: z.boolean(),
  sort_order: z.number().int(),
}).strict()

export const botConfigResponseSchema = z.object({
  project_id: idSchema,
  groups: z.array(feishuGroupRowSchema),
  rules: z.array(feishuBotRuleRowSchema),
}).strict()

export const saveBotConfigRequestSchema = z.object({
  project_id: idSchema,
  groups: z.array(botConfigGroupSchema),
  rules: z.array(botConfigRuleSchema),
}).strict()

export const sendFeishuTestMessageRequestSchema = z.object({
  target_group_id: idSchema,
  card_title: z.string().min(1),
}).strict()

export const feishuTestMessageResponseSchema = z.object({
  notification: feishuNotificationRowSchema,
  card: z.object({
    title: z.string().min(1),
    body: jsonObjectSchema.optional(),
  }).strict(),
}).strict()

export const feishuQueryRequestSchema = z.object({
  command: z.string().min(1),
}).strict()

export const feishuQueryResponseSchema = z.object({
  response_title: z.string().min(1),
  response_body_json: jsonObjectSchema,
}).strict()

export const recordFeishuNotificationRequestSchema = z.object({
  trigger: z.string().min(1),
  target_group_id: idSchema,
  payload_json: jsonObjectSchema,
}).strict()
