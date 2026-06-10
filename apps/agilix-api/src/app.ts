import { buildFeishuReply, parseFeishuCommand } from '@agilix/app/domain/feishu'
import {
  appStateResponseSchema,
  createDocumentCommentRequestSchema,
  createDocumentDirectoryRequestSchema,
  createDocumentRequestSchema,
  createIssueRequestSchema,
  createProjectRequestSchema,
  feishuQueryRequestSchema,
  feishuQueryResponseSchema,
  feishuNotificationRowSchema,
  recordFeishuNotificationRequestSchema,
  saveMilestoneRequestSchema,
  saveStandupRequestSchema,
  updateDocumentDirectoryRequestSchema,
  updateIssueStatusRequestSchema,
} from '@agilix/contract'
import type { RecordFeishuNotificationRequest } from '@agilix/contract'
import { Hono, type Context } from 'hono'
import type { z } from 'zod'
import type {
  FeishuNotificationPayload,
  MemberId,
  MilestoneStatus,
  SeedData,
  Standup,
} from '@agilix/app/domain/types'
import { contractId, legacyIssueKeyFromContractId, toAppStateResponse } from './appStateAdapter'
import { createSnowflakeIdGenerator } from './snowflake'
import type {
  AddDocCommentResult,
  AgiliXRepository,
  CreateDocResult,
  CreateDocDirectoryResult,
  CreateIssueResult,
  CreateProjectResult,
  SaveFeishuNotificationResult,
  SaveMilestoneResult,
  UpdateDocDirectoryResult,
} from './repository'
import {
  createProjectSchema,
  docCommentSchema,
  docQuerySchema,
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

const createDocDirectoryFailures = {
  'duplicate-directory': { message: 'Document directory already exists', status: 409 },
  'parent-directory-not-found': { message: 'Parent directory not found', status: 400 },
  'project-not-found': { message: 'Project not found', status: 400 },
  'directory-scope-mismatch': { message: 'Directory scope mismatch', status: 400 },
} satisfies Record<Exclude<CreateDocDirectoryResult, 'created'>, JsonFailure>

const updateDocDirectoryFailures = {
  'directory-not-found': { message: 'Document directory not found', status: 404 },
  'parent-directory-not-found': { message: 'Parent directory not found', status: 400 },
  'duplicate-directory': { message: 'Document directory already exists', status: 409 },
  'directory-scope-mismatch': { message: 'Directory scope mismatch', status: 400 },
} satisfies Record<Exclude<UpdateDocDirectoryResult, 'updated'>, JsonFailure>

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

const createIssueFailures = {
  'duplicate-issue': { message: 'Issue already exists', status: 409 },
  'project-not-found': { message: 'Project not found', status: 400 },
  'iteration-not-found': { message: 'Iteration not found', status: 400 },
  'handler-not-found': { message: 'Issue handler member not found', status: 400 },
  'collaborator-not-found': { message: 'Issue collaborator member not found', status: 400 },
  'duplicate-label': { message: 'Duplicate issue label', status: 400 },
  'duplicate-collaborator': { message: 'Duplicate issue collaborator', status: 400 },
} satisfies Record<Exclude<CreateIssueResult, 'created'>, JsonFailure>

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

function legacyProjectFromContractId(data: SeedData, projectId: string) {
  return data.projects.find((project) => contractId('project', project.id) === projectId)
}

function legacyIterationFromContractId(data: SeedData, iterationId: string) {
  return data.iterations.find((iteration) => contractId('iteration', iteration.id) === iterationId)
}

function legacyStandupFromContractId(data: SeedData, standupId: string) {
  return data.standups.find((standup) => contractId('standup', standup.id) === standupId)
}

function legacyMilestoneFromContractId(data: SeedData, milestoneId: string) {
  return data.milestones.find((milestone) => contractId('milestone', milestone.id) === milestoneId)
}

function legacyStandupIdFromContractId(data: SeedData, standupId: string) {
  return data.standups.find((standup) => contractId('standup', standup.id) === standupId)?.id
}

function legacyDocumentFromContractId(data: SeedData, documentId: string) {
  return data.docs.find((doc) => contractId('document', doc.id) === documentId)
}

function legacyDocumentIdFromContractId(data: SeedData, documentId: string) {
  return legacyDocumentFromContractId(data, documentId)?.id
}

function documentDirectoryPathFromContractId(data: SeedData, directoryId: string) {
  const state = toAppStateResponse(data)
  const directory = state.document_directories.find((item) => item.id === directoryId)
  if (!directory) return undefined
  return documentDirectoryPath(state.document_directories, directory.id)
}

function documentDirectoryPath(
  directories: ReturnType<typeof toAppStateResponse>['document_directories'],
  directoryId: string,
): string {
  const directory = directories.find((item) => item.id === directoryId)
  if (!directory) throw new Error(`Document directory not found: ${directoryId}`)
  if (directory.parent_id === null) return directory.name
  return `${documentDirectoryPath(directories, directory.parent_id)}/${directory.name}`
}

function legacyCommentIdFromContractId(data: SeedData, commentId: string) {
  for (const doc of data.docs) {
    const comment = doc.comments.find((item) => contractId('document-comment', item.id) === commentId)
    if (comment) return comment.id
  }
  return undefined
}

function nextIssueKey(data: SeedData, projectId: string) {
  const prefix = projectId.toUpperCase()
  let sequence = data.issues.filter((issue) => issue.projectId === projectId).length + 1
  let key = `${prefix}-${sequence}`
  const existingKeys = new Set(data.issues.map((issue) => issue.key))
  while (existingKeys.has(key)) {
    sequence += 1
    key = `${prefix}-${sequence}`
  }
  return key
}

function feishuGroupExists(data: SeedData, groupId: string) {
  return data.projects.some((project) => contractId('feishu-group', project.id) === groupId)
}

function legacyFeishuNotificationPayload(
  data: SeedData,
  input: RecordFeishuNotificationRequest,
): FeishuNotificationPayload {
  switch (input.trigger) {
    case '站会摘要':
      return {
        trigger: input.trigger,
        payload: {
          standupId:
            legacyStandupIdFromContractId(data, input.payload_json.standup_id) ??
            input.payload_json.standup_id,
        },
      }
    case '阻塞提醒': {
      const issueKeys = input.payload_json.issue_ids.map(
        (issueId) => legacyIssueKeyFromContractId(data, issueId) ?? issueId,
      ) as [string, ...string[]]
      return { trigger: input.trigger, payload: { issueKeys } }
    }
    case '文档评论': {
      const doc = legacyDocumentFromContractId(data, input.payload_json.document_id)
      return {
        trigger: input.trigger,
        payload: {
          docId: doc?.id ?? input.payload_json.document_id,
          commentId:
            legacyCommentIdFromContractId(data, input.payload_json.comment_id) ??
            input.payload_json.comment_id,
        },
      }
    }
  }
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
  const nextId = createSnowflakeIdGenerator({ epochMs: 1700000000000, workerId: 1 })

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

  app.post('/api/issues', async (context) => {
    const parsed = await parseJson(context, createIssueRequestSchema)
    if ('response' in parsed) return parsed.response
    const loadedData = await repository.loadData()
    const project = legacyProjectFromContractId(loadedData, parsed.value.project_id)
    if (!project) return context.json({ message: 'Project not found' }, 400)
    const iteration = legacyIterationFromContractId(loadedData, parsed.value.iteration_id)
    if (!iteration || iteration.projectId !== project.id)
      return context.json({ message: 'Iteration not found' }, 400)
    const handlerId = legacyMemberIdFromContractId(loadedData, parsed.value.handler_member_id)
    if (!handlerId) return context.json({ message: 'Issue handler member not found' }, 400)
    const collaboratorIds: MemberId[] = []
    for (const memberId of parsed.value.collaborator_member_ids) {
      const legacyMemberId = legacyMemberIdFromContractId(loadedData, memberId)
      if (!legacyMemberId) return context.json({ message: 'Issue collaborator member not found' }, 400)
      collaboratorIds.push(legacyMemberId)
    }

    const result = await repository.createIssue({
      id: nextId(),
      key: nextIssueKey(loadedData, project.id),
      projectId: project.id,
      iterationId: iteration.id,
      type: parsed.value.type,
      title: parsed.value.title,
      status: 'todo',
      priority: parsed.value.priority,
      assigneeId: handlerId,
      storyPoints: parsed.value.story_points,
      linkedDocIds: [],
      description: parsed.value.description,
      acceptanceCriteria: parsed.value.acceptance_criteria,
      epicName: parsed.value.epic_name,
      labels: parsed.value.labels,
      collaboratorIds,
      draft: parsed.value.draft,
    })
    if (result === 'created') return context.json(await contractAppState(), 201)
    const failure = createIssueFailures[result]
    return context.json({ message: failure.message }, failure.status)
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
    const parsed = await parseJson(context, createDocumentRequestSchema)
    if ('response' in parsed) return parsed.response
    const loadedData = await repository.loadData()
    const directory = documentDirectoryPathFromContractId(loadedData, parsed.value.directory_id)
    if (!directory) return context.json({ message: 'Document directory not found' }, 400)
    const project =
      parsed.value.project_id === null
        ? undefined
        : loadedData.projects.find((item) => contractId('project', item.id) === parsed.value.project_id)
    if (parsed.value.scope === 'project' && !project)
      return context.json({ message: 'Project not found' }, 400)
    if (parsed.value.scope === 'global' && parsed.value.project_id !== null)
      return context.json({ message: 'Global document project_id must be null' }, 400)
    const editorId = legacyMemberIdFromContractId(loadedData, parsed.value.editor_member_id)
    if (!editorId) return context.json({ message: 'Editor member not found' }, 400)
    const linkedIssueKeys = parsed.value.linked_issue_ids.map(
      (issueId) => legacyIssueKeyFromContractId(loadedData, issueId) ?? issueId,
    )

    const createDocInput = parsed.value.scope === 'global'
      ? {
          id: `doc-${nextId()}`,
          scope: 'global' as const,
          title: parsed.value.title,
          directory,
          body: parsed.value.body,
          linkedIssueKeys,
          comments: [],
          updatedAtLabel: new Date().toISOString(),
        }
      : {
          id: `doc-${nextId()}`,
          scope: 'project' as const,
          projectId: project?.id ?? '',
          title: parsed.value.title,
          directory,
          body: parsed.value.body,
          linkedIssueKeys,
          comments: [],
          updatedAtLabel: new Date().toISOString(),
        }
    const result = await repository.createDoc(createDocInput)
    if (result === 'created') return context.json(await contractAppState(), 201)
    const failure = createDocFailures[result]
    return context.json({ message: failure.message }, failure.status)
  })

  app.post('/api/document-directories', async (context) => {
    const parsed = await parseJson(context, createDocumentDirectoryRequestSchema)
    if ('response' in parsed) return parsed.response
    const loadedData = await repository.loadData()
    if (parsed.value.scope === 'global' && parsed.value.project_id !== null)
      return context.json({ message: 'Global directory project_id must be null' }, 400)
    const project =
      parsed.value.project_id === null
        ? undefined
        : loadedData.projects.find((item) => contractId('project', item.id) === parsed.value.project_id)
    if (parsed.value.scope === 'project' && !project)
      return context.json({ message: 'Project not found' }, 400)
    const parentPath =
      parsed.value.parent_id === null
        ? null
        : documentDirectoryPathFromContractId(loadedData, parsed.value.parent_id)
    if (parsed.value.parent_id !== null && !parentPath)
      return context.json({ message: 'Parent directory not found' }, 400)
    const path =
      parentPath ??
      (parsed.value.scope === 'global'
        ? parsed.value.name
        : `项目文档/${project?.name}/${parsed.value.name}`)
    const result = await repository.createDocDirectory({
      id: nextId(),
      scope: parsed.value.scope,
      projectId: project?.id,
      parentId: parsed.value.parent_id,
      path: parentPath ? `${parentPath}/${parsed.value.name}` : path,
      name: parsed.value.name,
    })
    if (result === 'created') return context.json(await contractAppState(), 201)
    const failure = createDocDirectoryFailures[result]
    return context.json({ message: failure.message }, failure.status)
  })

  app.patch('/api/document-directories/:id', async (context) => {
    const parsed = await parseJson(context, updateDocumentDirectoryRequestSchema)
    if ('response' in parsed) return parsed.response
    const result = await repository.updateDocDirectory({
      id: context.req.param('id'),
      name: parsed.value.name,
      parentId: parsed.value.parent_id,
    })
    if (result === 'updated') return context.json(await contractAppState(), 200)
    const failure = updateDocDirectoryFailures[result]
    return context.json({ message: failure.message }, failure.status)
  })

  app.get('/api/docs/:id', async (context) => {
    const doc = await repository.getDoc(context.req.param('id'))
    return doc ? context.json(doc) : context.json({ message: 'Document not found' }, 404)
  })

  app.post('/api/docs/:id/comments', async (context) => {
    const parsed = await parseJson(context, createDocumentCommentRequestSchema)
    if ('response' in parsed) return parsed.response
    const loadedData = await repository.loadData()
    const docId = legacyDocumentIdFromContractId(loadedData, context.req.param('id'))
    if (!docId) return context.json({ message: 'Document not found' }, 404)
    const authorId = legacyMemberIdFromContractId(loadedData, parsed.value.author_member_id)
    if (!authorId) return context.json({ message: 'Comment author not found' }, 400)
    const result = await repository.addDocComment(docId, {
      id: `comment-${nextId()}`,
      docId,
      authorId,
      body: parsed.value.body,
      resolved: false,
      createdAtLabel: new Date().toISOString(),
    })
    if (result === 'created') return context.json(await contractAppState(), 201)
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
      id: nextId(),
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
    const parsed = await parseJson(context, recordFeishuNotificationRequestSchema)
    if ('response' in parsed) return parsed.response
    const loadedData = await repository.loadData()
    if (!feishuGroupExists(loadedData, parsed.value.target_group_id))
      return context.json({ message: 'Feishu group not found' }, 400)

    const id = nextId()
    const createdAt = new Date().toISOString()
    const notification = {
      id,
      targetGroup: 'AgiliX 团队群' as const,
      status: 'queued' as const,
      createdAt,
      ...legacyFeishuNotificationPayload(loadedData, parsed.value),
    }
    const result = await repository.saveFeishuNotification(notification)
    if (result !== 'saved') {
      const failure = saveFeishuNotificationFailures[result]
      return context.json({ message: failure.message }, failure.status)
    }
    return context.json(feishuNotificationRowSchema.parse({
      id,
      trigger: parsed.value.trigger,
      target_group_id: parsed.value.target_group_id,
      payload_json: parsed.value.payload_json,
      status: 'queued',
      created_at: createdAt,
    }), 201)
  })

  return app
}
