import { buildFeishuReply, parseFeishuCommand } from '@agilix/app/domain/feishu'
import {
  appStateResponseSchema,
  createProjectRequestSchema,
  feishuQueryRequestSchema,
  feishuQueryResponseSchema,
  saveMilestoneRequestSchema,
  saveStandupRequestSchema,
  updateIssueStatusRequestSchema,
} from '@agilix/contract'
import { Hono, type Context } from 'hono'
import type { z } from 'zod'
import type { MemberId, MilestoneStatus, SeedData, Standup } from '@agilix/app/domain/types'
import { contractId, legacyIssueKeyFromContractId, toAppStateResponse } from './appStateAdapter'
import type {
  AddDocCommentResult,
  AgiliXRepository,
  CreateDocResult,
  CreateProjectResult,
  SaveFeishuNotificationResult,
  SaveMilestoneResult,
} from './repository'
import {
  createProjectSchema,
  docCommentSchema,
  docQuerySchema,
  docSchema,
  feishuNotificationSchema,
  issueQuerySchema,
  projectScopedQuerySchema,
} from './schema'

type ParseResult<T> = { value: T; response?: never } | { value?: never; response: Response }
type JsonFailure = { message: string; status: 400 | 404 | 409 }

const createDocFailures = {
  'duplicate-document': { message: 'Document already exists', status: 409 },
  'duplicate-linked-issue': { message: 'Duplicate linked issue', status: 400 },
  'linked-issue-not-found': { message: 'Linked issue not found', status: 400 },
  'document-comments-not-empty': {
    message: 'Document comments must be empty on create',
    status: 400,
  },
} satisfies Record<Exclude<CreateDocResult, 'created'>, JsonFailure>

const createProjectFailures = {
  'duplicate-project': { message: 'Project already exists', status: 409 },
  'duplicate-iteration': { message: 'Iteration already exists', status: 409 },
  'project-iteration-mismatch': {
    message: 'Iteration projectId must match project id',
    status: 400,
  },
  'active-iteration-code-mismatch': {
    message: 'Project activeIterationCode must match iteration code',
    status: 400,
  },
} satisfies Record<Exclude<CreateProjectResult, 'created'>, JsonFailure>

const addDocCommentFailures = {
  'document-not-found': { message: 'Document not found', status: 404 },
  'comment-doc-id-mismatch': { message: 'Comment docId must match route id', status: 400 },
} satisfies Record<Exclude<AddDocCommentResult, 'created'>, JsonFailure>

const saveMilestoneFailures = {
  'milestone-not-found': { message: 'Milestone not found', status: 404 },
  'project-not-found': { message: 'Project not found', status: 400 },
  'iteration-not-found': { message: 'Iteration not found', status: 400 },
  'owner-not-found': { message: 'Owner not found', status: 400 },
} satisfies Record<Exclude<SaveMilestoneResult, 'saved'>, JsonFailure>

const saveFeishuNotificationFailures = {
  'standup-not-found': { message: 'Standup not found', status: 400 },
  'issue-not-found': { message: 'Issue not found', status: 400 },
  'document-not-found': { message: 'Document not found', status: 400 },
  'comment-not-found': { message: 'Comment not found', status: 400 },
} satisfies Record<Exclude<SaveFeishuNotificationResult, 'saved'>, JsonFailure>

async function parseJson<T>(
  context: Context,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
): Promise<ParseResult<T>> {
  let json: unknown
  try {
    json = await context.req.json()
  } catch {
    return { response: context.json({ message: 'Malformed JSON' }, 400) }
  }

  const parsed = schema.safeParse(json)
  if (!parsed.success)
    return {
      response: context.json({ message: 'Validation error', issues: parsed.error.issues }, 400),
    }
  return { value: parsed.data }
}

async function parseJsonValue(context: Context): Promise<ParseResult<unknown>> {
  try {
    return { value: await context.req.json() }
  } catch {
    return { response: context.json({ message: 'Malformed JSON' }, 400) }
  }
}

function parseQuery<T>(
  context: Context,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
): ParseResult<T> {
  const parsed = schema.safeParse(context.req.query())
  if (!parsed.success)
    return {
      response: context.json({ message: 'Validation error', issues: parsed.error.issues }, 400),
    }
  return { value: parsed.data }
}

function idMismatch(context: Context, message: string) {
  return context.json({ message }, 400)
}

function splitContractText(value: string) {
  return value === '' ? [] : value.split('\n')
}

function legacyMemberIdFromContractId(data: SeedData, memberId: string) {
  return data.members.find((member) => contractId('member', member.id) === memberId)?.id
}

function legacyStandupFromContractId(data: SeedData, standupId: string) {
  return data.standups.find((standup) => contractId('standup', standup.id) === standupId)
}

function legacyMilestoneFromContractId(data: SeedData, milestoneId: string) {
  return data.milestones.find((milestone) => contractId('milestone', milestone.id) === milestoneId)
}

async function validateProjectFilter(
  context: Context,
  repository: AgiliXRepository,
  projectId: string,
): Promise<Response | undefined> {
  if (projectId === 'all') return undefined
  const exists = (await repository.listProjects()).some((project) => project.id === projectId)
  return exists ? undefined : context.json({ message: 'Project not found' }, 400)
}

export function createApp(repository: AgiliXRepository) {
  const app = new Hono()

  async function contractAppState() {
    return appStateResponseSchema.parse(toAppStateResponse(await repository.loadData()))
  }

  app.get('/api/app-state', async (context) => context.json(await contractAppState()))

  app.get('/api/bootstrap', async (context) => context.json(await repository.loadData()))

  app.get('/api/projects', async (context) => context.json(await repository.listProjects()))

  app.post('/api/projects', async (context) => {
    const json = await parseJsonValue(context)
    if ('response' in json) return json.response

    const contractProject = createProjectRequestSchema.safeParse(json.value)
    if (contractProject.success) {
      const input = contractProject.data
      const result = await repository.createProject({
        project: {
          id: input.code,
          name: input.name,
          glyph: input.glyph,
          color: input.color,
          activeIterationCode: input.initial_iteration.code,
        },
        iteration: {
          id: `${input.code}-${input.initial_iteration.code}`,
          projectId: input.code,
          code: input.initial_iteration.code,
          name: input.initial_iteration.name,
          dateRangeLabel: input.initial_iteration.date_range_label,
          calendarTitle: input.initial_iteration.calendar_title,
          calendarWeeks: input.initial_iteration.calendar_weeks.map((week) => ({
            label: week.label,
            rangeLabel: week.range_label,
            days: week.days,
          })),
          day: input.initial_iteration.day,
          totalDays: input.initial_iteration.total_days,
          goal: input.initial_iteration.goal,
          velocity: input.initial_iteration.velocity,
        },
      })
      if (result === 'created') return context.json(await contractAppState(), 201)
      const failure = createProjectFailures[result]
      return context.json({ message: failure.message }, failure.status)
    }

    if (
      typeof json.value === 'object' &&
      json.value !== null &&
      ('code' in json.value || 'template_key' in json.value || 'member_ids' in json.value)
    ) {
      return context.json(
        { message: 'Validation error', issues: contractProject.error.issues },
        400,
      )
    }

    const parsed = createProjectSchema.safeParse(json.value)
    if (!parsed.success)
      return context.json({ message: 'Validation error', issues: parsed.error.issues }, 400)
    const result = await repository.createProject(parsed.data)
    if (result === 'created') return context.json(parsed.data.project, 201)
    const failure = createProjectFailures[result]
    return context.json({ message: failure.message }, failure.status)
  })

  app.get('/api/issues', async (context) => {
    const parsed = parseQuery(context, issueQuerySchema)
    if ('response' in parsed) return parsed.response
    const invalidProject = await validateProjectFilter(context, repository, parsed.value.projectId)
    if (invalidProject) return invalidProject
    return context.json(await repository.listIssues(parsed.value))
  })

  app.patch('/api/issues/:key/status', async (context) => {
    const parsed = await parseJson(context, updateIssueStatusRequestSchema)
    if ('response' in parsed) return parsed.response
    const loadedData = await repository.loadData()
    const legacyIssueKey =
      legacyIssueKeyFromContractId(loadedData, context.req.param('key')) ?? context.req.param('key')
    const moved = await repository.moveIssue(legacyIssueKey, parsed.value.status)
    if (moved && legacyIssueKey !== context.req.param('key'))
      return context.json(await contractAppState(), 200)
    return moved ? context.body(null, 204) : context.json({ message: 'Issue not found' }, 404)
  })

  app.get('/api/docs', async (context) => {
    const parsed = parseQuery(context, docQuerySchema)
    if ('response' in parsed) return parsed.response
    const invalidProject = await validateProjectFilter(context, repository, parsed.value.projectId)
    if (invalidProject) return invalidProject
    return context.json(await repository.listDocs(parsed.value))
  })

  app.post('/api/docs', async (context) => {
    const parsed = await parseJson(context, docSchema)
    if ('response' in parsed) return parsed.response
    const result = await repository.createDoc(parsed.value)
    if (result === 'created') return context.json(parsed.value, 201)
    const failure = createDocFailures[result]
    return context.json({ message: failure.message }, failure.status)
  })

  app.get('/api/docs/:id', async (context) => {
    const doc = await repository.getDoc(context.req.param('id'))
    return doc ? context.json(doc) : context.json({ message: 'Document not found' }, 404)
  })

  app.post('/api/docs/:id/comments', async (context) => {
    const parsed = await parseJson(context, docCommentSchema)
    if ('response' in parsed) return parsed.response
    if (parsed.value.docId !== context.req.param('id'))
      return idMismatch(context, 'Comment docId must match route id')
    const result = await repository.addDocComment(context.req.param('id'), parsed.value)
    if (result === 'created') return context.json(parsed.value, 201)
    const failure = addDocCommentFailures[result]
    return context.json({ message: failure.message }, failure.status)
  })

  app.get('/api/standups', async (context) => {
    const parsed = parseQuery(context, projectScopedQuerySchema)
    if ('response' in parsed) return parsed.response
    const invalidProject = await validateProjectFilter(context, repository, parsed.value.projectId)
    if (invalidProject) return invalidProject
    return context.json(await repository.listStandups(parsed.value))
  })

  app.put('/api/standups/:id', async (context) => {
    const parsed = await parseJson(context, saveStandupRequestSchema)
    if ('response' in parsed) return parsed.response
    const loadedData = await repository.loadData()
    const currentStandup = legacyStandupFromContractId(loadedData, context.req.param('id'))
    if (!currentStandup) return context.json({ message: 'Standup not found' }, 404)

    const items: Standup['items'] = []
    for (const item of parsed.value.items) {
      const memberId = legacyMemberIdFromContractId(loadedData, item.member_id)
      if (!memberId) return context.json({ message: 'Member not found' }, 400)
      items.push({
        memberId,
        yesterday: splitContractText(item.yesterday_text),
        today: splitContractText(item.today_text),
        blockers: splitContractText(item.blockers_text),
      })
    }

    const saved = await repository.saveStandup({ ...currentStandup, items })
    return saved ? context.json(await contractAppState(), 200) : context.json({ message: 'Standup not found' }, 404)
  })

  app.get('/api/milestones', async (context) => {
    const parsed = parseQuery(context, projectScopedQuerySchema)
    if ('response' in parsed) return parsed.response
    const invalidProject = await validateProjectFilter(context, repository, parsed.value.projectId)
    if (invalidProject) return invalidProject
    return context.json(await repository.listMilestones(parsed.value))
  })

  app.put('/api/milestones/:id', async (context) => {
    const parsed = await parseJson(context, saveMilestoneRequestSchema)
    if ('response' in parsed) return parsed.response
    const loadedData = await repository.loadData()
    const currentMilestone = legacyMilestoneFromContractId(loadedData, context.req.param('id'))
    if (!currentMilestone) return context.json({ message: 'Milestone not found' }, 404)
    const ownerId = legacyMemberIdFromContractId(loadedData, parsed.value.participant_member_id)
    if (!ownerId) return context.json({ message: 'Owner not found' }, 400)

    const result = await repository.saveMilestone({
      ...currentMilestone,
      title: parsed.value.title,
      startDay: parsed.value.start_day,
      endDay: parsed.value.end_day,
      status: parsed.value.status as MilestoneStatus,
      ownerId,
    })
    if (result === 'saved') return context.json(await contractAppState(), 200)
    const failure = saveMilestoneFailures[result]
    return context.json({ message: failure.message }, failure.status)
  })

  app.post('/api/feishu/query', async (context) => {
    const contractParsed = await parseJson(context, feishuQueryRequestSchema)
    if ('response' in contractParsed) return contractParsed.response
    const command = parseFeishuCommand(contractParsed.value.command)
    const reply = buildFeishuReply(command, await repository.loadData())
    await repository.saveFeishuQuery({
      id: crypto.randomUUID(),
      command,
      reply,
      createdAt: new Date().toISOString(),
    })
    return context.json(feishuQueryResponseSchema.parse({
      response_title: reply.title,
      response_body_json: { lines: reply.lines },
    }))
  })

  app.post('/api/feishu/notifications', async (context) => {
    const parsed = await parseJson(context, feishuNotificationSchema)
    if ('response' in parsed) return parsed.response
    const result = await repository.saveFeishuNotification(parsed.value)
    if (result !== 'saved') {
      const failure = saveFeishuNotificationFailures[result]
      return context.json({ message: failure.message }, failure.status)
    }
    return context.json(parsed.value, 201)
  })

  return app
}
