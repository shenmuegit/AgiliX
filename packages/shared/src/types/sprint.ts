export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED'
export type MilestoneStatus = 'ACTIVE' | 'COMPLETED'

export interface Sprint {
  id: string
  projectId: string
  name: string
  goal: string | null
  status: SprintStatus
  startDate: string | null
  endDate: string | null
  createdAt: string
  updatedAt: string
  totalPoints?: number
  completedPoints?: number
}

export interface SprintSnapshot {
  id: string
  sprintId: string
  date: string
  totalPoints: number
  completedPoints: number
  remainingPoints: number
  totalIssues: number
  completedIssues: number
}

export interface Milestone {
  id: string
  projectId: string
  name: string
  description: string | null
  status: MilestoneStatus
  gitRef: string | null
  createdAt: string
  updatedAt: string
}
