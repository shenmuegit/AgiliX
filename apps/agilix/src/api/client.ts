import { z } from 'zod'
import { createDocQueryCommand } from '../domain/feishu'
import type {
  Doc,
  DocComment,
  FeishuNotificationPayload,
  FeishuQueryCommand,
  CreateProjectInput,
  IssueStatus,
  Milestone,
  SeedData,
  Standup,
} from '../domain/types'

export interface FeishuReply {
  title: string
  lines: string[]
}

export type FeishuNotificationInput = {
  id: string
  targetGroup: 'AgiliX 团队群'
  status: 'queued' | 'sent' | 'failed'
  createdAt: string
} & FeishuNotificationPayload

type CreateDocInputFor<T extends Doc> = Omit<T, 'comments'> & { comments: never[] }
export type CreateDocInput = Doc extends infer D
  ? D extends Doc
    ? CreateDocInputFor<D>
    : never
  : never

export interface AgiliXClient {
  loadData(): Promise<SeedData>
  createProject(input: CreateProjectInput): Promise<void>
  moveIssue(issueKey: string, status: IssueStatus): Promise<void>
  addDocComment(docId: string, comment: DocComment): Promise<void>
  createDoc(doc: CreateDocInput): Promise<void>
  saveStandup(standup: Standup): Promise<void>
  saveMilestone(milestone: Milestone): Promise<void>
  recordFeishuNotification(input: FeishuNotificationInput): Promise<void>
  queryFeishu(command: FeishuQueryCommand): Promise<FeishuReply>
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const projectIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z][a-z0-9-]*$/, 'project id must use lowercase letters, numbers, or hyphens')
const memberIdSchema = z.enum(['lin', 'chen', 'gao', 'su', 'han', 'he', 'jiang', 'zhou'])
const issueStatusSchema = z.enum(['todo', 'doing', 'review', 'blocked', 'done'])
const issueTypeSchema = z.enum(['story', 'bug', 'task', 'tech'])
const prioritySchema = z.enum(['high', 'medium', 'low'])
const milestoneStatusSchema = z.enum(['done', 'doing', 'risk', 'planned'])
const feishuNotificationTriggerSchema = z.enum(['站会摘要', '阻塞提醒', '文档评论'])
const nonEmptyStringArraySchema = z
  .array(z.string().min(1))
  .min(1)
  .transform((items) => items as [string, ...string[]])

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

const docCommentSchema = z
  .object({
    id: z.string().min(1),
    docId: z.string().min(1),
    authorId: memberIdSchema,
    body: z.string().min(1),
    resolved: z.boolean(),
    createdAtLabel: z.string().min(1),
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
  comments: z.array(docCommentSchema),
  updatedAtLabel: z.string().min(1),
}

const docSchema: z.ZodType<Doc, z.ZodTypeDef, unknown> = z.discriminatedUnion('scope', [
  z
    .object({ ...docBaseSchema, scope: z.literal('global'), projectId: z.undefined().optional() })
    .strict(),
  z.object({ ...docBaseSchema, scope: z.literal('project'), projectId: projectIdSchema }).strict(),
])

const createDocInputBaseSchema = {
  ...docBaseSchema,
  comments: z.array(z.never()).length(0),
}

const createDocInputSchema: z.ZodType<CreateDocInput, z.ZodTypeDef, unknown> = z.discriminatedUnion(
  'scope',
  [
    z
      .object({
        ...createDocInputBaseSchema,
        scope: z.literal('global'),
        projectId: z.undefined().optional(),
      })
      .strict(),
    z
      .object({
        ...createDocInputBaseSchema,
        scope: z.literal('project'),
        projectId: projectIdSchema,
      })
      .strict(),
  ],
)

function validateCreateDocInput(doc: CreateDocInput): CreateDocInput {
  if (doc.comments.length > 0) throw new Error('Document comments must be empty on create')
  if (new Set(doc.linkedIssueKeys).size !== doc.linkedIssueKeys.length)
    throw new Error('Duplicate linked issue')
  createDocInputSchema.parse(doc)
  return doc
}

const projectSchema = z
  .object({
    id: projectIdSchema,
    name: z.string().min(1),
    glyph: z.string().min(1),
    color: z.string().min(1),
    activeIterationCode: z.string().min(1),
  })
  .strict()

const memberSchema = z
  .object({
    id: memberIdSchema,
    name: z.string().min(1),
    role: z.string().min(1),
    capacity: z.number().int(),
  })
  .strict()

const iterationCalendarWeekSchema = z
  .object({
    label: z.string().min(1),
    rangeLabel: z.string().min(1),
    days: z.array(z.string().min(1)).min(1),
  })
  .strict()

const iterationSchema = z
  .object({
    id: z.string().min(1),
    projectId: projectIdSchema,
    code: z.string().min(1),
    name: z.string().min(1),
    dateRangeLabel: z.string().min(1),
    calendarTitle: z.string().min(1),
    calendarWeeks: z.array(iterationCalendarWeekSchema).min(1),
    day: z.number().int(),
    totalDays: z.number().int(),
    goal: z.string().min(1),
    velocity: z.number().int(),
  })
  .strict()

const createProjectInputSchema: z.ZodType<CreateProjectInput, z.ZodTypeDef, unknown> = z
  .object({
    project: projectSchema,
    iteration: iterationSchema,
  })
  .strict()
  .refine((input) => input.project.id === input.iteration.projectId, {
    message: 'iteration projectId must match project id',
    path: ['iteration', 'projectId'],
  })
  .refine((input) => input.project.activeIterationCode === input.iteration.code, {
    message: 'project activeIterationCode must match iteration code',
    path: ['project', 'activeIterationCode'],
  })

const issueSchema = z
  .object({
    key: z.string().min(1),
    projectId: projectIdSchema,
    iterationId: z.string().min(1),
    type: issueTypeSchema,
    title: z.string().min(1),
    status: issueStatusSchema,
    priority: prioritySchema,
    assigneeId: memberIdSchema,
    storyPoints: z.number().int(),
    blockerReason: z.string().min(1).optional(),
    linkedDocIds: z.array(z.string().min(1)),
  })
  .strict()

const standupItemSchema = z
  .object({
    memberId: memberIdSchema,
    yesterday: z.array(z.string()),
    today: z.array(z.string()),
    blockers: z.array(z.string()),
  })
  .strict()

const standupSchema = z
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

const milestoneSchema = z
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

const feishuNotificationSchema: z.ZodType<FeishuNotificationInput, z.ZodTypeDef, unknown> =
  z.discriminatedUnion('trigger', [
    z
      .object({
        id: z.string().min(1),
        targetGroup: z.literal('AgiliX 团队群'),
        status: z.enum(['queued', 'sent', 'failed']),
        createdAt: z.string().min(1),
        trigger: z.literal('站会摘要'),
        payload: z.object({ standupId: z.string().min(1) }).strict(),
      })
      .strict(),
    z
      .object({
        id: z.string().min(1),
        targetGroup: z.literal('AgiliX 团队群'),
        status: z.enum(['queued', 'sent', 'failed']),
        createdAt: z.string().min(1),
        trigger: z.literal('阻塞提醒'),
        payload: z.object({ issueKeys: nonEmptyStringArraySchema }).strict(),
      })
      .strict(),
    z
      .object({
        id: z.string().min(1),
        targetGroup: z.literal('AgiliX 团队群'),
        status: z.enum(['queued', 'sent', 'failed']),
        createdAt: z.string().min(1),
        trigger: z.literal('文档评论'),
        payload: z.object({ docId: z.string().min(1), commentId: z.string().min(1) }).strict(),
      })
      .strict(),
  ])

const seedDataSchema: z.ZodType<SeedData, z.ZodTypeDef, unknown> = z
  .object({
    navItems: z.array(z.string().min(1)),
    projects: z.array(projectSchema),
    members: z.array(memberSchema),
    iterations: z.array(iterationSchema),
    issues: z.array(issueSchema),
    docs: z.array(docSchema),
    standups: z.array(standupSchema),
    milestones: z.array(milestoneSchema),
    feishu: z
      .object({
        groups: z.array(z.literal('AgiliX 团队群')),
        queryCommands: z.array(feishuCommandSchema),
        notificationTriggers: z.array(feishuNotificationTriggerSchema),
      })
      .strict(),
  })
  .strict()

const feishuReplySchema: z.ZodType<FeishuReply, z.ZodTypeDef, unknown> = z
  .object({
    title: z.string().min(1),
    lines: z.array(z.string()),
  })
  .strict()

async function send(fetcher: Fetcher, path: string, init: RequestInit = {}): Promise<Response> {
  return fetcher(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init.headers,
    },
  })
}

async function requestJson<T>(
  fetcher: Fetcher,
  path: string,
  expectedStatus: number,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  init: RequestInit = {},
): Promise<T> {
  const response = await send(fetcher, path, init)
  if (response.status !== expectedStatus)
    throw new Error(
      `AgiliX API request failed: expected ${expectedStatus}, received ${response.status}`,
    )
  const parsed = schema.safeParse(await response.json())
  if (!parsed.success) throw new Error(`AgiliX API response validation failed: ${path}`)
  return parsed.data
}

async function requestNoContent(
  fetcher: Fetcher,
  path: string,
  init: RequestInit = {},
): Promise<void> {
  const response = await send(fetcher, path, init)
  if (response.status !== 204)
    throw new Error(`AgiliX API request failed: expected 204, received ${response.status}`)
}

export function createAgiliXClient(fetcher: Fetcher = fetch): AgiliXClient {
  return {
    loadData() {
      return requestJson(fetcher, '/api/bootstrap', 200, seedDataSchema)
    },
    async createProject(input) {
      const parsed = createProjectInputSchema.parse(input)
      await requestJson(fetcher, '/api/projects', 201, projectSchema, {
        method: 'POST',
        body: JSON.stringify(parsed),
      })
    },
    moveIssue(issueKey, status) {
      return requestNoContent(fetcher, `/api/issues/${issueKey}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
    },
    addDocComment(docId, comment) {
      return requestJson(fetcher, `/api/docs/${docId}/comments`, 201, docCommentSchema, {
        method: 'POST',
        body: JSON.stringify(comment),
      }).then(() => undefined)
    },
    async createDoc(doc) {
      const input = validateCreateDocInput(doc)
      await requestJson(fetcher, '/api/docs', 201, docSchema, {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },
    saveStandup(standup) {
      return requestNoContent(fetcher, `/api/standups/${standup.id}`, {
        method: 'PUT',
        body: JSON.stringify(standup),
      })
    },
    saveMilestone(milestone) {
      return requestNoContent(fetcher, `/api/milestones/${milestone.id}`, {
        method: 'PUT',
        body: JSON.stringify(milestone),
      })
    },
    async recordFeishuNotification(input) {
      feishuNotificationSchema.parse(input)
      await requestJson(fetcher, '/api/feishu/notifications', 201, feishuNotificationSchema, {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },
    async queryFeishu(command) {
      const input = feishuCommandSchema.parse(command)
      return requestJson(fetcher, '/api/feishu/query', 200, feishuReplySchema, {
        method: 'POST',
        body: JSON.stringify({ command: input }),
      })
    },
  }
}
