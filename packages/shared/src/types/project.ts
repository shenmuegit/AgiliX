import type { UserBrief } from './user'

export type ProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export interface Project {
  id: string
  key: string
  name: string
  description: string | null
  feishuGroupId: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectWithMembers extends Project {
  members: ProjectMember[]
}

export interface ProjectMember {
  id: string
  user: UserBrief
  role: ProjectRole
}
