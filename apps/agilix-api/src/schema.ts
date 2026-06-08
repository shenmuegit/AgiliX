import { createDocQueryCommand } from '@agilix/app/domain/feishu'
import type { FeishuQueryCommand } from '@agilix/app/domain/types'
import { z } from 'zod'
import type { CreateDocInput, FeishuNotificationRecord } from './repository'

export const projectIdSchema = z.enum(['search', 'data', 'api', 'mobile'])
export const projectFilterSchema = z.enum(['all', 'search', 'data', 'api', 'mobile'])
export const memberIdSchema = z.enum(['lin', 'chen', 'gao', 'su', 'han', 'he', 'jiang', 'zhou'])
export const issueStatusSchema = z.enum(['todo', 'doing', 'review', 'blocked', 'done'])
export const issueTypeSchema = z.enum(['story', 'bug', 'task', 'tech'])
export const prioritySchema = z.enum(['high', 'medium', 'low'])
export const docScopeSchema = z.enum(['global', 'project'])
export const milestoneStatusSchema = z.enum(['done', 'doing', 'risk', 'planned'])
export const stringArraySchema = z.array(z.string())
const nonEmptyStringArraySchema = z
  .array(z.string().min(1))
  .min(1)
  .transform((items) => items as [string, ...string[]])

export const issueQuerySchema = z
  .object({
    projectId: projectFilterSchema,
    status: z.union([issueStatusSchema, z.literal('all')]),
    assigneeId: z.union([memberIdSchema, z.literal('all')]),
    keyword: z.string(),
  })
  .strict()

export const docQuerySchema = z
  .object({
    projectId: projectFilterSchema,
    query: z.string(),
  })
  .strict()

export const projectScopedQuerySchema = z
  .object({
    projectId: projectFilterSchema,
  })
  .strict()

export const moveIssueSchema = z
  .object({
    status: issueStatusSchema,
  })
  .strict()

const docBaseSchema = {
  id: z.string().min(1),
  title: z.string().min(1),
  directory: z.string().min(1),
  body: z.string().min(1),
  linkedIssueKeys: z
    .array(z.string().min(1))
    .refine((keys) => new Set(keys).size === keys.length, 'linkedIssueKeys must be unique'),
  comments: z.array(z.never()).length(0),
  updatedAtLabel: z.string().min(1),
}

export const docSchema: z.ZodType<CreateDocInput, z.ZodTypeDef, unknown> = z.discriminatedUnion(
  'scope',
  [
    z
      .object({ ...docBaseSchema, scope: z.literal('global'), projectId: z.undefined().optional() })
      .strict(),
    z
      .object({ ...docBaseSchema, scope: z.literal('project'), projectId: projectIdSchema })
      .strict(),
  ],
)

export const docCommentSchema = z
  .object({
    id: z.string().min(1),
    docId: z.string().min(1),
    authorId: memberIdSchema,
    body: z.string().min(1),
    resolved: z.boolean(),
    createdAtLabel: z.string().min(1),
  })
  .strict()

const feishuDocsQuerySchema = z
  .string()
  .min(1)
  .refine(
    (query) => query === query.trim(),
    'docs query must not include leading or trailing whitespace',
  )

const feishuCommandSchema: z.ZodType<FeishuQueryCommand, z.ZodTypeDef, unknown> = z.union([
  z.object({ type: z.literal('team') }).strict(),
  z.object({ type: z.literal('blockers') }).strict(),
  z
    .object({ type: z.literal('docs'), query: feishuDocsQuerySchema })
    .strict()
    .transform((command) => createDocQueryCommand(command.query)),
])

export const feishuQuerySchema = z
  .object({
    command: feishuCommandSchema,
  })
  .strict()

const feishuNotificationBaseSchema = {
  id: z.string().min(1),
  targetGroup: z.literal('AgiliX 团队群'),
  status: z.enum(['queued', 'sent', 'failed']),
  createdAt: z.string().min(1),
}

export const feishuNotificationSchema: z.ZodType<FeishuNotificationRecord, z.ZodTypeDef, unknown> =
  z.discriminatedUnion('trigger', [
    z
      .object({
        ...feishuNotificationBaseSchema,
        trigger: z.literal('站会摘要'),
        payload: z.object({ standupId: z.string().min(1) }).strict(),
      })
      .strict(),
    z
      .object({
        ...feishuNotificationBaseSchema,
        trigger: z.literal('阻塞提醒'),
        payload: z.object({ issueKeys: nonEmptyStringArraySchema }).strict(),
      })
      .strict(),
    z
      .object({
        ...feishuNotificationBaseSchema,
        trigger: z.literal('文档评论'),
        payload: z.object({ docId: z.string().min(1), commentId: z.string().min(1) }).strict(),
      })
      .strict(),
  ])

export const standupItemSchema = z
  .object({
    memberId: memberIdSchema,
    yesterday: z.array(z.string()),
    today: z.array(z.string()),
    blockers: z.array(z.string()),
  })
  .strict()

export const standupSchema = z
  .object({
    id: z.string().min(1),
    projectId: projectIdSchema,
    dateLabel: z.string().min(1),
    weekdayLabel: z.string().min(1),
    timeLabel: z.string().min(1),
    calendarLabel: z.string().min(1),
    items: z.array(standupItemSchema),
  })
  .strict()

export const milestoneSchema = z
  .object({
    id: z.string().min(1),
    projectId: projectIdSchema,
    iterationId: z.string().min(1),
    title: z.string().min(1),
    startDay: z.number().int(),
    endDay: z.number().int(),
    status: milestoneStatusSchema,
    ownerId: memberIdSchema,
  })
  .strict()
