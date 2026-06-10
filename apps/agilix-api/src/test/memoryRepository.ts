import { filterDocs, searchDocs } from '@agilix/app/domain/docs'
import { filterIssues, moveIssue } from '@agilix/app/domain/issues'
import type {
  BotConfigResponse,
  FeishuTestMessageResponse,
  SaveBotConfigRequest,
  SendFeishuTestMessageRequest,
} from '@agilix/contract'
import type {
  CreateProjectInput,
  Doc,
  DocComment,
  DocDirectory,
  Issue,
  IssueStatus,
  Milestone,
  SeedData,
  Standup,
} from '@agilix/app/domain/types'
import type {
  AgiliXRepository,
  CreateIssueInput,
  CreateIssueResult,
  CreateProjectResult,
  CreateDocDirectoryInput,
  CreateDocDirectoryResult,
  CreateDocInput,
  DocFilters,
  FeishuNotificationRecord,
  FeishuQueryRecord,
  IssueFilters,
  SaveAssignmentInput,
  SaveAssignmentResult,
  SaveBotConfigInput,
  SaveBotConfigResult,
  SaveFeishuNotificationResult,
  SaveMilestoneResult,
  SendFeishuTestMessageInput,
  SendFeishuTestMessageResult,
  UpdateDocDirectoryInput,
  UpdateDocDirectoryResult,
} from '../repository'
import { contractId, toAppStateResponse } from '../appStateAdapter'

function clone<T>(value: T): T {
  if (value === undefined) return undefined as T
  return JSON.parse(JSON.stringify(value)) as T
}

function assertUnique(values: string[], label: string) {
  const seen = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Duplicate seed ${label}: ${value}`)
    seen.add(value)
  }
}

function assertReference(values: Set<string>, value: string, message: string) {
  if (!values.has(value)) throw new Error(message)
}

function assertStandupMembers(memberIds: Set<string>, standup: Standup) {
  for (const item of standup.items) {
    assertReference(memberIds, item.memberId, `Standup member not found: ${item.memberId}`)
  }
}

function directoryAncestors(path: string): string[] {
  return path.split('/').map((_, index, parts) => parts.slice(0, index + 1).join('/'))
}

function directoryRows(data: SeedData): DocDirectory[] {
  const fromDocs = Array.from(new Set(data.docs.flatMap((doc) => directoryAncestors(doc.directory)))).map(
    (path): DocDirectory => {
      const project = data.projects.find((item) => path.startsWith(`项目文档/${item.name}`))
      const parentPath = path.split('/').length > 1 ? path.split('/').slice(0, -1).join('/') : null
      return {
        id: contractId('directory', path),
        scope: path.startsWith('全局文档') ? 'global' : 'project',
        projectId: project?.id,
        parentId: parentPath ? contractId('directory', parentPath) : null,
        path,
        name: path.split('/').at(-1) ?? path,
      }
    },
  )
  return [...fromDocs, ...(data.docDirectories ?? [])]
}

function replacePathPrefix(path: string, from: string, to: string) {
  return path === from ? to : path.startsWith(`${from}/`) ? `${to}${path.slice(from.length)}` : path
}

function initialBotConfig(data: SeedData, projectId: string): BotConfigResponse | undefined {
  const state = toAppStateResponse(data)
  const contractProjectId = contractId('project', projectId)
  if (!state.projects.some((project) => project.id === contractProjectId)) return undefined
  return {
    project_id: contractProjectId,
    groups: state.feishu_groups.filter((group) => group.project_id === contractProjectId),
    rules: state.feishu_bot_rules.filter((rule) => rule.project_id === contractProjectId),
  }
}

function assertSeedData(data: SeedData) {
  assertUnique(
    data.projects.map((project) => project.id),
    'project id',
  )
  assertUnique(
    data.members.map((member) => member.id),
    'member id',
  )
  assertUnique(
    data.iterations.map((iteration) => iteration.id),
    'iteration id',
  )
  assertUnique(
    data.iterations.map((iteration) => `${iteration.projectId}:${iteration.code}`),
    'iteration project code',
  )
  assertUnique(
    data.issues.map((issue) => issue.key),
    'issue key',
  )
  assertUnique(
    data.docs.map((doc) => doc.id),
    'document id',
  )
  assertUnique(
    data.docs.flatMap((doc) => doc.linkedIssueKeys.map((issueKey) => `${doc.id}:${issueKey}`)),
    'document issue link',
  )
  assertUnique(
    data.docs.flatMap((doc) => doc.comments.map((comment) => comment.id)),
    'document comment id',
  )
  assertUnique(
    data.standups.map((standup) => standup.id),
    'standup id',
  )
  assertUnique(
    data.milestones.map((milestone) => milestone.id),
    'milestone id',
  )

  const projectIds = new Set(data.projects.map((project) => project.id))
  const memberIds = new Set(data.members.map((member) => member.id))
  const iterationIds = new Set(data.iterations.map((iteration) => iteration.id))
  const issueKeys = new Set(data.issues.map((issue) => issue.key))
  const docIds = new Set(data.docs.map((doc) => doc.id))

  for (const iteration of data.iterations) {
    assertReference(
      projectIds,
      iteration.projectId,
      `Seed project not found: ${iteration.projectId}`,
    )
  }
  for (const issue of data.issues) {
    assertReference(projectIds, issue.projectId, `Seed project not found: ${issue.projectId}`)
    assertReference(
      iterationIds,
      issue.iterationId,
      `Seed iteration not found: ${issue.iterationId}`,
    )
    assertReference(memberIds, issue.assigneeId, `Seed member not found: ${issue.assigneeId}`)
    for (const docId of issue.linkedDocIds) {
      assertReference(docIds, docId, `Seed linked document not found: ${docId}`)
    }
  }
  for (const doc of data.docs) {
    if (doc.scope === 'project')
      assertReference(projectIds, doc.projectId, `Seed project not found: ${doc.projectId}`)
    for (const issueKey of doc.linkedIssueKeys) {
      assertReference(issueKeys, issueKey, `Seed linked issue not found: ${issueKey}`)
    }
    for (const comment of doc.comments) {
      if (comment.docId !== doc.id) throw new Error(`Seed comment document mismatch: ${comment.id}`)
      assertReference(docIds, comment.docId, `Seed comment document not found: ${comment.docId}`)
      assertReference(
        memberIds,
        comment.authorId,
        `Seed comment author not found: ${comment.authorId}`,
      )
    }
  }
  for (const standup of data.standups) {
    assertReference(projectIds, standup.projectId, `Seed project not found: ${standup.projectId}`)
    assertStandupMembers(memberIds, standup)
  }
  for (const milestone of data.milestones) {
    assertReference(
      projectIds,
      milestone.projectId,
      `Seed project not found: ${milestone.projectId}`,
    )
    assertReference(
      iterationIds,
      milestone.iterationId,
      `Seed iteration not found: ${milestone.iterationId}`,
    )
    assertReference(
      memberIds,
      milestone.ownerId,
      `Seed milestone owner not found: ${milestone.ownerId}`,
    )
  }
}

export function createMemoryRepository(seed: SeedData): AgiliXRepository {
  assertSeedData(seed)
  const data = clone(seed)
  const botConfigByProjectId = new Map<string, BotConfigResponse>()
  let generatedBotConfigId = 0
  let seeded =
    seed.projects.length > 0 ||
    seed.members.length > 0 ||
    seed.iterations.length > 0 ||
    seed.issues.length > 0 ||
    seed.docs.length > 0 ||
    seed.standups.length > 0 ||
    seed.milestones.length > 0
  const feishuNotifications: FeishuNotificationRecord[] = []
  const feishuQueries: FeishuQueryRecord[] = []

  function nextBotConfigId(prefix: string) {
    generatedBotConfigId += 1
    return `${prefix}-${generatedBotConfigId}`
  }

  function validateMilestoneReferences(milestone: Milestone): SaveMilestoneResult {
    if (!data.milestones.some((item) => item.id === milestone.id)) return 'milestone-not-found'
    if (!data.projects.some((project) => project.id === milestone.projectId))
      return 'project-not-found'
    if (
      !data.iterations.some(
        (iteration) =>
          iteration.id === milestone.iterationId && iteration.projectId === milestone.projectId,
      )
    )
      return 'iteration-not-found'
    if (!data.members.some((member) => member.id === milestone.ownerId)) return 'owner-not-found'
    return 'saved'
  }

  function validateCreateProject(input: CreateProjectInput): CreateProjectResult {
    if (input.project.id !== input.iteration.projectId) return 'project-iteration-mismatch'
    if (input.project.activeIterationCode !== input.iteration.code)
      return 'active-iteration-code-mismatch'
    if (data.projects.some((project) => project.id === input.project.id)) return 'duplicate-project'
    if (
      data.iterations.some(
        (iteration) =>
          iteration.id === input.iteration.id ||
          (iteration.projectId === input.project.id && iteration.code === input.iteration.code),
      )
    )
      return 'duplicate-iteration'
    return 'created'
  }

  function validateCreateIssue(input: CreateIssueInput): CreateIssueResult {
    if (data.issues.some((issue) => issue.id === input.id || issue.key === input.key))
      return 'duplicate-issue'
    if (!data.projects.some((project) => project.id === input.projectId)) return 'project-not-found'
    if (
      !data.iterations.some(
        (iteration) =>
          iteration.id === input.iterationId && iteration.projectId === input.projectId,
      )
    )
      return 'iteration-not-found'
    if (!data.members.some((member) => member.id === input.assigneeId)) return 'handler-not-found'
    if (!input.collaboratorIds.every((memberId) => data.members.some((member) => member.id === memberId)))
      return 'collaborator-not-found'
    if (new Set(input.labels).size !== input.labels.length) return 'duplicate-label'
    if (new Set(input.collaboratorIds).size !== input.collaboratorIds.length)
      return 'duplicate-collaborator'
    return 'created'
  }

  function validateFeishuNotificationReferences(
    input: FeishuNotificationRecord,
  ): SaveFeishuNotificationResult {
    switch (input.trigger) {
      case '站会摘要':
        return data.standups.some((standup) => standup.id === input.payload.standupId)
          ? 'saved'
          : 'standup-not-found'
      case '阻塞提醒': {
        const issueKeys = new Set(data.issues.map((issue) => issue.key))
        return input.payload.issueKeys.every((issueKey) => issueKeys.has(issueKey))
          ? 'saved'
          : 'issue-not-found'
      }
      case '文档评论': {
        const doc = data.docs.find((item) => item.id === input.payload.docId)
        if (!doc) return 'document-not-found'
        return doc.comments.some((comment) => comment.id === input.payload.commentId)
          ? 'saved'
          : 'comment-not-found'
      }
    }
  }

  function saveBotConfigRows(input: SaveBotConfigInput): SaveBotConfigResult {
    const project = data.projects.find((item) => item.id === input.projectId)
    if (!project) return { status: 'project-not-found' }
    const contractProjectId = contractId('project', project.id)
    const groups = input.request.groups.map((group) => ({
      id: group.id ?? nextBotConfigId('feishu-group'),
      project_id: contractProjectId,
      name: group.name,
      purpose: group.purpose,
      member_count_label: group.member_count_label,
      status: group.status,
      sort_order: group.sort_order,
    }))
    const groupIds = new Set(groups.map((group) => group.id))
    if (input.request.rules.some((rule) => !groupIds.has(rule.target_group_id)))
      return { status: 'target-group-not-found' }
    const rules = input.request.rules.map((rule) => ({
      id: rule.id ?? nextBotConfigId('feishu-rule'),
      project_id: contractProjectId,
      rule_type: rule.rule_type,
      title: rule.title,
      description: rule.description,
      schedule_label: rule.schedule_label,
      target_group_id: rule.target_group_id,
      enabled: rule.enabled,
      sort_order: rule.sort_order,
    }))
    const config = { project_id: contractProjectId, groups, rules }
    botConfigByProjectId.set(project.id, clone(config))
    return { status: 'saved', config }
  }

  return {
    async seed(nextData) {
      if (seeded) throw new Error('Repository already seeded')
      assertSeedData(nextData)
      Object.assign(data, clone(nextData))
      seeded = true
    },
    async listProjects() {
      return clone(data.projects)
    },
    async createProject(input) {
      const result = validateCreateProject(input)
      if (result !== 'created') return result
      data.projects = [...data.projects, clone(input.project)]
      data.iterations = [...data.iterations, clone(input.iteration)]
      return 'created'
    },
    async listIssues(filters: IssueFilters) {
      return clone(filterIssues(data.issues, filters))
    },
    async saveAssignment(input: SaveAssignmentInput): Promise<SaveAssignmentResult> {
      if (!data.issues.some((issue) => issue.key === input.issueKey)) return 'issue-not-found'
      if (!data.members.some((member) => member.id === input.handlerId)) return 'handler-not-found'
      if (!input.collaboratorIds.every((memberId) => data.members.some((member) => member.id === memberId)))
        return 'collaborator-not-found'
      if (new Set(input.collaboratorIds).size !== input.collaboratorIds.length)
        return 'duplicate-collaborator'
      data.issues = data.issues.map((issue) =>
        issue.key === input.issueKey
          ? { ...issue, assigneeId: input.handlerId, collaboratorIds: input.collaboratorIds }
          : issue,
      )
      return 'saved'
    },
    async createIssue(input) {
      const result = validateCreateIssue(input)
      if (result !== 'created') return result
      const issue: Issue = clone(input)
      data.issues = [...data.issues, issue]
      return 'created'
    },
    async moveIssue(issueKey: string, status: IssueStatus) {
      if (!data.issues.some((issue) => issue.key === issueKey)) return false
      data.issues = moveIssue(data.issues, issueKey, status)
      return true
    },
    async listDocs(filters: DocFilters) {
      const docs = filterDocs(data.docs, filters.projectId)
      return clone(filters.query === '' ? docs : searchDocs(docs, filters.query))
    },
    async getDoc(docId: string) {
      return clone(data.docs.find((doc) => doc.id === docId))
    },
    async createDoc(doc: CreateDocInput) {
      if (data.docs.some((item) => item.id === doc.id)) return 'duplicate-document'
      if (doc.comments.length > 0) return 'document-comments-not-empty'
      if (new Set(doc.linkedIssueKeys).size !== doc.linkedIssueKeys.length)
        return 'duplicate-linked-issue'
      if (
        !doc.linkedIssueKeys.every((issueKey) =>
          data.issues.some((issue) => issue.key === issueKey),
        )
      )
        return 'linked-issue-not-found'
      data.docs = [...data.docs, clone(doc)]
      return 'created'
    },
    async createDocDirectory(input: CreateDocDirectoryInput): Promise<CreateDocDirectoryResult> {
      const existingPaths = new Set([
        ...data.docs.flatMap((doc) => directoryAncestors(doc.directory)),
        ...(data.docDirectories?.map((directory) => directory.path) ?? []),
      ])
      if (existingPaths.has(input.path)) return 'duplicate-directory'
      if (input.scope === 'project' && !input.projectId) return 'project-not-found'
      if (input.projectId && !data.projects.some((project) => project.id === input.projectId))
        return 'project-not-found'
      if (input.parentId !== null) {
        const parent = directoryRows(data).find((directory) => directory.id === input.parentId)
        if (!parent) return 'parent-directory-not-found'
        if (parent.scope !== input.scope || parent.projectId !== input.projectId)
          return 'directory-scope-mismatch'
      }
      const nextDirectory: DocDirectory = clone(input)
      data.docDirectories = [...(data.docDirectories ?? []), nextDirectory]
      return 'created'
    },
    async updateDocDirectory(input: UpdateDocDirectoryInput): Promise<UpdateDocDirectoryResult> {
      const directories = directoryRows(data)
      const directory = directories.find((item) => item.id === input.id)
      if (!directory) return 'directory-not-found'
      const parent =
        input.parentId === undefined || input.parentId === null
          ? undefined
          : directories.find((item) => item.id === input.parentId)
      if (input.parentId !== undefined && input.parentId !== null && !parent)
        return 'parent-directory-not-found'
      if (parent && (parent.scope !== directory.scope || parent.projectId !== directory.projectId))
        return 'directory-scope-mismatch'
      const nextName = input.name ?? directory.name
      const nextParentPath =
        input.parentId === undefined
          ? directory.path.split('/').slice(0, -1).join('/')
          : parent?.path ?? ''
      const nextPath = nextParentPath ? `${nextParentPath}/${nextName}` : nextName
      if (nextPath !== directory.path && directories.some((item) => item.path === nextPath))
        return 'duplicate-directory'
      const existingExplicit = data.docDirectories ?? []
      const nextDirectory: DocDirectory = {
        ...directory,
        name: nextName,
        parentId: input.parentId === undefined ? directory.parentId : input.parentId,
        path: nextPath,
      }
      data.docDirectories = existingExplicit.some((item) => item.id === input.id)
        ? existingExplicit.map((item) =>
            item.id === input.id
                ? nextDirectory
                : item.path.startsWith(directory.path)
                  ? { ...item, path: replacePathPrefix(item.path, directory.path, nextPath) }
                : item,
          )
        : [...existingExplicit, nextDirectory]
      data.docs = data.docs.map((doc) => ({
        ...doc,
        directory: replacePathPrefix(doc.directory, directory.path, nextPath),
      }))
      return 'updated'
    },
    async addDocComment(docId: string, comment: DocComment) {
      if (comment.docId !== docId) return 'comment-doc-id-mismatch'
      if (!data.docs.some((doc) => doc.id === docId)) return 'document-not-found'
      data.docs = data.docs.map(
        (doc): Doc => (doc.id === docId ? { ...doc, comments: [...doc.comments, comment] } : doc),
      )
      return 'created'
    },
    async listStandups(filters) {
      return clone(
        filters.projectId === 'all'
          ? data.standups
          : data.standups.filter((standup) => standup.projectId === filters.projectId),
      )
    },
    async saveStandup(standup: Standup) {
      if (!data.standups.some((item) => item.id === standup.id)) return false
      assertStandupMembers(new Set(data.members.map((member) => member.id)), standup)
      data.standups = [...data.standups.filter((item) => item.id !== standup.id), standup]
      return true
    },
    async listMilestones(filters) {
      return clone(
        filters.projectId === 'all'
          ? data.milestones
          : data.milestones.filter((milestone) => milestone.projectId === filters.projectId),
      )
    },
    async saveMilestone(milestone: Milestone) {
      const result = validateMilestoneReferences(milestone)
      if (result !== 'saved') return result
      data.milestones = [...data.milestones.filter((item) => item.id !== milestone.id), milestone]
      return 'saved'
    },
    async saveFeishuNotification(input) {
      const result = validateFeishuNotificationReferences(input)
      if (result !== 'saved') return result
      feishuNotifications.push(clone(input))
      return 'saved'
    },
    async saveFeishuQuery(input) {
      feishuQueries.push(clone(input))
    },
    async listFeishuNotifications() {
      return clone(feishuNotifications)
    },
    async getBotConfig(projectId) {
      if (!data.projects.some((project) => project.id === projectId))
        return { status: 'project-not-found' }
      const config = botConfigByProjectId.get(projectId) ?? initialBotConfig(data, projectId)
      if (!config) return { status: 'project-not-found' }
      return { status: 'found', config: clone(config) }
    },
    async saveBotConfig(input) {
      return saveBotConfigRows(input)
    },
    async sendFeishuTestMessage(input: SendFeishuTestMessageInput): Promise<SendFeishuTestMessageResult> {
      const state = toAppStateResponse(data)
      const savedGroups = Array.from(botConfigByProjectId.values()).flatMap((config) => config.groups)
      const groupExists =
        state.feishu_groups.some((group) => group.id === input.target_group_id) ||
        savedGroups.some((group) => group.id === input.target_group_id)
      if (!groupExists) return { status: 'target-group-not-found' }
      const message: FeishuTestMessageResponse = {
        notification: {
          id: input.id,
          trigger: '测试消息',
          target_group_id: input.target_group_id,
          payload_json: { card_title: input.card_title },
          status: 'queued',
          created_at: input.createdAt,
        },
        card: { title: input.card_title, body: { source: 'AgiliX' } },
      }
      return { status: 'sent', message }
    },
    async listFeishuQueries() {
      return clone(feishuQueries)
    },
    async loadData() {
      return clone(data)
    },
  }
}
