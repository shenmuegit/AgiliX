import { buildFeishuReply } from '@agilix/app/domain/feishu'
import { Hono, type Context } from 'hono'
import type { z } from 'zod'
import type { AddDocCommentResult, AgiliXRepository, CreateDocResult, SaveFeishuNotificationResult, SaveMilestoneResult } from './repository'
import {
  docCommentSchema,
  docQuerySchema,
  docSchema,
  feishuNotificationSchema,
  feishuQuerySchema,
  issueQuerySchema,
  milestoneSchema,
  moveIssueSchema,
  projectScopedQuerySchema,
  standupSchema,
} from './schema'

type ParseResult<T> = { value: T; response?: never } | { value?: never; response: Response }
type JsonFailure = { message: string; status: 400 | 404 | 409 }

const createDocFailures = {
  'duplicate-document': { message: 'Document already exists', status: 409 },
  'duplicate-linked-issue': { message: 'Duplicate linked issue', status: 400 },
  'linked-issue-not-found': { message: 'Linked issue not found', status: 400 },
  'document-comments-not-empty': { message: 'Document comments must be empty on create', status: 400 },
} satisfies Record<Exclude<CreateDocResult, 'created'>, JsonFailure>

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

async function parseJson<T>(context: Context, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<ParseResult<T>> {
  let json: unknown
  try {
    json = await context.req.json()
  } catch {
    return { response: context.json({ message: 'Malformed JSON' }, 400) }
  }

  const parsed = schema.safeParse(json)
  if (!parsed.success) return { response: context.json({ message: 'Validation error', issues: parsed.error.issues }, 400) }
  return { value: parsed.data }
}

function parseQuery<T>(context: Context, schema: z.ZodType<T, z.ZodTypeDef, unknown>): ParseResult<T> {
  const parsed = schema.safeParse(context.req.query())
  if (!parsed.success) return { response: context.json({ message: 'Validation error', issues: parsed.error.issues }, 400) }
  return { value: parsed.data }
}

function idMismatch(context: Context, message: string) {
  return context.json({ message }, 400)
}

export function createApp(repository: AgiliXRepository) {
  const app = new Hono()

  app.get('/api/bootstrap', async (context) => context.json(await repository.loadData()))

  app.get('/api/projects', async (context) => context.json(await repository.listProjects()))

  app.get('/api/issues', async (context) => {
    const parsed = parseQuery(context, issueQuerySchema)
    if ('response' in parsed) return parsed.response
    return context.json(await repository.listIssues(parsed.value))
  })

  app.patch('/api/issues/:key/status', async (context) => {
    const parsed = await parseJson(context, moveIssueSchema)
    if ('response' in parsed) return parsed.response
    const moved = await repository.moveIssue(context.req.param('key'), parsed.value.status)
    return moved ? context.body(null, 204) : context.json({ message: 'Issue not found' }, 404)
  })

  app.get('/api/docs', async (context) => {
    const parsed = parseQuery(context, docQuerySchema)
    if ('response' in parsed) return parsed.response
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
    if (parsed.value.docId !== context.req.param('id')) return idMismatch(context, 'Comment docId must match route id')
    const result = await repository.addDocComment(context.req.param('id'), parsed.value)
    if (result === 'created') return context.json(parsed.value, 201)
    const failure = addDocCommentFailures[result]
    return context.json({ message: failure.message }, failure.status)
  })

  app.get('/api/standups', async (context) => {
    const parsed = parseQuery(context, projectScopedQuerySchema)
    if ('response' in parsed) return parsed.response
    return context.json(await repository.listStandups(parsed.value))
  })

  app.put('/api/standups/:id', async (context) => {
    const parsed = await parseJson(context, standupSchema)
    if ('response' in parsed) return parsed.response
    if (parsed.value.id !== context.req.param('id')) return idMismatch(context, 'Standup id must match route id')
    const saved = await repository.saveStandup(parsed.value)
    return saved ? context.body(null, 204) : context.json({ message: 'Standup not found' }, 404)
  })

  app.get('/api/milestones', async (context) => {
    const parsed = parseQuery(context, projectScopedQuerySchema)
    if ('response' in parsed) return parsed.response
    return context.json(await repository.listMilestones(parsed.value))
  })

  app.put('/api/milestones/:id', async (context) => {
    const parsed = await parseJson(context, milestoneSchema)
    if ('response' in parsed) return parsed.response
    if (parsed.value.id !== context.req.param('id')) return idMismatch(context, 'Milestone id must match route id')
    const result = await repository.saveMilestone(parsed.value)
    if (result === 'saved') return context.body(null, 204)
    const failure = saveMilestoneFailures[result]
    return context.json({ message: failure.message }, failure.status)
  })

  app.post('/api/feishu/query', async (context) => {
    const parsed = await parseJson(context, feishuQuerySchema)
    if ('response' in parsed) return parsed.response
    const reply = buildFeishuReply(parsed.value.command, await repository.loadData())
    await repository.saveFeishuQuery({ id: crypto.randomUUID(), command: parsed.value.command, reply, createdAt: new Date().toISOString() })
    return context.json(reply)
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
