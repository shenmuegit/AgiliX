export type ProjectId = string
export type MemberId = 'lin' | 'chen' | 'gao' | 'su' | 'han' | 'he' | 'jiang' | 'zhou'
export type IssueStatus = 'todo' | 'doing' | 'review' | 'blocked' | 'done'
export type IssueType = 'story' | 'bug' | 'task' | 'tech'
export type Priority = 'high' | 'medium' | 'low'
export type DocScope = 'global' | 'project'
export type MilestoneStatus = 'done' | 'doing' | 'risk' | 'planned'
export type DocQueryText = string & { readonly __brand: 'DocQueryText' }
export type NonEmptyArray<T> = [T, ...T[]]
export type FeishuQueryCommand =
  | { type: 'team' }
  | { type: 'blockers' }
  | { type: 'docs'; query: DocQueryText }
export type FeishuNotificationTrigger = '站会摘要' | '阻塞提醒' | '文档评论'
export type FeishuNotificationPayload =
  | { trigger: '站会摘要'; payload: { standupId: string } }
  | { trigger: '阻塞提醒'; payload: { issueKeys: NonEmptyArray<string> } }
  | { trigger: '文档评论'; payload: { docId: string; commentId: string } }

export interface Project {
  id: ProjectId
  contractId?: string
  name: string
  glyph: string
  color: string
  activeIterationCode: string
}

export interface CreateProjectInput {
  project: Project
  iteration: Iteration
}

export interface Member {
  id: MemberId
  contractId?: string
  name: string
  role: string
  capacity: number
}

export interface Iteration {
  id: string
  projectId: ProjectId
  code: string
  name: string
  dateRangeLabel: string
  calendarTitle: string
  calendarWeeks: IterationCalendarWeek[]
  day: number
  totalDays: number
  goal: string
  velocity: number
}

export interface IterationCalendarWeek {
  label: string
  rangeLabel: string
  days: string[]
}

export interface Issue {
  id?: string
  key: string
  projectId: ProjectId
  iterationId: string
  type: IssueType
  title: string
  status: IssueStatus
  priority: Priority
  assigneeId: MemberId
  storyPoints: number
  blockerReason?: string
  linkedDocIds: string[]
}

export interface DocComment {
  id: string
  docId: string
  authorId: MemberId
  body: string
  resolved: boolean
  createdAtLabel: string
}

interface DocBase {
  id: string
  title: string
  directory: string
  body: string
  linkedIssueKeys: string[]
  comments: DocComment[]
  updatedAtLabel: string
}

export type GlobalDoc = DocBase & {
  scope: 'global'
  projectId?: never
}

export type ProjectDoc = DocBase & {
  scope: 'project'
  projectId: ProjectId
}

export type Doc = GlobalDoc | ProjectDoc

export interface DocDirectory {
  id: string
  scope: DocScope
  projectId?: ProjectId
  parentId: string | null
  path: string
  name: string
}

export interface StandupItem {
  memberId: MemberId
  yesterday: string[]
  today: string[]
  blockers: string[]
}

export interface Standup {
  id: string
  projectId: ProjectId
  dateLabel: string
  weekdayLabel: string
  timeLabel: string
  calendarLabel: string
  items: StandupItem[]
}

export interface Milestone {
  id: string
  projectId: ProjectId
  iterationId: string
  title: string
  startDay: number
  endDay: number
  status: MilestoneStatus
  ownerId: MemberId
}

export interface FeishuConfig {
  groups: string[]
  groupIds?: string[]
  queryCommands: FeishuQueryCommand[]
  notificationTriggers: FeishuNotificationTrigger[]
}

export interface SeedData {
  navItems: string[]
  projects: Project[]
  members: Member[]
  iterations: Iteration[]
  issues: Issue[]
  docs: Doc[]
  docDirectories?: DocDirectory[]
  standups: Standup[]
  milestones: Milestone[]
  feishu: FeishuConfig
}
