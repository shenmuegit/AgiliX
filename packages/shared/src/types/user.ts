export interface User {
  id: string
  feishuUserId: string
  name: string
  email: string | null
  avatarUrl: string | null
  createdAt: string
}

export interface UserBrief {
  id: string
  name: string
  avatarUrl: string | null
}
