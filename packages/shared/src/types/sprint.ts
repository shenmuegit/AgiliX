export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED'

export interface Sprint {
  id: string
  projectId: string
  name: string
  goal: string | null
  status: SprintStatus
  startDate: string | null
  endDate: string | null
  createdAt: string
  issueCount?: number
  completedCount?: number
  totalPoints?: number
  completedPoints?: number
}

export interface SprintSnapshot {
  date: string
  totalPoints: number
  completedPoints: number
  remainingPoints: number
  totalIssues: number
  completedIssues: number
}
