import type { AppStateResponse } from '@agilix/contract'
import type {
  AgiliXClient,
  CreateDocInput,
  FeishuNotificationInput,
  FeishuReply,
} from '../api/client'
import { buildFeishuReply, formatFeishuCommand } from '../domain/feishu'
import { seedData } from '../domain/fixtures'
import { moveIssue } from '../domain/issues'
import type {
  CreateProjectInput,
  DocComment,
  FeishuQueryCommand,
  IssueStatus,
  Milestone,
  SeedData,
  Standup,
} from '../domain/types'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

type RecordedIssueStatusSave = {
  issueId: string
  status: 'todo' | 'doing' | 'blocked' | 'done'
}

export function createInMemoryClient() {
  let data: SeedData = clone(seedData)
  let loadAppStateCalls = 0
  let loadDataCalls = 0
  const issueStatusSaves: RecordedIssueStatusSave[] = []
  const standupSaves: string[] = []
  const milestoneSaves: string[] = []
  const feishuNotifications: FeishuNotificationInput[] = []
  const feishuQueries: string[] = []

  function validateFeishuNotification(input: FeishuNotificationInput) {
    switch (input.trigger) {
      case '站会摘要':
        if (!data.standups.some((standup) => standup.id === input.payload.standupId))
          throw new Error(`Standup not found: ${input.payload.standupId}`)
        return
      case '阻塞提醒': {
        if (input.payload.issueKeys.length === 0)
          throw new Error('Blocker notification must include issue keys')
        const missingIssueKey = input.payload.issueKeys.find(
          (issueKey) => !data.issues.some((issue) => issue.key === issueKey),
        )
        if (missingIssueKey) throw new Error(`Issue not found: ${missingIssueKey}`)
        return
      }
      case '文档评论': {
        const doc = data.docs.find((item) => item.id === input.payload.docId)
        if (!doc) throw new Error(`Document not found: ${input.payload.docId}`)
        if (!doc.comments.some((comment) => comment.id === input.payload.commentId))
          throw new Error(`Comment not found: ${input.payload.commentId}`)
      }
    }
  }

  const client: AgiliXClient & {
    loadCount(): number
    recordedStandupSaves(): string[]
    recordedMilestoneSaves(): string[]
    recordedFeishuNotifications(): string[]
    recordedFeishuQueries(): string[]
    loadAppStateCount(): number
    recordedIssueStatusSaves(): RecordedIssueStatusSave[]
  } = {
    async loadAppState() {
      loadAppStateCalls += 1
      return seedDataToAppState(data)
    },
    async loadData() {
      loadDataCalls += 1
      return clone(data)
    },
    async createContractProject() {
      throw new Error('Contract project creation is not wired in the in-memory test client')
    },
    async moveIssue(issueKey: string, status: IssueStatus) {
      if (!data.issues.some((issue) => issue.key === issueKey))
        throw new Error(`Issue not found: ${issueKey}`)
      data = { ...data, issues: moveIssue(data.issues, issueKey, status) }
    },
    async moveIssueById(issueId: string, status: RecordedIssueStatusSave['status']) {
      const issueKey = legacyScopedId(issueId, 'issue')
      if (!data.issues.some((issue) => issue.key === issueKey))
        throw new Error(`Issue not found: ${issueId}`)
      issueStatusSaves.push({ issueId, status })
      data = { ...data, issues: moveIssue(data.issues, issueKey, status) }
      return seedDataToAppState(data)
    },
    async createProject(input: CreateProjectInput) {
      if (input.project.id !== input.iteration.projectId)
        throw new Error('Iteration projectId must match project id')
      if (input.project.activeIterationCode !== input.iteration.code)
        throw new Error('Project activeIterationCode must match iteration code')
      if (data.projects.some((project) => project.id === input.project.id))
        throw new Error(`Project already exists: ${input.project.id}`)
      if (
        data.iterations.some(
          (iteration) =>
            iteration.id === input.iteration.id ||
            (iteration.projectId === input.project.id && iteration.code === input.iteration.code),
        )
      )
        throw new Error(`Iteration already exists: ${input.iteration.id}`)
      data = {
        ...data,
        projects: [...data.projects, clone(input.project)],
        iterations: [...data.iterations, clone(input.iteration)],
      }
    },
    async addDocComment(docId: string, comment: DocComment) {
      const legacyDocId = legacyScopedId(docId, 'document')
      const legacyCommentDocId = legacyScopedId(comment.docId, 'document')
      if (legacyCommentDocId !== legacyDocId)
        throw new Error(`Comment docId must match document id: ${docId}`)
      if (!data.docs.some((doc) => doc.id === legacyDocId))
        throw new Error(`Document not found: ${docId}`)
      data = {
        ...data,
        docs: data.docs.map((doc) =>
          doc.id === legacyDocId
            ? { ...doc, comments: [...doc.comments, { ...comment, docId: legacyDocId }] }
            : doc,
        ),
      }
    },
    async createDoc(doc: CreateDocInput) {
      if (data.docs.some((item) => item.id === doc.id))
        throw new Error(`Document already exists: ${doc.id}`)
      if (doc.comments.length > 0) throw new Error('Document comments must be empty on create')
      if (new Set(doc.linkedIssueKeys).size !== doc.linkedIssueKeys.length)
        throw new Error('Duplicate linked issue')
      const missingIssueKey = doc.linkedIssueKeys.find(
        (issueKey) => !data.issues.some((issue) => issue.key === issueKey),
      )
      if (missingIssueKey) throw new Error(`Linked issue not found: ${missingIssueKey}`)
      data = { ...data, docs: [...data.docs, clone(doc)] }
    },
    async saveStandup(standup: Standup) {
      const legacyStandupId = legacyScopedId(standup.id, 'standup')
      if (!data.standups.some((item) => item.id === legacyStandupId))
        throw new Error(`Standup not found: ${standup.id}`)
      standupSaves.push(legacyStandupId)
      data = {
        ...data,
        standups: [
          ...data.standups.filter((item) => item.id !== legacyStandupId),
          { ...standup, id: legacyStandupId, projectId: legacyScopedId(standup.projectId, 'project') },
        ],
      }
    },
    async saveMilestone(milestone: Milestone) {
      const legacyMilestoneId = legacyScopedId(milestone.id, 'milestone')
      if (!data.milestones.some((item) => item.id === legacyMilestoneId))
        throw new Error(`Milestone not found: ${milestone.id}`)
      milestoneSaves.push(legacyMilestoneId)
      data = {
        ...data,
        milestones: [
          ...data.milestones.filter((item) => item.id !== legacyMilestoneId),
          {
            ...milestone,
            id: legacyMilestoneId,
            projectId: legacyScopedId(milestone.projectId, 'project'),
            iterationId: legacyScopedId(milestone.iterationId, 'iteration'),
            ownerId: legacyScopedId(milestone.ownerId, 'member') as Milestone['ownerId'],
          },
        ],
      }
    },
    async recordFeishuNotification(input: FeishuNotificationInput) {
      validateFeishuNotification(input)
      feishuNotifications.push(clone(input))
    },
    async queryFeishu(command: FeishuQueryCommand): Promise<FeishuReply> {
      feishuQueries.push(formatFeishuCommand(command))
      return buildFeishuReply(command, data)
    },
    loadCount() {
      return loadDataCalls
    },
    recordedFeishuNotifications() {
      return feishuNotifications.map((notification) => notification.trigger)
    },
    recordedStandupSaves() {
      return [...standupSaves]
    },
    recordedMilestoneSaves() {
      return [...milestoneSaves]
    },
    recordedFeishuQueries() {
      return [...feishuQueries]
    },
    loadAppStateCount() {
      return loadAppStateCalls
    },
    recordedIssueStatusSaves() {
      return [...issueStatusSaves]
    },
  }

  return client
}

function scopedId(scope: string, value: string) {
  return `${scope}:${value}`
}

function legacyScopedId(value: string, scope: string) {
  return value.startsWith(`${scope}:`) ? value.slice(scope.length + 1) : value
}

export function seedDataToAppState(data: SeedData): AppStateResponse {
  const directoryPaths = Array.from(new Set(data.docs.flatMap((doc) => directoryAncestors(doc.directory))))
  const firstProject = data.projects[0]
  if (!firstProject) throw new Error('At least one project is required')
  return {
    projects: data.projects.map((project) => {
      const activeIteration = data.iterations.find(
        (iteration) =>
          iteration.projectId === project.id && iteration.code === project.activeIterationCode,
      )
      if (!activeIteration) throw new Error(`Active iteration not found: ${project.id}`)
      return {
        id: scopedId('project', project.id),
        code: project.id,
        name: project.name,
        glyph: project.glyph,
        color: project.color,
        active_iteration_id: scopedId('iteration', activeIteration.id),
        cadence: '双周',
        template_key: 'scrum-board-burndown',
      }
    }),
    project_members: data.projects.flatMap((project) =>
      data.members.map((member, index) => ({
        project_id: scopedId('project', project.id),
        member_id: scopedId('member', member.id),
        sort_order: index,
      })),
    ),
    iterations: data.iterations.map((iteration) => ({
      id: scopedId('iteration', iteration.id),
      project_id: scopedId('project', iteration.projectId),
      code: iteration.code,
      name: iteration.name,
      date_range_label: iteration.dateRangeLabel,
      calendar_title: iteration.calendarTitle,
      day: iteration.day,
      total_days: iteration.totalDays,
      goal: iteration.goal,
      velocity: iteration.velocity,
    })),
    iteration_calendar_weeks: data.iterations.flatMap((iteration) =>
      iteration.calendarWeeks.map((week, index) => ({
        id: scopedId('iteration-week', `${iteration.id}:${index}`),
        iteration_id: scopedId('iteration', iteration.id),
        sort_order: index,
        label: week.label,
        range_label: week.rangeLabel,
      })),
    ),
    iteration_calendar_days: data.iterations.flatMap((iteration) =>
      iteration.calendarWeeks.flatMap((week, weekIndex) =>
        week.days.map((day, dayIndex) => ({
          id: scopedId('iteration-day', `${iteration.id}:${weekIndex}:${dayIndex}`),
          week_id: scopedId('iteration-week', `${iteration.id}:${weekIndex}`),
          sort_order: dayIndex,
          label: day,
        })),
      ),
    ),
    members: data.members.map((member, index) => ({
      id: scopedId('member', member.id),
      name: member.name,
      role: member.role,
      capacity: member.capacity,
      online_sort_order: index,
    })),
    issues: data.issues.map((issue) => ({
      id: scopedId('issue', issue.key),
      key: issue.key,
      project_id: scopedId('project', issue.projectId),
      iteration_id: scopedId('iteration', issue.iterationId),
      type: issue.type,
      title: issue.title,
      status: issue.status,
      priority: issue.priority,
      handler_member_id: scopedId('member', issue.assigneeId),
      story_points: issue.storyPoints,
      blocker_reason: issue.blockerReason ?? null,
      description: '',
      acceptance_criteria: '',
      epic_name: issue.projectId,
      draft: false,
    })),
    issue_events: [],
    issue_labels: [],
    issue_collaborators: [],
    documents: data.docs.map((doc) => ({
      id: scopedId('document', doc.id),
      scope: doc.scope,
      project_id: doc.scope === 'project' ? scopedId('project', doc.projectId) : null,
      directory_id: scopedId('directory', doc.directory),
      title: doc.title,
      content_type: 'markdown',
      body: doc.body,
      editor_member_id: scopedId('member', doc.comments[0]?.authorId ?? data.members[0].id),
      sync_feishu_doc: false,
      created_at: doc.updatedAtLabel,
      updated_at: doc.updatedAtLabel,
    })),
    document_directories: directoryPaths.map((path, index) => {
      const scope = path.startsWith('全局文档') ? ('global' as const) : ('project' as const)
      return {
        id: scopedId('directory', path),
        scope,
        project_id: scope === 'project' ? projectIdFromDirectoryPath(data, path) : null,
        parent_id: parentDirectoryPath(path) ? scopedId('directory', parentDirectoryPath(path) ?? '') : null,
        name: path.split('/').at(-1) ?? path,
        sort_order: index,
        created_at: '刚刚',
        updated_at: '刚刚',
      }
    }),
    document_issue_links: data.docs.flatMap((doc) =>
      doc.linkedIssueKeys.map((issueKey) => ({
        doc_id: scopedId('document', doc.id),
        issue_id: scopedId('issue', issueKey),
      })),
    ),
    document_comments: data.docs.flatMap((doc) =>
      doc.comments.map((comment) => ({
        id: scopedId('comment', comment.id),
        doc_id: scopedId('document', doc.id),
        author_member_id: scopedId('member', comment.authorId),
        body: comment.body,
        resolved: comment.resolved,
        created_at: comment.createdAtLabel,
      })),
    ),
    standups: data.standups.map((standup) => ({
      id: scopedId('standup', standup.id),
      project_id: scopedId('project', standup.projectId),
      date: standup.dateLabel,
      date_label: standup.dateLabel,
      weekday_label: standup.weekdayLabel,
      time_label: standup.timeLabel,
      calendar_label: standup.calendarLabel,
    })),
    standup_items: data.standups.flatMap((standup) =>
      standup.items.map((item, index) => ({
        id: scopedId('standup-item', `${standup.id}:${item.memberId}:${index}`),
        standup_id: scopedId('standup', standup.id),
        member_id: scopedId('member', item.memberId),
        sort_order: index,
        yesterday_text: item.yesterday.join('\n'),
        today_text: item.today.join('\n'),
        blockers_text: item.blockers.join('\n'),
      })),
    ),
    milestones: data.milestones.map((milestone) => ({
      id: scopedId('milestone', milestone.id),
      project_id: scopedId('project', milestone.projectId),
      iteration_id: scopedId('iteration', milestone.iterationId),
      title: milestone.title,
      start_day: milestone.startDay,
      end_day: milestone.endDay,
      status: milestone.status,
      participant_member_id: scopedId('member', milestone.ownerId),
    })),
    feishu_member_profiles: [],
    feishu_groups: data.feishu.groups.map((group, index) => ({
      id: scopedId('feishu-group', group),
      project_id: scopedId('project', firstProject.id),
      name: group,
      purpose: '通知 / 查询',
      member_count_label: `${data.members.length} 人`,
      status: '已连接',
      sort_order: index,
    })),
    feishu_bot_rules: [],
    feishu_notifications: [],
    feishu_queries: data.feishu.queryCommands.map((command, index) => ({
      id: scopedId('feishu-query', `${index}:${formatFeishuCommand(command)}`),
      command: formatFeishuCommand(command),
      response_title: `查询 ${command.type}`,
      response_body_json: { lines: [] },
      created_at: '刚刚',
    })),
  }
}

function directoryAncestors(path: string): string[] {
  return path.split('/').map((_, index, parts) => parts.slice(0, index + 1).join('/'))
}

function parentDirectoryPath(path: string) {
  const parts = path.split('/')
  return parts.length > 1 ? parts.slice(0, -1).join('/') : null
}

function projectIdFromDirectoryPath(data: SeedData, path: string) {
  const projectName = path.split('/')[1]
  const project = data.projects.find((item) => item.name === projectName)
  return project ? scopedId('project', project.id) : null
}
