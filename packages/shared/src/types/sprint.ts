export type MilestoneStatus = 'ACTIVE' | 'COMPLETED'

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
