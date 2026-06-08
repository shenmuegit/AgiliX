import type { Doc, ProjectId } from './types'

export interface DirectoryNode {
  name: string
  count: number
}

export function buildDocDirectoryTree(docs: Doc[]): DirectoryNode[] {
  return [
    { name: '全局文档', count: docs.filter((doc) => doc.scope === 'global').length },
    { name: '项目文档', count: docs.filter((doc) => doc.scope === 'project').length },
  ]
}

export function filterDocs(docs: Doc[], projectId: ProjectId | 'all'): Doc[] {
  if (projectId === 'all') return docs
  return docs.filter((doc) => doc.scope === 'global' || doc.projectId === projectId)
}

export function searchDocs(docs: Doc[], keyword: string): Doc[] {
  const normalized = keyword.toLowerCase()
  return docs.filter((doc) => `${doc.title} ${doc.body} ${doc.comments.map((comment) => comment.body).join(' ')}`.toLowerCase().includes(normalized))
}
