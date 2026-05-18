export type GitPlatform = 'GITLAB' | 'GITHUB'

export interface GitProvider {
  id: string
  type: GitPlatform
  baseUrl: string
  createdAt: string
}

export interface GitRepository {
  id: string
  name: string
  fullPath: string
  defaultBranch: string
}

export interface MergeRequestBrief {
  id: string
  externalId: string
  title: string
  state: string
  author: string
  sourceBranch: string
  targetBranch: string
  ciStatus: string | null
  webUrl: string | null
  createdAt: string
}

export interface PipelineBrief {
  id: string
  status: string
  webUrl: string | null
}

export interface CommitBrief {
  sha: string
  message: string
  author: string
  createdAt: string
}
