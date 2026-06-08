import type { SeedData } from './types'

export function buildWorkloadRows(data: SeedData) {
  return data.members.map((member) => {
    const activeIssues = data.issues.filter((issue) => issue.assigneeId === member.id && issue.status !== 'done')
    const assignedPoints = activeIssues.reduce((sum, issue) => sum + issue.storyPoints, 0)

    return {
      memberId: member.id,
      name: member.name,
      activeIssueKeys: activeIssues.map((issue) => issue.key),
      assignedPoints,
      loadPercent: Math.round((assignedPoints / member.capacity) * 100),
    }
  })
}
