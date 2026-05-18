import type { UserBrief } from './user'

export type IssueType = 'EPIC' | 'STORY' | 'TASK' | 'BUG' | 'SUB_TASK'
export type Priority = 'HIGHEST' | 'HIGH' | 'MEDIUM' | 'LOW' | 'LOWEST'
export type StatusCategory = 'TODO' | 'IN_PROGRESS' | 'DONE'

export interface WorkflowStatus {
  id: string
  name: string
  category: StatusCategory
  order: number
  color: string
}

export interface Issue {
  id: string
  key: string
  title: string
  description: string | null
  type: IssueType
  priority: Priority
  storyPoints: number | null
  status: WorkflowStatus
  assignee: UserBrief | null
  reporter: UserBrief
  parentId: string | null
  sprintId: string | null
  boardColumnId: string | null
  columnOrder: number
  dueDate: string | null
  createdAt: string
  updatedAt: string
  labels: LabelBrief[]
}

export interface IssueBrief {
  id: string
  key: string
  title: string
  type: IssueType
  priority: Priority
  status: WorkflowStatus
  assignee: UserBrief | null
  storyPoints: number | null
}

export interface LabelBrief {
  id: string
  name: string
  color: string
}

export const ISSUE_TYPE_CONFIG: Record<IssueType, { label: string; color: string }> = {
  EPIC: { label: 'Epic', color: '#8B5CF6' },
  STORY: { label: 'Story', color: '#10B981' },
  TASK: { label: 'Task', color: '#3B82F6' },
  BUG: { label: 'Bug', color: '#EF4444' },
  SUB_TASK: { label: 'Sub-task', color: '#6B7280' },
}

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  HIGHEST: { label: '最高', color: '#DC2626' },
  HIGH: { label: '高', color: '#F97316' },
  MEDIUM: { label: '中', color: '#F59E0B' },
  LOW: { label: '低', color: '#3B82F6' },
  LOWEST: { label: '最低', color: '#6B7280' },
}
