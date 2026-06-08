import type { Issue, IssueStatus, MemberId, ProjectId } from './types'

interface IssueFilters {
  projectId: ProjectId | 'all'
  status: IssueStatus | 'all'
  assigneeId: MemberId | 'all'
  keyword: string
}

export function filterIssues(issues: Issue[], filters: IssueFilters): Issue[] {
  const keyword = filters.keyword.toLowerCase()

  return issues.filter((issue) => {
    if (filters.projectId !== 'all' && issue.projectId !== filters.projectId) return false
    if (filters.status !== 'all' && issue.status !== filters.status) return false
    if (filters.assigneeId !== 'all' && issue.assigneeId !== filters.assigneeId) return false
    if (keyword && !`${issue.key} ${issue.title}`.toLowerCase().includes(keyword)) return false
    return true
  })
}

export function groupIssuesByStatus(issues: Issue[]): Record<IssueStatus, Issue[]> {
  return {
    todo: issues.filter((issue) => issue.status === 'todo'),
    doing: issues.filter((issue) => issue.status === 'doing'),
    review: issues.filter((issue) => issue.status === 'review'),
    blocked: issues.filter((issue) => issue.status === 'blocked'),
    done: issues.filter((issue) => issue.status === 'done'),
  }
}

export function moveIssue(issues: Issue[], issueKey: string, status: IssueStatus): Issue[] {
  return issues.map((issue) => (issue.key === issueKey ? { ...issue, status } : issue))
}
