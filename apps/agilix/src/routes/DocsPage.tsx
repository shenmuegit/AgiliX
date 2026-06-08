import { useMemo, useState } from 'react'
import type { CreateDocInput } from '../api/client'
import { buildDocDirectoryTree, filterDocs, searchDocs } from '../domain/docs'
import type { DocComment, ProjectId, SeedData } from '../domain/types'

export function DocsPage({
  data,
  projectId,
  onAddComment,
  onCreateDoc,
}: {
  data: SeedData
  projectId: ProjectId | 'all'
  onAddComment: (docId: string, comment: DocComment) => void | Promise<void>
  onCreateDoc: (doc: CreateDocInput) => void | Promise<void>
}) {
  const [query, setQuery] = useState('')
  const baseDocs = filterDocs(data.docs, projectId)
  const docs = query === '' ? baseDocs : searchDocs(baseDocs, query)
  const directories = buildDocDirectoryTree(baseDocs)
  const selected = docs[0]

  const linkedIssueKeys = useMemo(() => {
    if (!selected) return []
    return selected.linkedIssueKeys.map((key) => {
      const issue = data.issues.find((item) => item.key === key)
      if (!issue) throw new Error(`Linked issue not found: ${key}`)
      return issue.key
    })
  }, [data.issues, selected])

  return (
    <main>
      <header>
        <h1>文档</h1>
        <p>全局文档 + 项目文档</p>
        <button
          onClick={() => {
            void onCreateDoc({
              id: 'doc-global-created',
              scope: 'global',
              title: '新建全局文档',
              directory: '全局文档/待整理',
              body: '从 AgiliX 文档页创建的全局文档',
              linkedIssueKeys: [],
              comments: [],
              updatedAtLabel: '刚刚',
            })
          }}
        >
          新建文档
        </button>
      </header>
      <label>
        搜索文档
        <input aria-label="搜索文档" type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
      </label>
      <aside>
        <h2>目录</h2>
        {directories.map((directory) => (
          <div key={directory.name}>{directory.name}</div>
        ))}
      </aside>
      <section>
        {docs.map((doc) => (
          <article key={doc.id}>
            <h2>{doc.title}</h2>
            <p>{doc.directory}</p>
          </article>
        ))}
      </section>
      {selected ? (
        <aside>
          <h2>文档详情</h2>
          <h3>关联 Issue</h3>
          {linkedIssueKeys.map((key) => (
            <span key={key}>{key}</span>
          ))}
          <h3>评论</h3>
          {selected.comments.map((comment) => (
            <p key={comment.id}>{comment.body}</p>
          ))}
          <button
            onClick={() => {
              void onAddComment(selected.id, {
                id: 'comment-ui',
                docId: selected.id,
                authorId: 'zhou',
                body: '从 AgiliX 文档页补充的评论',
                resolved: false,
                createdAtLabel: '刚刚',
              })
            }}
          >
            新增评论
          </button>
        </aside>
      ) : null}
    </main>
  )
}
