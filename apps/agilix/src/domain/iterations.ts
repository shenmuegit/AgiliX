import type { ProjectId, SeedData } from './types'

export function buildIterationStats(data: SeedData, projectId: ProjectId, iterationCode: string) {
  const iteration = data.iterations.find((item) => item.projectId === projectId && item.code === iterationCode)
  if (!iteration) throw new Error(`Iteration not found: ${projectId}/${iterationCode}`)

  const issues = data.issues.filter((issue) => issue.projectId === projectId && issue.iterationId === iteration.id)
  const totalPoints = issues.reduce((sum, issue) => sum + issue.storyPoints, 0)
  const donePoints = issues.filter((issue) => issue.status === 'done').reduce((sum, issue) => sum + issue.storyPoints, 0)

  return {
    iteration,
    totalPoints,
    donePoints,
    completionPercent: Math.round((donePoints / totalPoints) * 100),
    blockedCount: issues.filter((issue) => issue.status === 'blocked').length,
    velocity: iteration.velocity,
  }
}
