import type { Database } from './db'

export interface Env {
  DB: D1Database
  JWT_SECRET: string
  FEISHU_APP_ID: string
  FEISHU_APP_SECRET: string
  FEISHU_ENCRYPT_KEY?: string
  FEISHU_VERIFICATION_TOKEN?: string
  FRONTEND_URL: string
  GITLAB_APP_ID?: string
  GITLAB_APP_SECRET?: string
  GITHUB_APP_ID?: string
  GITHUB_APP_SECRET?: string
}

export interface AuthUser {
  userId: string
  feishuUserId: string
  name: string
}

export interface AppContext {
  Bindings: Env
  Variables: {
    db: Database
    user: AuthUser
  }
}
