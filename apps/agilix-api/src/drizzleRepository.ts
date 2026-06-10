import { filterDocs, searchDocs } from '@agilix/app/domain/docs'
import {
  createDocQueryCommand,
  formatFeishuCommand,
  parseFeishuCommand,
} from '@agilix/app/domain/feishu'
import { filterIssues } from '@agilix/app/domain/issues'
import type {
  CreateProjectInput,
  Doc,
  DocComment,
  Issue,
  IssueStatus,
  Iteration,
  IterationCalendarWeek,
  Member,
  MemberId,
  Milestone,
  Project,
  ProjectId,
  SeedData,
  Standup,
} from '@agilix/app/domain/types'
import { eq } from 'drizzle-orm'
import * as dbSchema from './db/schema'
import type { TransactionDatabase } from './db/transaction'
import type {
  AddDocCommentResult,
  AgiliXRepository,
  CreateDocInput,
  CreateDocResult,
  CreateProjectResult,
  CreateDocDirectoryInput,
  CreateDocDirectoryResult,
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
  prioritySchema,
  stringArraySchema,
} from './schema'
import { createSnowflakeIdGenerator } from './snowflake'

const navItems = [
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
]

const memberIdByName: Record<string, MemberId> = {
  林舟: 'lin',
  陈牧: 'chen',
  高远: 'gao',
  苏晴: 'su',
  韩序: 'han',
  何川: 'he',
  江月: 'jiang',
  周然: 'zhou',
}

function clone<T>(value: T): T {
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

  const projectIds = new Set(data.projects.map((project) => project.id))
  const memberIds = new Set(data.members.map((member) => member.id))
  const iterationIds = new Set(data.iterations.map((iteration) => iteration.id))
  const issueKeys = new Set(data.issues.map((issue) => issue.key))
  const docIds = new Set(data.docs.map((doc) => doc.id))

  for (const iteration of data.iterations) {
    assertReference(projectIds, iteration.projectId, `Seed project not found: ${iteration.projectId}`)
  }
  for (const issue of data.issues) {
    assertReference(projectIds, issue.projectId, `Seed project not found: ${issue.projectId}`)
    assertReference(iterationIds, issue.iterationId, `Seed iteration not found: ${issue.iterationId}`)
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
      assertReference(memberIds, comment.authorId, `Seed comment author not found: ${comment.authorId}`)
    }
  }
  for (const standup of data.standups) {
    assertReference(projectIds, standup.projectId, `Seed project not found: ${standup.projectId}`)
    assertStandupMembers(memberIds, standup)
  }
  for (const milestone of data.milestones) {
    assertReference(projectIds, milestone.projectId, `Seed project not found: ${milestone.projectId}`)
    assertReference(iterationIds, milestone.iterationId, `Seed iteration not found: ${milestone.iterationId}`)
    assertReference(memberIds, milestone.ownerId, `Seed milestone owner not found: ${milestone.ownerId}`)
  }
}

function createIdMaps() {
  return {
    project: new Map<string, string>(),
    projectReverse: new Map<string, string>(),
    member: new Map<string, string>(),
    memberReverse: new Map<string, MemberId>(),
    iteration: new Map<string, string>(),
    iterationReverse: new Map<string, string>(),
    issue: new Map<string, string>(),
    issueReverse: new Map<string, string>(),
    doc: new Map<string, string>(),
    docReverse: new Map<string, string>(),
    directoryPath: new Map<string, string>(),
    directoryReverse: new Map<string, string>(),
    standup: new Map<string, string>(),
    standupReverse: new Map<string, string>(),
    milestone: new Map<string, string>(),
    milestoneReverse: new Map<string, string>(),
    group: new Map<string, string>(),
    groupReverse: new Map<string, string>(),
  }
}

type IdMaps = ReturnType<typeof createIdMaps>

function remember(map: Map<string, string>, reverse: Map<string, string>, legacy: string, id: string) {
  map.set(legacy, id)
  reverse.set(id, legacy)
}

function requireMapped(map: Map<string, string>, legacy: string, label: string) {
  const id = map.get(legacy)
  if (!id) throw new Error(`${label} not mapped: ${legacy}`)
  return id
}

function publicMemberId(maps: IdMaps, memberId: string, name?: string): MemberId {
  const mapped = maps.memberReverse.get(memberId)
  if (mapped) return mapped
  if (name && memberIdByName[name]) return memberIdByName[name]
  throw new Error(`Persisted member not mapped: ${memberId}`)
}

function splitText(value: string): string[] {
  if (value === '') return []
  return value.split('\n')
}

function joinText(value: string[]): string {
  return value.join('\n')
}

function nowLabel() {
  return new Date().toISOString()
}

async function assertRepositoryEmpty(db: TransactionDatabase) {
  const [project] = await db.select({ id: dbSchema.projects.id }).from(dbSchema.projects).limit(1)
  const [member] = await db.select({ id: dbSchema.members.id }).from(dbSchema.members).limit(1)
  const [iteration] = await db.select({ id: dbSchema.iterations.id }).from(dbSchema.iterations).limit(1)
  const [issue] = await db.select({ id: dbSchema.issues.id }).from(dbSchema.issues).limit(1)
  const [doc] = await db.select({ id: dbSchema.documents.id }).from(dbSchema.documents).limit(1)
  if (project || member || iteration || issue || doc) throw new Error('Repository already seeded')
}

export function createDrizzleRepository(db: TransactionDatabase): AgiliXRepository {
  const ids = createSnowflakeIdGenerator({ epochMs: Date.UTC(2026, 0, 1), workerId: 1 })
  const maps = createIdMaps()

  function makeId() {
    return ids()
  }

  async function listProjects(): Promise<Project[]> {
    const iterations = await db.select().from(dbSchema.iterations)
    return (await db.select().from(dbSchema.projects)).map((project) => ({
      id: (maps.projectReverse.get(project.id) ?? project.code) as ProjectId,
      name: project.name,
      glyph: project.glyph,
      color: project.color,
      activeIterationCode:
        iterations.find((iteration) => iteration.id === project.activeIterationId)?.code ?? '',
    }))
  }

  async function listMembers(): Promise<Member[]> {
    return (await db.select().from(dbSchema.members)).map((member) => ({
      id: publicMemberId(maps, member.id, member.name),
      name: member.name,
      role: member.role,
      capacity: member.capacity,
    }))
  }

  async function listIterations(): Promise<Iteration[]> {
    const projects = await db.select().from(dbSchema.projects)
    const weeks = await db.select().from(dbSchema.iterationCalendarWeeks)
    const days = await db.select().from(dbSchema.iterationCalendarDays)
    return (await db.select().from(dbSchema.iterations)).map((iteration) => {
      const project = projects.find((item) => item.id === iteration.projectId)
      if (!project) throw new Error(`Persisted project not found for iteration: ${iteration.id}`)
      return {
        id: maps.iterationReverse.get(iteration.id) ?? iteration.id,
        projectId: (maps.projectReverse.get(iteration.projectId) ?? project.code) as ProjectId,
        code: iteration.code,
        name: iteration.name,
        dateRangeLabel: iteration.dateRangeLabel,
        calendarTitle: iteration.calendarTitle,
        calendarWeeks: weeks
          .filter((week) => week.iterationId === iteration.id)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((week): IterationCalendarWeek => ({
            label: week.label,
            rangeLabel: week.rangeLabel,
            days: days
              .filter((day) => day.weekId === week.id)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((day) => day.label),
          })),
        day: iteration.day,
        totalDays: iteration.totalDays,
        goal: iteration.goal,
        velocity: iteration.velocity,
      }
    })
  }

  async function listIssues(filters: IssueFilters): Promise<Issue[]> {
    const projects = await db.select().from(dbSchema.projects)
    const members = await db.select().from(dbSchema.members)
    const links = await db.select().from(dbSchema.documentIssueLinks)
    const docs = await db.select().from(dbSchema.documents)
    const issues = (await db.select().from(dbSchema.issues)).map((issue): Issue => {
      const project = projects.find((item) => item.id === issue.projectId)
      if (!project) throw new Error(`Persisted project not found for issue: ${issue.key}`)
      const member = members.find((item) => item.id === issue.handlerMemberId)
      if (!member) throw new Error(`Persisted member not found for issue: ${issue.key}`)
      return {
        key: issue.key,
        projectId: (maps.projectReverse.get(issue.projectId) ?? project.code) as ProjectId,
        iterationId: maps.iterationReverse.get(issue.iterationId) ?? issue.iterationId,
        type: issueTypeSchema.parse(issue.type),
        title: issue.title,
        status: issueStatusSchema.parse(issue.status),
        priority: prioritySchema.parse(issue.priority),
        assigneeId: publicMemberId(maps, issue.handlerMemberId, member.name),
        storyPoints: issue.storyPoints,
        blockerReason: issue.blockerReason ?? undefined,
        linkedDocIds: links
          .filter((link) => link.issueId === issue.id)
          .map((link) => maps.docReverse.get(link.docId) ?? docs.find((doc) => doc.id === link.docId)?.id)
          .filter((docId): docId is string => Boolean(docId)),
      }
    })
    return filterIssues(issues, filters)
  }

  async function listDocs(filters: DocFilters): Promise<Doc[]> {
    const projects = await db.select().from(dbSchema.projects)
    const directories = await db.select().from(dbSchema.documentDirectories)
    const comments = await db.select().from(dbSchema.documentComments)
    const members = await db.select().from(dbSchema.members)
    const links = await db.select().from(dbSchema.documentIssueLinks)
    const issues = await db.select().from(dbSchema.issues)
    const docs = (await db.select().from(dbSchema.documents)).map((doc): Doc => {
      const directory = directories.find((item) => item.id === doc.directoryId)
      if (!directory) throw new Error(`Persisted directory not found for document: ${doc.id}`)
      const linkedIssueKeys = links
        .filter((link) => link.docId === doc.id)
        .map((link) => issues.find((issue) => issue.id === link.issueId)?.key)
        .filter((key): key is string => Boolean(key))
      const docComments = comments
        .filter((comment) => comment.docId === doc.id)
        .map((comment): DocComment => {
          const member = members.find((item) => item.id === comment.authorMemberId)
          return {
            id: maps.docReverse.get(comment.id) ?? comment.id,
            docId: maps.docReverse.get(comment.docId) ?? comment.docId,
            authorId: publicMemberId(maps, comment.authorMemberId, member?.name),
            body: comment.body,
            resolved: comment.resolved,
            createdAtLabel: comment.createdAt,
          }
        })
      const base = {
        id: maps.docReverse.get(doc.id) ?? doc.id,
        title: doc.title,
        directory: maps.directoryReverse.get(doc.directoryId) ?? directory.name,
        body: doc.body,
        linkedIssueKeys,
        comments: docComments,
        updatedAtLabel: doc.updatedAt,
      }
      const scope = docScopeSchema.parse(doc.scope)
      if (scope === 'global') return { ...base, scope: 'global' }
      const project = projects.find((item) => item.id === doc.projectId)
      if (!project) throw new Error(`Persisted project not found for document: ${doc.id}`)
      return {
        ...base,
        scope: 'project',
        projectId: (maps.projectReverse.get(project.id) ?? project.code) as ProjectId,
      }
    })
    const scopedDocs = filterDocs(docs, filters.projectId)
    return filters.query === '' ? scopedDocs : searchDocs(scopedDocs, filters.query)
  }

  async function listDocDirectories() {
    const directories = await db.select().from(dbSchema.documentDirectories)
    const projects = await db.select().from(dbSchema.projects)
    function pathFor(directoryId: string): string {
      const directory = directories.find((item) => item.id === directoryId)
      if (!directory) throw new Error(`Persisted directory not found: ${directoryId}`)
      const mapped = maps.directoryReverse.get(directory.id)
      if (mapped) return mapped
      if (directory.parentId === null) return directory.name
      return `${pathFor(directory.parentId)}/${directory.name}`
    }
    return directories.map((directory) => {
      const scope = docScopeSchema.parse(directory.scope)
      const project = directory.projectId
        ? projects.find((item) => item.id === directory.projectId)
        : undefined
      return {
        id: directory.id,
        scope,
        projectId: project ? ((maps.projectReverse.get(project.id) ?? project.code) as ProjectId) : undefined,
        parentId: directory.parentId,
        path: pathFor(directory.id),
        name: directory.name,
      }
    })
  }

  async function listStandups(filters: { projectId: ProjectId | 'all' }): Promise<Standup[]> {
    const projects = await db.select().from(dbSchema.projects)
    const members = await db.select().from(dbSchema.members)
    const items = await db.select().from(dbSchema.standupItems)
    const standups = (await db.select().from(dbSchema.standups)).map((standup): Standup => {
      const project = projects.find((item) => item.id === standup.projectId)
      if (!project) throw new Error(`Persisted project not found for standup: ${standup.id}`)
      return {
        id: maps.standupReverse.get(standup.id) ?? standup.id,
        projectId: (maps.projectReverse.get(project.id) ?? project.code) as ProjectId,
        dateLabel: standup.dateLabel,
        weekdayLabel: standup.weekdayLabel,
        timeLabel: standup.timeLabel,
        calendarLabel: standup.calendarLabel,
        items: items
          .filter((item) => item.standupId === standup.id)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((item) => {
            const member = members.find((memberRow) => memberRow.id === item.memberId)
            return {
              memberId: publicMemberId(maps, item.memberId, member?.name),
              yesterday: splitText(item.yesterdayText),
              today: splitText(item.todayText),
              blockers: splitText(item.blockersText),
            }
          }),
      }
    })
    return standups.filter(
      (standup) => filters.projectId === 'all' || standup.projectId === filters.projectId,
    )
  }

  async function listMilestones(filters: { projectId: ProjectId | 'all' }): Promise<Milestone[]> {
    const projects = await db.select().from(dbSchema.projects)
    const members = await db.select().from(dbSchema.members)
    const milestones = (await db.select().from(dbSchema.milestones)).map((milestone): Milestone => {
      const project = projects.find((item) => item.id === milestone.projectId)
      if (!project) throw new Error(`Persisted project not found for milestone: ${milestone.id}`)
      const member = members.find((item) => item.id === milestone.participantMemberId)
      return {
        id: maps.milestoneReverse.get(milestone.id) ?? milestone.id,
        projectId: (maps.projectReverse.get(project.id) ?? project.code) as ProjectId,
        iterationId: maps.iterationReverse.get(milestone.iterationId) ?? milestone.iterationId,
        title: milestone.title,
        startDay: milestone.startDay,
        endDay: milestone.endDay,
        status: milestone.status as Milestone['status'],
        ownerId: publicMemberId(maps, milestone.participantMemberId, member?.name),
      }
    })
    return milestones.filter(
      (milestone) => filters.projectId === 'all' || milestone.projectId === filters.projectId,
    )
  }

  return {
    async seed(data: SeedData) {
      assertSeedData(data)
      await assertRepositoryEmpty(db)
      const at = nowLabel()

      data.projects.forEach((project) => remember(maps.project, maps.projectReverse, project.id, makeId()))
      data.members.forEach((member) => {
        const id = makeId()
        maps.member.set(member.id, id)
        maps.memberReverse.set(id, member.id)
      })
      data.iterations.forEach((iteration) => remember(maps.iteration, maps.iterationReverse, iteration.id, makeId()))
      data.issues.forEach((issue) => remember(maps.issue, maps.issueReverse, issue.key, makeId()))
      data.docs.forEach((doc) => remember(maps.doc, maps.docReverse, doc.id, makeId()))
      data.standups.forEach((standup) => remember(maps.standup, maps.standupReverse, standup.id, makeId()))
      data.milestones.forEach((milestone) => remember(maps.milestone, maps.milestoneReverse, milestone.id, makeId()))

      const directoryPaths = Array.from(
        new Set(data.docs.map((doc) => doc.directory).flatMap((path) => directoryAncestors(path))),
      )
      directoryPaths.forEach((path) => remember(maps.directoryPath, maps.directoryReverse, path, makeId()))

      const groupId = makeId()
      remember(maps.group, maps.groupReverse, 'AgiliX 团队群', groupId)

      await db.batch([
        db.insert(dbSchema.members).values(
          data.members.map((member, index) => ({
            id: requireMapped(maps.member, member.id, 'member'),
            name: member.name,
            role: member.role,
            capacity: member.capacity,
            onlineSortOrder: index,
          })),
        ),
        db.insert(dbSchema.projects).values(
          data.projects.map((project) => {
            const activeIteration = data.iterations.find(
              (iteration) =>
                iteration.projectId === project.id && iteration.code === project.activeIterationCode,
            )
            if (!activeIteration) throw new Error(`Seed active iteration not found: ${project.id}`)
            return {
              id: requireMapped(maps.project, project.id, 'project'),
              code: project.id,
              name: project.name,
              glyph: project.glyph,
              color: project.color,
              activeIterationId: requireMapped(maps.iteration, activeIteration.id, 'iteration'),
              cadence: '双周',
              templateKey: 'scrum-board-burndown',
            }
          }),
        ),
        db.insert(dbSchema.projectMembers).values(
          data.projects.flatMap((project) =>
            data.members.map((member, index) => ({
              projectId: requireMapped(maps.project, project.id, 'project'),
              memberId: requireMapped(maps.member, member.id, 'member'),
              sortOrder: index,
            })),
          ),
        ),
        db.insert(dbSchema.iterations).values(
          data.iterations.map((iteration) => ({
            id: requireMapped(maps.iteration, iteration.id, 'iteration'),
            projectId: requireMapped(maps.project, iteration.projectId, 'project'),
            code: iteration.code,
            name: iteration.name,
            dateRangeLabel: iteration.dateRangeLabel,
            calendarTitle: iteration.calendarTitle,
            day: iteration.day,
            totalDays: iteration.totalDays,
            goal: iteration.goal,
            velocity: iteration.velocity,
          })),
        ),
        db.insert(dbSchema.iterationCalendarWeeks).values(
          data.iterations.flatMap((iteration) =>
            iteration.calendarWeeks.map((week, index) => {
              const id = makeId()
              remember(
                maps.directoryPath,
                maps.directoryReverse,
                `iteration-week:${iteration.id}:${index}`,
                id,
              )
              return {
                id,
                iterationId: requireMapped(maps.iteration, iteration.id, 'iteration'),
                sortOrder: index,
                label: week.label,
                rangeLabel: week.rangeLabel,
              }
            }),
          ),
        ),
        db.insert(dbSchema.iterationCalendarDays).values(
          data.iterations.flatMap((iteration) =>
            iteration.calendarWeeks.flatMap((week, weekIndex) => {
              const weekId = requireMapped(
                maps.directoryPath,
                `iteration-week:${iteration.id}:${weekIndex}`,
                'iteration week',
              )
              return week.days.map((day, dayIndex) => ({
                id: makeId(),
                weekId,
                sortOrder: dayIndex,
                label: day,
              }))
            }),
          ),
        ),
        db.insert(dbSchema.issues).values(
          data.issues.map((issue) => ({
            id: requireMapped(maps.issue, issue.key, 'issue'),
            key: issue.key,
            projectId: requireMapped(maps.project, issue.projectId, 'project'),
            iterationId: requireMapped(maps.iteration, issue.iterationId, 'iteration'),
            type: issue.type,
            title: issue.title,
            status: issue.status,
            priority: issue.priority,
            handlerMemberId: requireMapped(maps.member, issue.assigneeId, 'member'),
            storyPoints: issue.storyPoints,
            blockerReason: issue.blockerReason ?? null,
            description: '',
            acceptanceCriteria: '',
            epicName: issue.projectId,
            draft: false,
          })),
        ),
        ...(data.docs.length > 0
          ? [
              db.insert(dbSchema.documentDirectories).values(
                directoryPaths.map((path, index) => ({
                  id: requireMapped(maps.directoryPath, path, 'directory'),
                  scope: path.startsWith('全局文档') ? ('global' as const) : ('project' as const),
                  projectId: projectIdFromDirectoryPath(data, maps, path),
                  parentId: parentDirectoryId(maps, path),
                  name: path.split('/').at(-1) ?? path,
                  sortOrder: index,
                  createdAt: at,
                  updatedAt: at,
                })),
              ),
            ]
          : []),
        db.insert(dbSchema.documents).values(
          data.docs.map((doc) => ({
            id: requireMapped(maps.doc, doc.id, 'document'),
            scope: doc.scope,
            projectId: doc.scope === 'project' ? requireMapped(maps.project, doc.projectId, 'project') : null,
            directoryId: requireMapped(maps.directoryPath, doc.directory, 'directory'),
            title: doc.title,
            contentType: 'markdown' as const,
            body: doc.body,
            editorMemberId: requireMapped(maps.member, doc.comments[0]?.authorId ?? data.members[0].id, 'member'),
            syncFeishuDoc: false,
            createdAt: at,
            updatedAt: doc.updatedAtLabel,
          })),
        ),
        ...(data.docs.flatMap((doc) => doc.linkedIssueKeys).length > 0
          ? [
              db.insert(dbSchema.documentIssueLinks).values(
                data.docs.flatMap((doc) =>
                  doc.linkedIssueKeys.map((issueKey) => ({
                    docId: requireMapped(maps.doc, doc.id, 'document'),
                    issueId: requireMapped(maps.issue, issueKey, 'issue'),
                  })),
                ),
              ),
            ]
          : []),
        ...(data.docs.flatMap((doc) => doc.comments).length > 0
          ? [
              db.insert(dbSchema.documentComments).values(
                data.docs.flatMap((doc) =>
                  doc.comments.map((comment) => ({
                    id: comment.id,
                    docId: requireMapped(maps.doc, doc.id, 'document'),
                    authorMemberId: requireMapped(maps.member, comment.authorId, 'member'),
                    body: comment.body,
                    resolved: comment.resolved,
                    createdAt: comment.createdAtLabel,
                  })),
                ),
              ),
            ]
          : []),
        db.insert(dbSchema.standups).values(
          data.standups.map((standup) => ({
            id: requireMapped(maps.standup, standup.id, 'standup'),
            projectId: requireMapped(maps.project, standup.projectId, 'project'),
            date: standup.dateLabel,
            dateLabel: standup.dateLabel,
            weekdayLabel: standup.weekdayLabel,
            timeLabel: standup.timeLabel,
            calendarLabel: standup.calendarLabel,
          })),
        ),
        ...(data.standups.flatMap((standup) => standup.items).length > 0
          ? [
              db.insert(dbSchema.standupItems).values(
                data.standups.flatMap((standup) =>
                  standup.items.map((item, index) => ({
                    id: makeId(),
                    standupId: requireMapped(maps.standup, standup.id, 'standup'),
                    memberId: requireMapped(maps.member, item.memberId, 'member'),
                    sortOrder: index,
                    yesterdayText: joinText(item.yesterday),
                    todayText: joinText(item.today),
                    blockersText: joinText(item.blockers),
                  })),
                ),
              ),
            ]
          : []),
        db.insert(dbSchema.milestones).values(
          data.milestones.map((milestone) => ({
            id: requireMapped(maps.milestone, milestone.id, 'milestone'),
            projectId: requireMapped(maps.project, milestone.projectId, 'project'),
            iterationId: requireMapped(maps.iteration, milestone.iterationId, 'iteration'),
            title: milestone.title,
            startDay: milestone.startDay,
            endDay: milestone.endDay,
            status: milestone.status,
            participantMemberId: requireMapped(maps.member, milestone.ownerId, 'member'),
          })),
        ),
        db.insert(dbSchema.feishuMemberProfiles).values(
          data.members.map((member) => ({
            memberId: requireMapped(maps.member, member.id, 'member'),
            openId: `open-${member.id}`,
            unionId: `union-${member.id}`,
            avatarUrl: `https://avatar.local/${member.id}.png`,
            displayName: member.name,
            lastSeenAt: at,
          })),
        ),
        db.insert(dbSchema.feishuGroups).values(
          data.projects.map((project, index) => ({
            id: index === 0 ? groupId : makeId(),
            projectId: requireMapped(maps.project, project.id, 'project'),
            name: 'AgiliX 团队群',
            purpose: '通知 / 查询',
            memberCountLabel: `${data.members.length} 人`,
            status: '已连接',
            sortOrder: index,
          })),
        ),
        db.insert(dbSchema.feishuBotRules).values(
          data.projects.flatMap((project) => [
            {
              id: makeId(),
              projectId: requireMapped(maps.project, project.id, 'project'),
              ruleType: 'scheduled_summary' as const,
              title: '定时摘要',
              description: '同步今日状态',
              scheduleLabel: '每日 10:00',
              targetGroupId: groupId,
              enabled: true,
              sortOrder: 0,
            },
            {
              id: makeId(),
              projectId: requireMapped(maps.project, project.id, 'project'),
              ruleType: 'risk_alert' as const,
              title: '风险告警',
              description: '阻塞时通知',
              scheduleLabel: '实时',
              targetGroupId: groupId,
              enabled: true,
              sortOrder: 1,
            },
          ]),
        ),
      ])
    },
    listProjects,
    async createProject(input: CreateProjectInput): Promise<CreateProjectResult> {
      const projects = await listProjects()
      if (input.project.id !== input.iteration.projectId) return 'project-iteration-mismatch'
      if (input.project.activeIterationCode !== input.iteration.code)
        return 'active-iteration-code-mismatch'
      if (projects.some((project) => project.id === input.project.id)) return 'duplicate-project'

      const projectId = makeId()
      const iterationId = makeId()
      remember(maps.project, maps.projectReverse, input.project.id, projectId)
      remember(maps.iteration, maps.iterationReverse, input.iteration.id, iterationId)

      await db.batch([
        db.insert(dbSchema.projects).values({
          id: projectId,
          code: input.project.id,
          name: input.project.name,
          glyph: input.project.glyph,
          color: input.project.color,
          activeIterationId: iterationId,
          cadence: '双周',
          templateKey: 'scrum-board-burndown',
        }),
        db.insert(dbSchema.iterations).values({
          id: iterationId,
          projectId,
          code: input.iteration.code,
          name: input.iteration.name,
          dateRangeLabel: input.iteration.dateRangeLabel,
          calendarTitle: input.iteration.calendarTitle,
          day: input.iteration.day,
          totalDays: input.iteration.totalDays,
          goal: input.iteration.goal,
          velocity: input.iteration.velocity,
        }),
      ])
      return 'created'
    },
    listIssues,
    async moveIssue(issueKey: string, status: IssueStatus) {
      const [issue] = await db
        .select({ id: dbSchema.issues.id })
        .from(dbSchema.issues)
        .where(eq(dbSchema.issues.key, issueKey))
      if (!issue) return false
      await db.update(dbSchema.issues).set({ status }).where(eq(dbSchema.issues.id, issue.id))
      return true
    },
    listDocs,
    async getDoc(docId: string) {
      return (await listDocs({ projectId: 'all', query: '' })).find((doc) => doc.id === docId)
    },
    async createDoc(doc: CreateDocInput): Promise<CreateDocResult> {
      if ((await listDocs({ projectId: 'all', query: '' })).some((item) => item.id === doc.id))
        return 'duplicate-document'
      if (doc.comments.length > 0) return 'document-comments-not-empty'
      if (new Set(doc.linkedIssueKeys).size !== doc.linkedIssueKeys.length)
        return 'duplicate-linked-issue'
      const issues = await db.select().from(dbSchema.issues)
      const issueIds = doc.linkedIssueKeys.map((issueKey) => issues.find((issue) => issue.key === issueKey)?.id)
      if (issueIds.some((issueId) => !issueId)) return 'linked-issue-not-found'
      const at = nowLabel()
      const id = makeId()
      remember(maps.doc, maps.docReverse, doc.id, id)
      if (!maps.directoryPath.has(doc.directory))
        remember(maps.directoryPath, maps.directoryReverse, doc.directory, makeId())
      const directoryId = requireMapped(maps.directoryPath, doc.directory, 'directory')
      const projectId = doc.scope === 'project' ? requireMapped(maps.project, doc.projectId, 'project') : null
      await db.batch([
        db.insert(dbSchema.documentDirectories).values({
          id: directoryId,
          scope: doc.scope,
          projectId,
          parentId: parentDirectoryId(maps, doc.directory),
          name: doc.directory.split('/').at(-1) ?? doc.directory,
          sortOrder: maps.directoryPath.size,
          createdAt: at,
          updatedAt: at,
        }),
        db.insert(dbSchema.documents).values({
          id,
          scope: doc.scope,
          projectId,
          directoryId,
          title: doc.title,
          contentType: 'markdown',
          body: doc.body,
          editorMemberId: requireMapped(maps.member, 'zhou', 'member'),
          syncFeishuDoc: false,
          createdAt: at,
          updatedAt: doc.updatedAtLabel,
        }),
        ...(issueIds.length > 0
          ? [
              db.insert(dbSchema.documentIssueLinks).values(
                issueIds.map((issueId) => ({ docId: id, issueId: issueId as string })),
              ),
            ]
          : []),
      ])
      return 'created'
    },
    async createDocDirectory(input: CreateDocDirectoryInput): Promise<CreateDocDirectoryResult> {
      if (maps.directoryPath.has(input.path)) return 'duplicate-directory'
      const projectId =
        input.scope === 'project'
          ? input.projectId
            ? maps.project.get(input.projectId)
            : undefined
          : null
      if (input.scope === 'project' && !projectId) return 'project-not-found'
      if (input.parentId !== null) {
        const [parent] = await db
          .select()
          .from(dbSchema.documentDirectories)
          .where(eq(dbSchema.documentDirectories.id, input.parentId))
        if (!parent) return 'parent-directory-not-found'
        if (parent.scope !== input.scope || parent.projectId !== projectId)
          return 'directory-scope-mismatch'
      }
      remember(maps.directoryPath, maps.directoryReverse, input.path, input.id)
      const at = nowLabel()
      await db.insert(dbSchema.documentDirectories).values({
        id: input.id,
        scope: input.scope,
        projectId,
        parentId: input.parentId,
        name: input.name,
        sortOrder: maps.directoryPath.size,
        createdAt: at,
        updatedAt: at,
      })
      return 'created'
    },
    async addDocComment(docId: string, comment: DocComment): Promise<AddDocCommentResult> {
      if (comment.docId !== docId) return 'comment-doc-id-mismatch'
      const internalDocId = maps.doc.get(docId) ?? docId
      const [doc] = await db
        .select({ id: dbSchema.documents.id })
        .from(dbSchema.documents)
        .where(eq(dbSchema.documents.id, internalDocId))
      if (!doc) return 'document-not-found'
      await db.insert(dbSchema.documentComments).values({
        id: comment.id,
        docId: internalDocId,
        authorMemberId: requireMapped(maps.member, comment.authorId, 'member'),
        body: comment.body,
        resolved: comment.resolved,
        createdAt: comment.createdAtLabel,
      })
      return 'created'
    },
    listStandups,
    async saveStandup(standup: Standup) {
      const internalStandupId = maps.standup.get(standup.id) ?? standup.id
      const [existing] = await db
        .select({ id: dbSchema.standups.id })
        .from(dbSchema.standups)
        .where(eq(dbSchema.standups.id, internalStandupId))
      if (!existing) return false
      assertStandupMembers(new Set((await listMembers()).map((member) => member.id)), standup)
      await db.batch([
        db.delete(dbSchema.standupItems).where(eq(dbSchema.standupItems.standupId, internalStandupId)),
        ...(standup.items.length > 0
          ? [
              db.insert(dbSchema.standupItems).values(
                standup.items.map((item, index) => ({
                  id: makeId(),
                  standupId: internalStandupId,
                  memberId: requireMapped(maps.member, item.memberId, 'member'),
                  sortOrder: index,
                  yesterdayText: joinText(item.yesterday),
                  todayText: joinText(item.today),
                  blockersText: joinText(item.blockers),
                })),
              ),
            ]
          : []),
      ])
      return true
    },
    listMilestones,
    async saveMilestone(milestone: Milestone): Promise<SaveMilestoneResult> {
      const internalMilestoneId = maps.milestone.get(milestone.id) ?? milestone.id
      const [existing] = await db
        .select({ id: dbSchema.milestones.id })
        .from(dbSchema.milestones)
        .where(eq(dbSchema.milestones.id, internalMilestoneId))
      if (!existing) return 'milestone-not-found'
      const projectId = maps.project.get(milestone.projectId)
      if (!projectId) return 'project-not-found'
      const iterationId = maps.iteration.get(milestone.iterationId)
      if (!iterationId) return 'iteration-not-found'
      const memberId = maps.member.get(milestone.ownerId)
      if (!memberId) return 'owner-not-found'
      await db
        .update(dbSchema.milestones)
        .set({
          projectId,
          iterationId,
          title: milestone.title,
          startDay: milestone.startDay,
          endDay: milestone.endDay,
          status: milestone.status,
          participantMemberId: memberId,
        })
        .where(eq(dbSchema.milestones.id, internalMilestoneId))
      return 'saved'
    },
    async saveFeishuNotification(input: FeishuNotificationRecord): Promise<SaveFeishuNotificationResult> {
      const targetGroupId = requireMapped(maps.group, input.targetGroup, 'feishu group')
      if (input.trigger === '站会摘要' && !maps.standup.has(input.payload.standupId))
        return 'standup-not-found'
      if (
        input.trigger === '阻塞提醒' &&
        input.payload.issueKeys.some((issueKey) => !maps.issue.has(issueKey))
      )
        return 'issue-not-found'
      if (input.trigger === '文档评论' && !maps.doc.has(input.payload.docId))
        return 'document-not-found'
      if (input.trigger === '文档评论') {
        const [comment] = await db
          .select({ id: dbSchema.documentComments.id })
          .from(dbSchema.documentComments)
          .where(eq(dbSchema.documentComments.id, input.payload.commentId))
        if (!comment) return 'comment-not-found'
      }
      await db.insert(dbSchema.feishuNotifications).values({
        id: input.id,
        trigger: input.trigger,
        targetGroupId,
        payloadJson: JSON.stringify(input.payload),
        status: input.status,
        createdAt: input.createdAt,
      })
      return 'saved'
    },
    async listFeishuNotifications() {
      return (await db.select().from(dbSchema.feishuNotifications)).map((row) =>
        feishuNotificationSchema.parse({
          id: row.id,
          trigger: row.trigger,
          targetGroup: maps.groupReverse.get(row.targetGroupId) ?? 'AgiliX 团队群',
          payload: JSON.parse(row.payloadJson),
          status: row.status,
          createdAt: row.createdAt,
        }),
      )
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
      return (await db.select().from(dbSchema.feishuQueries)).map((row): FeishuQueryRecord => ({
        id: row.id,
        command: parseFeishuCommand(row.command),
        reply: {
          title: row.responseTitle,
          lines: stringArraySchema.parse(JSON.parse(row.responseBodyJson)),
        },
        createdAt: row.createdAt,
      }))
    },
    async loadData() {
      return {
        navItems,
        projects: await listProjects(),
        members: await listMembers(),
        iterations: await listIterations(),
        issues: await listIssues({
          projectId: 'all',
          status: 'all',
          assigneeId: 'all',
          keyword: '',
        }),
        docs: await listDocs({ projectId: 'all', query: '' }),
        docDirectories: await listDocDirectories(),
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

function directoryAncestors(path: string): string[] {
  return path.split('/').map((_, index, parts) => parts.slice(0, index + 1).join('/'))
}

function parentDirectoryId(maps: IdMaps, path: string) {
  const parts = path.split('/')
  if (parts.length <= 1) return null
  return requireMapped(maps.directoryPath, parts.slice(0, -1).join('/'), 'parent directory')
}

function projectIdFromDirectoryPath(data: SeedData, maps: IdMaps, path: string) {
  if (!path.startsWith('项目文档/')) return null
  const projectName = path.split('/')[1]
  const project = data.projects.find((item) => item.name === projectName)
  return project ? requireMapped(maps.project, project.id, 'project') : null
}
