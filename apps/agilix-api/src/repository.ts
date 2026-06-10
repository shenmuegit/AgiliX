import type {
  BotConfigResponse,
  FeishuTestMessageResponse,
  SaveBotConfigRequest,
  SendFeishuTestMessageRequest,
} from '@agilix/contract'
import type {
  Doc,
  DocComment,
  FeishuNotificationPayload,
  FeishuQueryCommand,
  Issue,
  IssueStatus,
  CreateProjectInput,
  DocDirectory,
  MemberId,
  Milestone,
  Project,
  ProjectId,
  SeedData,
  Standup,
} from '@agilix/app/domain/types'

export interface IssueFilters {
  projectId: ProjectId | 'all'
  status: IssueStatus | 'all'
  assigneeId: MemberId | 'all'
  keyword: string
}

export interface DocFilters {
  projectId: ProjectId | 'all'
  query: string
}

export interface FeishuReply {
  title: string
  lines: string[]
}

export type FeishuNotificationRecord = {
  id: string
  targetGroup: 'AgiliX 团队群'
  status: 'queued' | 'sent' | 'failed'
  createdAt: string
} & FeishuNotificationPayload

export interface FeishuQueryRecord {
  id: string
  command: FeishuQueryCommand
  reply: FeishuReply
  createdAt: string
}

type CreateDocInputFor<T extends Doc> = Omit<T, 'comments'> & { comments: never[] }
export type CreateDocInput = Doc extends infer D
  ? D extends Doc
    ? CreateDocInputFor<D>
    : never
  : never
export type CreateDocResult =
  | 'created'
  | 'duplicate-document'
  | 'duplicate-linked-issue'
  | 'linked-issue-not-found'
  | 'document-comments-not-empty'
export type CreateProjectResult =
  | 'created'
  | 'duplicate-project'
  | 'duplicate-iteration'
  | 'project-iteration-mismatch'
  | 'active-iteration-code-mismatch'
export type CreateIssueInput = Issue & {
  id: string
  description: string
  acceptanceCriteria: string
  epicName: string
  labels: string[]
  collaboratorIds: MemberId[]
  draft: boolean
}
export type CreateIssueResult =
  | 'created'
  | 'duplicate-issue'
  | 'project-not-found'
  | 'iteration-not-found'
  | 'handler-not-found'
  | 'collaborator-not-found'
  | 'duplicate-label'
  | 'duplicate-collaborator'
export type AddDocCommentResult = 'created' | 'document-not-found' | 'comment-doc-id-mismatch'
export type CreateDocDirectoryInput = DocDirectory
export type CreateDocDirectoryResult =
  | 'created'
  | 'duplicate-directory'
  | 'parent-directory-not-found'
  | 'project-not-found'
  | 'directory-scope-mismatch'
export interface UpdateDocDirectoryInput {
  id: string
  name?: string
  parentId?: string | null
}
export type UpdateDocDirectoryResult =
  | 'updated'
  | 'directory-not-found'
  | 'parent-directory-not-found'
  | 'duplicate-directory'
  | 'directory-scope-mismatch'
export type SaveMilestoneResult =
  | 'saved'
  | 'milestone-not-found'
  | 'project-not-found'
  | 'iteration-not-found'
  | 'owner-not-found'
export type SaveFeishuNotificationResult =
  | 'saved'
  | 'standup-not-found'
  | 'issue-not-found'
  | 'document-not-found'
  | 'comment-not-found'
export interface SaveAssignmentInput {
  issueKey: string
  handlerId: MemberId
  collaboratorIds: MemberId[]
}
export type SaveAssignmentResult =
  | 'saved'
  | 'issue-not-found'
  | 'handler-not-found'
  | 'collaborator-not-found'
  | 'duplicate-collaborator'
export interface SaveBotConfigInput {
  projectId: ProjectId
  request: SaveBotConfigRequest
}
export type SaveBotConfigResult =
  | { status: 'saved'; config: BotConfigResponse }
  | { status: 'project-not-found' }
  | { status: 'target-group-not-found' }
export type GetBotConfigResult =
  | { status: 'found'; config: BotConfigResponse }
  | { status: 'project-not-found' }
export interface SendFeishuTestMessageInput extends SendFeishuTestMessageRequest {
  id: string
  createdAt: string
}
export type SendFeishuTestMessageResult =
  | { status: 'sent'; message: FeishuTestMessageResponse }
  | { status: 'target-group-not-found' }

export interface AgiliXRepository {
  seed(data: SeedData): Promise<void>
  listProjects(): Promise<Project[]>
  createProject(input: CreateProjectInput): Promise<CreateProjectResult>
  listIssues(filters: IssueFilters): Promise<Issue[]>
  createIssue(input: CreateIssueInput): Promise<CreateIssueResult>
  saveAssignment(input: SaveAssignmentInput): Promise<SaveAssignmentResult>
  moveIssue(issueKey: string, status: IssueStatus): Promise<boolean>
  listDocs(filters: DocFilters): Promise<Doc[]>
  getDoc(docId: string): Promise<Doc | undefined>
  createDoc(doc: CreateDocInput): Promise<CreateDocResult>
  createDocDirectory(input: CreateDocDirectoryInput): Promise<CreateDocDirectoryResult>
  updateDocDirectory(input: UpdateDocDirectoryInput): Promise<UpdateDocDirectoryResult>
  addDocComment(docId: string, comment: DocComment): Promise<AddDocCommentResult>
  listStandups(filters: { projectId: ProjectId | 'all' }): Promise<Standup[]>
  saveStandup(standup: Standup): Promise<boolean>
  listMilestones(filters: { projectId: ProjectId | 'all' }): Promise<Milestone[]>
  saveMilestone(milestone: Milestone): Promise<SaveMilestoneResult>
  saveFeishuNotification(input: FeishuNotificationRecord): Promise<SaveFeishuNotificationResult>
  listFeishuNotifications(): Promise<FeishuNotificationRecord[]>
  getBotConfig(projectId: ProjectId): Promise<GetBotConfigResult>
  saveBotConfig(input: SaveBotConfigInput): Promise<SaveBotConfigResult>
  sendFeishuTestMessage(input: SendFeishuTestMessageInput): Promise<SendFeishuTestMessageResult>
  saveFeishuQuery(input: FeishuQueryRecord): Promise<void>
  listFeishuQueries(): Promise<FeishuQueryRecord[]>
  loadData(): Promise<SeedData>
}
