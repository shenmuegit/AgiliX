import type { Doc, Issue, IssueStatus, IssueType, Member, MemberId, Priority, Project, ProjectId, SeedData } from './types'

export const statusMeta: Record<IssueStatus, { label: string; badgeClass: string; boardLabel: string; color: string }> = {
  todo: { label: '待办', boardLabel: '待办', badgeClass: 'b-todo', color: 'var(--st-todo)' },
  doing: { label: '进行中', boardLabel: '进行中', badgeClass: 'b-doing', color: 'var(--st-doing)' },
  review: { label: '评审', boardLabel: '评审', badgeClass: 'b-review', color: 'var(--st-review)' },
  blocked: { label: '阻塞', boardLabel: '阻塞', badgeClass: 'b-block', color: 'var(--st-block)' },
  done: { label: '已完成', boardLabel: '已完成', badgeClass: 'b-done', color: 'var(--st-done)' },
}

export const priorityMeta: Record<Priority, { label: string; className: string }> = {
  high: { label: '高', className: 'p1' },
  medium: { label: '中', className: 'p2' },
  low: { label: '低', className: 'p3' },
}

export const issueTypeLabel: Record<IssueType, string> = {
  story: 'S',
  bug: 'B',
  task: 'T',
  tech: 'D',
}

export const statusOrder: IssueStatus[] = ['todo', 'doing', 'review', 'blocked', 'done']

export function getProject(data: SeedData, projectId: ProjectId): Project {
  const project = data.projects.find((item) => item.id === projectId)
  if (!project) throw new Error(`Project not found: ${projectId}`)
  return project
}

export function getMember(data: SeedData, memberId: MemberId): Member {
  const member = data.members.find((item) => item.id === memberId)
  if (!member) throw new Error(`Member not found: ${memberId}`)
  return member
}

export function getActiveIteration(data: SeedData, project: Project) {
  const iteration = data.iterations.find((item) => item.projectId === project.id && item.code === project.activeIterationCode)
  if (!iteration) throw new Error(`Active iteration not found: ${project.id}/${project.activeIterationCode}`)
  return iteration
}

export function getIteration(data: SeedData, iterationId: string) {
  const iteration = data.iterations.find((item) => item.id === iterationId)
  if (!iteration) throw new Error(`Iteration not found: ${iterationId}`)
  return iteration
}

export function issuesForProject(data: SeedData, projectId: ProjectId): Issue[] {
  return data.issues.filter((issue) => issue.projectId === projectId)
}

export function issuesForProjectFilter(data: SeedData, projectId: ProjectId | 'all'): Issue[] {
  return projectId === 'all' ? data.issues : issuesForProject(data, projectId)
}

export function issuesForIteration(data: SeedData, projectId: ProjectId, iterationCode: string): Issue[] {
  const iteration = data.iterations.find((item) => item.projectId === projectId && item.code === iterationCode)
  if (!iteration) throw new Error(`Iteration not found: ${projectId}/${iterationCode}`)
  return data.issues.filter((issue) => issue.iterationId === iteration.id)
}

export function memberInitial(member: Member): string {
  return member.name.slice(0, 1)
}

export function memberAvatarClass(memberId: MemberId): string {
  return `av-${memberId}`
}

export function projectMemberIds(issues: Issue[]): MemberId[] {
  return Array.from(new Set(issues.map((issue) => issue.assigneeId)))
}

export function sumPoints(issues: Issue[]): number {
  return issues.reduce((sum, issue) => sum + issue.storyPoints, 0)
}

export function donePoints(issues: Issue[]): number {
  return sumPoints(issues.filter((issue) => issue.status === 'done'))
}

export function completionPercent(issues: Issue[]): number {
  const total = sumPoints(issues)
  if (total === 0) return 0
  return Math.round((donePoints(issues) / total) * 100)
}

export function unresolvedIssues(issues: Issue[]): Issue[] {
  return issues.filter((issue) => issue.status !== 'done')
}

export function blockedIssues(issues: Issue[]): Issue[] {
  return issues.filter((issue) => issue.status === 'blocked')
}

export function reviewIssues(issues: Issue[]): Issue[] {
  return issues.filter((issue) => issue.status === 'review')
}

export function latestDocs(docs: Doc[], limit: number): Doc[] {
  return docs.slice(0, limit)
}

export function docProjectLabel(data: SeedData, doc: Doc): string {
  return doc.scope === 'global' ? '全局' : getProject(data, doc.projectId).name
}

export function linkedIssue(data: SeedData, key: string): Issue {
  const issue = data.issues.find((item) => item.key === key)
  if (!issue) throw new Error(`Linked issue not found: ${key}`)
  return issue
}

export function issueProject(data: SeedData, issue: Issue): Project {
  return getProject(data, issue.projectId)
}
