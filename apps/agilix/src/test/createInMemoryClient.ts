import type {
  AppStateResponse,
  CreateDocumentCommentRequest,
  CreateDocumentDirectoryRequest,
  CreateDocumentRequest,
  CreateProjectRequest,
  RecordFeishuNotificationRequest,
} from '@agilix/contract'
import type {
  AgiliXClient,
  FeishuNotificationInput,
  FeishuReply,
  LegacyCreateDocInput,
} from '../api/client'
import { buildFeishuReply, formatFeishuCommand } from '../domain/feishu'
import { seedData } from '../domain/fixtures'
import { moveIssue } from '../domain/issues'
import type {
  CreateProjectInput,
  DocComment,
  DocDirectory,
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
  const contractProjectCreates: CreateProjectRequest[] = []
  const contractDocCreates: CreateDocumentRequest[] = []
  const contractDocComments: CreateDocumentCommentRequest[] = []
  const contractDocDirectories: CreateDocumentDirectoryRequest[] = []
  const contractStandupSaves: string[] = []
  const contractMilestoneSaves: string[] = []
  const standupSaves: string[] = []
  const milestoneSaves: string[] = []
  const feishuNotifications: FeishuNotificationInput[] = []
  const contractFeishuNotifications: RecordFeishuNotificationRequest[] = []
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

  function validateContractFeishuNotification(input: RecordFeishuNotificationRequest) {
    const state = seedDataToAppState(data)
    if (!state.feishu_groups.some((group) => group.id === input.target_group_id))
      throw new Error(`Feishu group not found: ${input.target_group_id}`)
    switch (input.trigger) {
      case '站会摘要':
        if (!state.standups.some((standup) => standup.id === input.payload_json.standup_id))
          throw new Error(`Standup not found: ${input.payload_json.standup_id}`)
        return
      case '阻塞提醒': {
        const missingIssueId = input.payload_json.issue_ids.find(
          (issueId) => !state.issues.some((issue) => issue.id === issueId),
        )
        if (missingIssueId) throw new Error(`Issue not found: ${missingIssueId}`)
        return
      }
      case '文档评论': {
        if (!state.documents.some((doc) => doc.id === input.payload_json.document_id))
          throw new Error(`Document not found: ${input.payload_json.document_id}`)
        if (!state.document_comments.some((comment) => comment.id === input.payload_json.comment_id))
          throw new Error(`Comment not found: ${input.payload_json.comment_id}`)
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
    recordedContractProjectCreates(): CreateProjectRequest[]
    recordedContractDocCreates(): CreateDocumentRequest[]
    recordedContractDocComments(): CreateDocumentCommentRequest[]
    recordedContractStandupSaves(): string[]
    recordedContractMilestoneSaves(): string[]
    recordedContractFeishuNotifications(): string[]
  } = {
    async loadAppState() {
      loadAppStateCalls += 1
      return seedDataToAppState(data)
    },
    async loadData() {
      loadDataCalls += 1
      return clone(data)
    },
    async createContractProject(input) {
      if (data.projects.some((project) => project.id === input.code))
        throw new Error(`Project already exists: ${input.code}`)
      contractProjectCreates.push(clone(input))
      data = {
        ...data,
        projects: [
          ...data.projects,
          {
            id: input.code,
            name: input.name,
            glyph: input.glyph,
            color: input.color,
            activeIterationCode: input.initial_iteration.code,
          },
        ],
        iterations: [
          ...data.iterations,
          {
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
        ],
      }
      return seedDataToAppState(data)
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
    async createContractDocDirectory(input) {
      const state = seedDataToAppState(data)
      const parentPath =
        input.parent_id === null ? null : appStateDirectoryPath(state.document_directories, input.parent_id)
      if (input.parent_id !== null && !parentPath)
        throw new Error(`Parent directory not found: ${input.parent_id}`)
      const project =
        input.project_id === null
          ? undefined
          : data.projects.find((item) => scopedId('project', item.id) === input.project_id)
      const path = parentPath
        ? `${parentPath}/${input.name}`
        : input.scope === 'global'
          ? input.name
          : `项目文档/${project?.name}/${input.name}`
      const directory: DocDirectory = {
        id: scopedId('directory', path),
        scope: input.scope,
        projectId: project?.id,
        parentId: input.parent_id,
        path,
        name: input.name,
      }
      contractDocDirectories.push(clone(input))
      data = { ...data, docDirectories: [...(data.docDirectories ?? []), directory] }
      return seedDataToAppState(data)
    },
    async createContractDoc(input) {
      const state = seedDataToAppState(data)
      const directoryPath = appStateDirectoryPath(state.document_directories, input.directory_id)
      if (!directoryPath) throw new Error(`Document directory not found: ${input.directory_id}`)
      const project =
        input.project_id === null
          ? undefined
          : data.projects.find((item) => scopedId('project', item.id) === input.project_id)
      const docId = `doc-contract-${data.docs.length + 1}`
      const baseDoc = {
        id: docId,
        title: input.title,
        directory: directoryPath,
        body: input.body,
        linkedIssueKeys: input.linked_issue_ids.map((issueId) => legacyScopedId(issueId, 'issue')),
        comments: [],
        updatedAtLabel: '刚刚',
      }
      const doc =
        input.scope === 'global'
          ? {
              ...baseDoc,
              scope: 'global' as const,
            }
          : (() => {
              if (!project) throw new Error(`Project not found: ${input.project_id}`)
              return {
                ...baseDoc,
                scope: 'project' as const,
                projectId: project.id,
              }
            })()
      contractDocCreates.push(clone(input))
      data = {
        ...data,
        docs: [...data.docs, doc],
      }
      return seedDataToAppState(data)
    },
    async addContractDocComment(docId, input) {
      const legacyDocId = legacyScopedId(docId, 'document')
      if (!data.docs.some((doc) => doc.id === legacyDocId))
        throw new Error(`Document not found: ${docId}`)
      const comment = {
        id: `comment-contract-${contractDocComments.length + 1}`,
        docId: legacyDocId,
        authorId: legacyScopedId(input.author_member_id, 'member') as DocComment['authorId'],
        body: input.body,
        resolved: false,
        createdAtLabel: '刚刚',
      }
      contractDocComments.push(clone(input))
      data = {
        ...data,
        docs: data.docs.map((doc) =>
          doc.id === legacyDocId ? { ...doc, comments: [...doc.comments, comment] } : doc,
        ),
      }
      return seedDataToAppState(data)
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
    async createDoc(doc: LegacyCreateDocInput) {
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
    async saveContractStandup(standupId, input) {
      const legacyStandupId = legacyScopedId(standupId, 'standup')
      const standup = data.standups.find((item) => item.id === legacyStandupId)
      if (!standup) throw new Error(`Standup not found: ${standupId}`)
      contractStandupSaves.push(standupId)
      standupSaves.push(legacyStandupId)
      data = {
        ...data,
        standups: [
          ...data.standups.filter((item) => item.id !== legacyStandupId),
          {
            ...standup,
            items: input.items.map((item) => ({
              memberId: legacyScopedId(item.member_id, 'member') as Standup['items'][number]['memberId'],
              yesterday: splitContractLines(item.yesterday_text),
              today: splitContractLines(item.today_text),
              blockers: splitContractLines(item.blockers_text),
            })),
          },
        ],
      }
      return seedDataToAppState(data)
    },
    async saveContractMilestone(milestoneId, input) {
      const legacyMilestoneId = legacyScopedId(milestoneId, 'milestone')
      const milestone = data.milestones.find((item) => item.id === legacyMilestoneId)
      if (!milestone) throw new Error(`Milestone not found: ${milestoneId}`)
      contractMilestoneSaves.push(milestoneId)
      milestoneSaves.push(legacyMilestoneId)
      data = {
        ...data,
        milestones: [
          ...data.milestones.filter((item) => item.id !== legacyMilestoneId),
          {
            ...milestone,
            title: input.title,
            startDay: input.start_day,
            endDay: input.end_day,
            status: input.status as Milestone['status'],
            ownerId: legacyScopedId(input.participant_member_id, 'member') as Milestone['ownerId'],
          },
        ],
      }
      return seedDataToAppState(data)
    },
    async recordFeishuNotification(input: FeishuNotificationInput) {
      validateFeishuNotification(input)
      feishuNotifications.push(clone(input))
    },
    async recordContractFeishuNotification(input) {
      validateContractFeishuNotification(input)
      contractFeishuNotifications.push(clone(input))
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
    recordedContractFeishuNotifications() {
      return contractFeishuNotifications.map((notification) => notification.trigger)
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
    recordedContractProjectCreates() {
      return clone(contractProjectCreates)
    },
    recordedContractDocCreates() {
      return clone(contractDocCreates)
    },
    recordedContractDocComments() {
      return clone(contractDocComments)
    },
    recordedContractStandupSaves() {
      return [...contractStandupSaves]
    },
    recordedContractMilestoneSaves() {
      return [...contractMilestoneSaves]
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

function splitContractLines(value: string) {
  return value === '' ? [] : value.split('\n')
}

function appStateDirectoryPath(
  directories: AppStateResponse['document_directories'],
  directoryId: string,
): string | undefined {
  const directory = directories.find((item) => item.id === directoryId)
  if (!directory) return undefined
  if (directory.parent_id === null) return directory.name
  const parentPath = appStateDirectoryPath(directories, directory.parent_id)
  return parentPath ? `${parentPath}/${directory.name}` : undefined
}

export function seedDataToAppState(data: SeedData): AppStateResponse {
  const explicitDirectoryByPath = new Map((data.docDirectories ?? []).map((directory) => [directory.path, directory]))
  const directoryPaths = Array.from(new Set([
    ...data.docs.flatMap((doc) => directoryAncestors(doc.directory)),
    ...(data.docDirectories?.map((directory) => directory.path) ?? []),
  ]))
  const directoryIdForPath = (path: string) => explicitDirectoryByPath.get(path)?.id ?? scopedId('directory', path)
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
      directory_id: directoryIdForPath(doc.directory),
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
      const explicitDirectory = explicitDirectoryByPath.get(path)
      return {
        id: directoryIdForPath(path),
        scope,
        project_id: scope === 'project' ? projectIdFromDirectoryPath(data, path) : null,
        parent_id:
          explicitDirectory?.parentId ??
          (parentDirectoryPath(path) ? directoryIdForPath(parentDirectoryPath(path) ?? '') : null),
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
