import type { ProjectId, SeedData } from './types'

export function buildGanttRows(data: SeedData, projectId: ProjectId) {
  return data.milestones
    .filter((milestone) => milestone.projectId === projectId)
    .sort((left, right) => left.startDay - right.startDay)
    .map((milestone) => ({
      id: milestone.id,
      title: milestone.title,
      startDay: milestone.startDay,
      endDay: milestone.endDay,
      status: milestone.status,
      ownerId: milestone.ownerId,
    }))
}
