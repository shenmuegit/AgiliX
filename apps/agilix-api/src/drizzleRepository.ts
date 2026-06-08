import { filterDocs, searchDocs } from '@agilix/app/domain/docs'
import {
  createDocQueryCommand,
  formatFeishuCommand,
  parseFeishuCommand,
} from '@agilix/app/domain/feishu'
import { filterIssues } from '@agilix/app/domain/issues'
import type {
  Doc,
  DocComment,
  CreateProjectInput,
  Issue,
  IssueStatus,
  Iteration,
  IterationCalendarWeek,
  Member,
  Milestone,
  Project,
  SeedData,
  Standup,
} from '@agilix/app/domain/types'
import { eq } from 'drizzle-orm'
import * as dbSchema from './db/schema'
import type { TransactionDatabase } from './db/transaction'
import type {
  AgiliXRepository,
  CreateDocInput,
  CreateProjectResult,
  DocFilters,
  FeishuNotificationRecord,
  FeishuQueryRecord,
  IssueFilters,
  SaveFeishuNotificationResult,
  SaveMilestoneResult,
} from './repository'
import {
  docScopeSchema,
  feishuNotificationSchema,
  issueStatusSchema,
  issueTypeSchema,
  memberIdSchema,
  milestoneStatusSchema,
  prioritySchema,
  projectIdSchema,
  stringArraySchema,
} from './schema'

function toProject(row: typeof dbSchema.projects.$inferSelect): Project {
  return { ...row, id: projectIdSchema.parse(row.id) }
}

function toMember(row: typeof dbSchema.members.$inferSelect): Member {
  return { ...row, id: memberIdSchema.parse(row.id) }
}

function toIteration(row: typeof dbSchema.iterations.$inferSelect): Iteration {
  const { calendarWeeksJson, ...iteration } = row
  return {
    ...iteration,
    projectId: projectIdSchema.parse(row.projectId),
    calendarWeeks: parseIterationCalendarWeeks(calendarWeeksJson, row.id),
  }
}

function toIssue(row: typeof dbSchema.issues.$inferSelect, linkedDocIds: string[]): Issue {
  return {
    ...row,
    projectId: projectIdSchema.parse(row.projectId),
    type: issueTypeSchema.parse(row.type),
    status: issueStatusSchema.parse(row.status),
    priority: prioritySchema.parse(row.priority),
    assigneeId: memberIdSchema.parse(row.assigneeId),
    blockerReason: row.blockerReason === null ? undefined : row.blockerReason,
    linkedDocIds,
  }
}

function toDocComment(row: typeof dbSchema.docComments.$inferSelect): DocComment {
  return { ...row, authorId: memberIdSchema.parse(row.authorId) }
}

function toDoc(
  row: typeof dbSchema.documents.$inferSelect,
  linkedIssueKeys: string[],
  comments: DocComment[],
): Doc {
  const scope = docScopeSchema.parse(row.scope)
  if (scope === 'global') {
    if (row.projectId !== null) throw new Error(`Global document cannot have projectId: ${row.id}`)
    return {
      id: row.id,
      scope,
      title: row.title,
      directory: row.directory,
      body: row.body,
      linkedIssueKeys,
      comments,
      updatedAtLabel: row.updatedAtLabel,
    }
  }

  return {
    id: row.id,
    scope,
    projectId: projectIdSchema.parse(row.projectId),
    title: row.title,
    directory: row.directory,
    body: row.body,
    linkedIssueKeys,
    comments,
    updatedAtLabel: row.updatedAtLabel,
  }
}

function toMilestone(row: typeof dbSchema.milestones.$inferSelect): Milestone {
  return {
    ...row,
    projectId: projectIdSchema.parse(row.projectId),
    status: milestoneStatusSchema.parse(row.status),
    ownerId: memberIdSchema.parse(row.ownerId),
  }
}

function parseIterationCalendarWeeks(value: string, iterationId: string): IterationCalendarWeek[] {
  const parsed = JSON.parse(value)
  if (!Array.isArray(parsed) || parsed.length === 0)
    throw new Error(`Iteration calendar weeks must be a non-empty array: ${iterationId}`)
  return parsed.map((week, index) => {
    if (typeof week !== 'object' || week === null)
      throw new Error(`Iteration calendar week must be an object: ${iterationId}/${index}`)
    if (typeof week.label !== 'string' || week.label.length === 0)
      throw new Error(`Iteration calendar week label is required: ${iterationId}/${index}`)
    if (typeof week.rangeLabel !== 'string' || week.rangeLabel.length === 0)
      throw new Error(`Iteration calendar week range is required: ${iterationId}/${index}`)
    if (
      !Array.isArray(week.days) ||
      week.days.length === 0 ||
      week.days.some((day: unknown) => typeof day !== 'string' || day.length === 0)
    ) {
      throw new Error(`Iteration calendar week days are required: ${iterationId}/${index}`)
    }
    return { label: week.label, rangeLabel: week.rangeLabel, days: week.days }
  })
}

function toIterationRecord(iteration: Iteration): typeof dbSchema.iterations.$inferInsert {
  const { calendarWeeks, ...record } = iteration
  return { ...record, calendarWeeksJson: JSON.stringify(calendarWeeks) }
}

function toFeishuNotification(
  row: typeof dbSchema.feishuNotifications.$inferSelect,
): FeishuNotificationRecord {
  return feishuNotificationSchema.parse({
    id: row.id,
    trigger: row.trigger,
    targetGroup: row.targetGroup,
    payload: JSON.parse(row.payloadJson),
    status: row.status,
    createdAt: row.createdAt,
  })
}

function toFeishuQuery(row: typeof dbSchema.feishuQueries.$inferSelect): FeishuQueryRecord {
  return {
    id: row.id,
    command: parseFeishuCommand(row.command),
    reply: {
      title: row.responseTitle,
      lines: stringArraySchema.parse(JSON.parse(row.responseBodyJson)),
    },
    createdAt: row.createdAt,
  }
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

function assertPersistedProjectReference(
  projectIds: Set<string>,
  projectId: string,
  owner: string,
) {
  assertReference(projectIds, projectId, `Persisted project not found for ${owner}: ${projectId}`)
}

function assertStandupMembers(memberIds: Set<string>, standup: Standup) {
  for (const item of standup.items) {
    assertReference(memberIds, item.memberId, `Standup member not found: ${item.memberId}`)
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

async function assertRepositoryEmpty(db: TransactionDatabase) {
  const [project] = await db.select({ id: dbSchema.projects.id }).from(dbSchema.projects).limit(1)
  const [member] = await db.select({ id: dbSchema.members.id }).from(dbSchema.members).limit(1)
  const [iteration] = await db
    .select({ id: dbSchema.iterations.id })
    .from(dbSchema.iterations)
    .limit(1)
  const [issue] = await db.select({ key: dbSchema.issues.key }).from(dbSchema.issues).limit(1)
  const [issueEvent] = await db
    .select({ id: dbSchema.issueEvents.id })
    .from(dbSchema.issueEvents)
    .limit(1)
  const [doc] = await db.select({ id: dbSchema.documents.id }).from(dbSchema.documents).limit(1)
  const [docIssueLink] = await db
    .select({ docId: dbSchema.docIssueLinks.docId })
    .from(dbSchema.docIssueLinks)
    .limit(1)
  const [docComment] = await db
    .select({ id: dbSchema.docComments.id })
    .from(dbSchema.docComments)
    .limit(1)
  const [standup] = await db.select({ id: dbSchema.standups.id }).from(dbSchema.standups).limit(1)
  const [standupItem] = await db
    .select({ id: dbSchema.standupItems.id })
    .from(dbSchema.standupItems)
    .limit(1)
  const [milestone] = await db
    .select({ id: dbSchema.milestones.id })
    .from(dbSchema.milestones)
    .limit(1)
  const [feishuNotification] = await db
    .select({ id: dbSchema.feishuNotifications.id })
    .from(dbSchema.feishuNotifications)
    .limit(1)
  const [feishuQuery] = await db
    .select({ id: dbSchema.feishuQueries.id })
    .from(dbSchema.feishuQueries)
    .limit(1)

  if (
    project ||
    member ||
    iteration ||
    issue ||
    issueEvent ||
    doc ||
    docIssueLink ||
    docComment ||
    standup ||
    standupItem ||
    milestone ||
    feishuNotification ||
    feishuQuery
  ) {
    throw new Error('Repository already seeded')
  }
}

async function validateMilestoneReferences(
  db: TransactionDatabase,
  milestone: Milestone,
): Promise<SaveMilestoneResult> {
  const [existing] = await db
    .select({ id: dbSchema.milestones.id })
    .from(dbSchema.milestones)
    .where(eq(dbSchema.milestones.id, milestone.id))
  if (!existing) return 'milestone-not-found'
  const [project] = await db
    .select({ id: dbSchema.projects.id })
    .from(dbSchema.projects)
    .where(eq(dbSchema.projects.id, milestone.projectId))
  if (!project) return 'project-not-found'
  const [iteration] = await db
    .select({ projectId: dbSchema.iterations.projectId })
    .from(dbSchema.iterations)
    .where(eq(dbSchema.iterations.id, milestone.iterationId))
  if (!iteration || iteration.projectId !== milestone.projectId) return 'iteration-not-found'
  const [owner] = await db
    .select({ id: dbSchema.members.id })
    .from(dbSchema.members)
    .where(eq(dbSchema.members.id, milestone.ownerId))
  if (!owner) return 'owner-not-found'
  return 'saved'
}

async function validateCreateProject(
  db: TransactionDatabase,
  input: CreateProjectInput,
): Promise<CreateProjectResult> {
  if (input.project.id !== input.iteration.projectId) return 'project-iteration-mismatch'
  if (input.project.activeIterationCode !== input.iteration.code)
    return 'active-iteration-code-mismatch'
  const [project] = await db
    .select({ id: dbSchema.projects.id })
    .from(dbSchema.projects)
    .where(eq(dbSchema.projects.id, input.project.id))
  if (project) return 'duplicate-project'
  const iterations = await db
    .select({
      id: dbSchema.iterations.id,
      projectId: dbSchema.iterations.projectId,
      code: dbSchema.iterations.code,
    })
    .from(dbSchema.iterations)
  if (
    iterations.some(
      (iteration) =>
        iteration.id === input.iteration.id ||
        (iteration.projectId === input.project.id && iteration.code === input.iteration.code),
    )
  )
    return 'duplicate-iteration'
  return 'created'
}

async function validateFeishuNotificationReferences(
  db: TransactionDatabase,
  input: FeishuNotificationRecord,
): Promise<SaveFeishuNotificationResult> {
  switch (input.trigger) {
    case '站会摘要': {
      const [standup] = await db
        .select({ id: dbSchema.standups.id })
        .from(dbSchema.standups)
        .where(eq(dbSchema.standups.id, input.payload.standupId))
      return standup ? 'saved' : 'standup-not-found'
    }
    case '阻塞提醒': {
      const issueRows = await db.select({ key: dbSchema.issues.key }).from(dbSchema.issues)
      const issueKeys = new Set(issueRows.map((issue) => issue.key))
      return input.payload.issueKeys.every((issueKey) => issueKeys.has(issueKey))
        ? 'saved'
        : 'issue-not-found'
    }
    case '文档评论': {
      const [doc] = await db
        .select({ id: dbSchema.documents.id })
        .from(dbSchema.documents)
        .where(eq(dbSchema.documents.id, input.payload.docId))
      if (!doc) return 'document-not-found'
      const [comment] = await db
        .select({ docId: dbSchema.docComments.docId })
        .from(dbSchema.docComments)
        .where(eq(dbSchema.docComments.id, input.payload.commentId))
      return comment?.docId === input.payload.docId ? 'saved' : 'comment-not-found'
    }
  }
}

function toStandupItemRecord(
  standupId: string,
  item: Standup['items'][number],
  index: number,
): typeof dbSchema.standupItems.$inferInsert {
  return {
    id: `${standupId}-${item.memberId}-${index}`,
    standupId,
    memberId: item.memberId,
    yesterdayJson: JSON.stringify(item.yesterday),
    todayJson: JSON.stringify(item.today),
    blockersJson: JSON.stringify(item.blockers),
  }
}

export function createDrizzleRepository(db: TransactionDatabase): AgiliXRepository {
  async function listProjects() {
    return (await db.select().from(dbSchema.projects)).map(toProject)
  }

  async function listIssues(filters: IssueFilters) {
    const rows = await db.select().from(dbSchema.issues)
    const links = await db.select().from(dbSchema.docIssueLinks)
    const projectIds = new Set(
      (await db.select({ id: dbSchema.projects.id }).from(dbSchema.projects)).map(
        (project) => project.id,
      ),
    )
    const issues = rows.map((issue) => {
      assertPersistedProjectReference(projectIds, issue.projectId, issue.key)
      return toIssue(
        issue,
        links.filter((link) => link.issueKey === issue.key).map((link) => link.docId),
      )
    })
    return filterIssues(issues, filters)
  }

  async function listDocs(filters: DocFilters) {
    const docs = await db.select().from(dbSchema.documents)
    const comments = (await db.select().from(dbSchema.docComments)).map(toDocComment)
    const links = await db.select().from(dbSchema.docIssueLinks)
    const projectIds = new Set(
      (await db.select({ id: dbSchema.projects.id }).from(dbSchema.projects)).map(
        (project) => project.id,
      ),
    )
    const domainDocs = docs.map((doc) => {
      if (doc.projectId !== null) assertPersistedProjectReference(projectIds, doc.projectId, doc.id)
      return toDoc(
        doc,
        links.filter((link) => link.docId === doc.id).map((link) => link.issueKey),
        comments.filter((comment) => comment.docId === doc.id),
      )
    })
    const scopedDocs = filterDocs(domainDocs, filters.projectId)
    return filters.query === '' ? scopedDocs : searchDocs(scopedDocs, filters.query)
  }

  async function listStandups(filters: { projectId: SeedData['projects'][number]['id'] | 'all' }) {
    const standups = await db.select().from(dbSchema.standups)
    const items = await db.select().from(dbSchema.standupItems)
    const projectIds = new Set(
      (await db.select({ id: dbSchema.projects.id }).from(dbSchema.projects)).map(
        (project) => project.id,
      ),
    )
    const domainStandups = standups.map((standup): Standup => {
      assertPersistedProjectReference(projectIds, standup.projectId, standup.id)
      return {
        ...standup,
        projectId: projectIdSchema.parse(standup.projectId),
        items: items
          .filter((item) => item.standupId === standup.id)
          .map((item) => ({
            memberId: memberIdSchema.parse(item.memberId),
            yesterday: stringArraySchema.parse(JSON.parse(item.yesterdayJson)),
            today: stringArraySchema.parse(JSON.parse(item.todayJson)),
            blockers: stringArraySchema.parse(JSON.parse(item.blockersJson)),
          })),
      }
    })
    return domainStandups.filter(
      (standup) => filters.projectId === 'all' || standup.projectId === filters.projectId,
    )
  }

  async function listMilestones(filters: {
    projectId: SeedData['projects'][number]['id'] | 'all'
  }) {
    const projectIds = new Set(
      (await db.select({ id: dbSchema.projects.id }).from(dbSchema.projects)).map(
        (project) => project.id,
      ),
    )
    const milestones = (await db.select().from(dbSchema.milestones)).map((milestone) => {
      assertPersistedProjectReference(projectIds, milestone.projectId, milestone.id)
      return toMilestone(milestone)
    })
    return milestones.filter(
      (milestone) => filters.projectId === 'all' || milestone.projectId === filters.projectId,
    )
  }

  return {
    async seed(data: SeedData) {
      assertSeedData(data)
      await assertRepositoryEmpty(db)
      const docIssueLinks = data.docs.flatMap((doc) =>
        doc.linkedIssueKeys.map((issueKey) => ({ docId: doc.id, issueKey })),
      )
      const docComments = data.docs.flatMap((doc) => doc.comments)
      const standupItems = data.standups.flatMap((standup) =>
        standup.items.map((item, index) => toStandupItemRecord(standup.id, item, index)),
      )

      await db.batch([
        db.insert(dbSchema.projects).values(data.projects),
        db.insert(dbSchema.members).values(data.members),
        db.insert(dbSchema.iterations).values(data.iterations.map(toIterationRecord)),
        db
          .insert(dbSchema.issues)
          .values(data.issues.map(({ linkedDocIds: _linkedDocIds, ...issue }) => issue)),
        db
          .insert(dbSchema.documents)
          .values(
            data.docs.map(
              ({ linkedIssueKeys: _linkedIssueKeys, comments: _comments, ...doc }) => doc,
            ),
          ),
        ...(docIssueLinks.length > 0
          ? [db.insert(dbSchema.docIssueLinks).values(docIssueLinks)]
          : []),
        ...(docComments.length > 0 ? [db.insert(dbSchema.docComments).values(docComments)] : []),
        db
          .insert(dbSchema.standups)
          .values(data.standups.map(({ items: _items, ...standup }) => standup)),
        ...(standupItems.length > 0 ? [db.insert(dbSchema.standupItems).values(standupItems)] : []),
        db.insert(dbSchema.milestones).values(data.milestones),
      ])
    },
    listProjects,
    async createProject(input) {
      const result = await validateCreateProject(db, input)
      if (result !== 'created') return result
      await db.batch([
        db.insert(dbSchema.projects).values(input.project),
        db.insert(dbSchema.iterations).values(toIterationRecord(input.iteration)),
      ])
      return 'created'
    },
    listIssues,
    async moveIssue(issueKey: string, status: IssueStatus) {
      const [existing] = await db
        .select({ key: dbSchema.issues.key })
        .from(dbSchema.issues)
        .where(eq(dbSchema.issues.key, issueKey))
      if (!existing) return false
      await db.update(dbSchema.issues).set({ status }).where(eq(dbSchema.issues.key, issueKey))
      return true
    },
    listDocs,
    async getDoc(docId: string) {
      return (await listDocs({ projectId: 'all', query: '' })).find((doc) => doc.id === docId)
    },
    async createDoc(doc: CreateDocInput) {
      const [existing] = await db
        .select({ id: dbSchema.documents.id })
        .from(dbSchema.documents)
        .where(eq(dbSchema.documents.id, doc.id))
      if (existing) return 'duplicate-document'
      const { linkedIssueKeys, comments, ...record } = doc
      if (comments.length > 0) return 'document-comments-not-empty'
      if (new Set(linkedIssueKeys).size !== linkedIssueKeys.length) return 'duplicate-linked-issue'
      const issueRows = await db.select({ key: dbSchema.issues.key }).from(dbSchema.issues)
      const issueKeys = new Set(issueRows.map((issue) => issue.key))
      if (!linkedIssueKeys.every((issueKey) => issueKeys.has(issueKey)))
        return 'linked-issue-not-found'
      await db.insert(dbSchema.documents).values(record)
      if (linkedIssueKeys.length > 0) {
        await db
          .insert(dbSchema.docIssueLinks)
          .values(linkedIssueKeys.map((issueKey) => ({ docId: doc.id, issueKey })))
      }
      return 'created'
    },
    async addDocComment(docId: string, comment: DocComment) {
      if (comment.docId !== docId) return 'comment-doc-id-mismatch'
      const [existing] = await db
        .select({ id: dbSchema.documents.id })
        .from(dbSchema.documents)
        .where(eq(dbSchema.documents.id, docId))
      if (!existing) return 'document-not-found'
      await db.insert(dbSchema.docComments).values(comment)
      return 'created'
    },
    listStandups,
    async saveStandup(standup: Standup) {
      const [existing] = await db
        .select({ id: dbSchema.standups.id })
        .from(dbSchema.standups)
        .where(eq(dbSchema.standups.id, standup.id))
      if (!existing) return false
      const memberRows = await db.select({ id: dbSchema.members.id }).from(dbSchema.members)
      assertStandupMembers(new Set(memberRows.map((member) => member.id)), standup)
      await db.batch([
        db
          .update(dbSchema.standups)
          .set({
            projectId: standup.projectId,
            dateLabel: standup.dateLabel,
            weekdayLabel: standup.weekdayLabel,
            timeLabel: standup.timeLabel,
            calendarLabel: standup.calendarLabel,
          })
          .where(eq(dbSchema.standups.id, standup.id)),
        db.delete(dbSchema.standupItems).where(eq(dbSchema.standupItems.standupId, standup.id)),
        ...(standup.items.length > 0
          ? [
              db
                .insert(dbSchema.standupItems)
                .values(
                  standup.items.map((item, index) => toStandupItemRecord(standup.id, item, index)),
                ),
            ]
          : []),
      ])
      return true
    },
    listMilestones,
    async saveMilestone(milestone: Milestone) {
      const result = await validateMilestoneReferences(db, milestone)
      if (result !== 'saved') return result
      await db
        .update(dbSchema.milestones)
        .set(milestone)
        .where(eq(dbSchema.milestones.id, milestone.id))
      return 'saved'
    },
    async saveFeishuNotification(input: FeishuNotificationRecord) {
      const result = await validateFeishuNotificationReferences(db, input)
      if (result !== 'saved') return result
      const { payload, ...record } = input
      await db
        .insert(dbSchema.feishuNotifications)
        .values({ ...record, payloadJson: JSON.stringify(payload) })
      return 'saved'
    },
    async listFeishuNotifications() {
      return (await db.select().from(dbSchema.feishuNotifications)).map(toFeishuNotification)
    },
    async saveFeishuQuery(input: FeishuQueryRecord) {
      await db.insert(dbSchema.feishuQueries).values({
        id: input.id,
        command: formatFeishuCommand(input.command),
        responseTitle: input.reply.title,
        responseBodyJson: JSON.stringify(input.reply.lines),
        createdAt: input.createdAt,
      })
    },
    async listFeishuQueries() {
      return (await db.select().from(dbSchema.feishuQueries)).map(toFeishuQuery)
    },
    async loadData() {
      return {
        navItems: [
          '团队工作台',
          '项目总览',
          'Issues',
          '看板',
          '迭代统计',
          '文档',
          '成员负载',
          '每日站会',
          '排期甘特',
          '飞书',
        ],
        projects: await listProjects(),
        members: (await db.select().from(dbSchema.members)).map(toMember),
        iterations: (await db.select().from(dbSchema.iterations)).map(toIteration),
        issues: await listIssues({
          projectId: 'all',
          status: 'all',
          assigneeId: 'all',
          keyword: '',
        }),
        docs: await listDocs({ projectId: 'all', query: '' }),
        standups: await listStandups({ projectId: 'all' }),
        milestones: await listMilestones({ projectId: 'all' }),
        feishu: {
          groups: ['AgiliX 团队群'],
          queryCommands: [
            { type: 'team' },
            { type: 'blockers' },
            createDocQueryCommand('结果卡片'),
          ],
          notificationTriggers: ['站会摘要', '阻塞提醒', '文档评论'],
        },
      }
    },
  }
}
