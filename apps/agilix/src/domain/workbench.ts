import type { SeedData } from './types'

export function buildWorkbenchSnapshot(data: SeedData) {
  const attentionIssueKeys = data.issues.filter((issue) => issue.status === 'blocked' || issue.status === 'review').map((issue) => issue.key)
  const donePoints = data.issues.filter((issue) => issue.status === 'done').reduce((sum, issue) => sum + issue.storyPoints, 0)
  const totalPoints = data.issues.reduce((sum, issue) => sum + issue.storyPoints, 0)

  return {
    attentionIssueKeys,
    completionPercent: Math.round((donePoints / totalPoints) * 100),
    recentDocTitles: data.docs.map((doc) => doc.title),
    feishuMode: '通知 / 查询',
  }
}
