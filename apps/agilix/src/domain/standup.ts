import type { ProjectId, SeedData } from './types'

export function buildStandupSummary(data: SeedData, projectId: ProjectId) {
  const standup = data.standups.find((item) => item.projectId === projectId)
  if (!standup) throw new Error(`Standup not found: ${projectId}`)

  return {
    dateLabel: standup.dateLabel,
    timeLabel: standup.timeLabel,
    yesterdayCount: standup.items.reduce((sum, item) => sum + item.yesterday.length, 0),
    todayCount: standup.items.reduce((sum, item) => sum + item.today.length, 0),
    blockers: standup.items.flatMap((item) => item.blockers),
  }
}
