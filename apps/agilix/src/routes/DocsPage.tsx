import { useMemo, useRef, useState } from 'react'
import type { CreateDocInput } from '../api/client'
import { ProjectFilter, type ProjectFilterValue } from '../components/ProjectFilter'
import { filterDocs, searchDocs } from '../domain/docs'
import type { Doc, DocComment, FeishuQueryCommand, ProjectId, SeedData } from '../domain/types'
import {
  docProjectLabel,
  getMember,
  issueTypeLabel,
  linkedIssue,
  memberInitial,
  statusMeta,
} from '../domain/view-models'

export function DocsPage({
  data,
  projectId,
  onProjectChange,
  onAddComment,
  onCreateDoc,
}: {
  data: SeedData
  projectId: ProjectFilterValue
  onProjectChange?: (projectId: ProjectFilterValue) => void
  onAddComment: (docId: string, comment: DocComment) => void | Promise<void>
  onCreateDoc: (doc: CreateDocInput) => void | Promise<void>
}) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<DocTab>('all')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const baseDocs = filterDocs(data.docs, projectId)
  const tabDocs = filterDocsByTab(baseDocs, tab)
  const docs = query === '' ? tabDocs : searchDocs(tabDocs, query)
  const selected = docs[0]
  const unresolvedComments = docs.reduce(
    (sum, doc) => sum + doc.comments.filter((comment) => !comment.resolved).length,
    0,
  )
  const directoryItems = useMemo(() => buildDirectoryItems(docs), [docs])
  const docsQuery = data.feishu.queryCommands.find(
    (command): command is Extract<FeishuQueryCommand, { type: 'docs' }> => command.type === 'docs',
  )

  return (
    <>
      <header className="top">
        <div className="top-title">
          <h1>文档</h1>
          <div className="sub">
            <span>全局文档 + 项目文档</span>
            <span>·</span>
            <span>统一目录、评论与关联 Issue</span>
          </div>
        </div>
        <div className="top-sp" />
        <button
          className="icon-btn"
          title="搜索"
          aria-label="搜索"
          onClick={() => {
            searchInputRef.current?.focus()
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
        </button>
        {onProjectChange ? (
          <ProjectFilter projects={data.projects} value={projectId} onChange={onProjectChange} />
        ) : (
          <button className="btn btn-ghost" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            {projectId === 'all'
              ? '全部项目'
              : docProjectLabel(data, projectDocForProject(data, projectId))}
          </button>
        )}
        <button
          className="btn btn-primary"
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 5v14M5 12h14" />
          </svg>
          新建文档
        </button>
      </header>

      <div className="toolbar">
        <div className="seg">
          {docTabs.map((item) => (
            <button
              className={tab === item.value ? 'on' : undefined}
              key={item.value}
              onClick={() => setTab(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="chip-flat">
          项目:
          {projectId === 'all'
            ? '全部'
            : docProjectLabel(data, projectDocForProject(data, projectId))}
        </div>
        <div className="chip-flat">类型:方案 + 接口</div>
        <div className="chip-flat">评论:未解决 {unresolvedComments}</div>
        <div className="top-sp" />
        <span className="label">
          {docs.length} 篇 · 项目文档{' '}
          <b className="num">{docs.filter((doc) => doc.scope === 'project').length}</b> · 待评论{' '}
          <b className="num block">{unresolvedComments}</b>
        </span>
      </div>

      <div className="docs-body">
        <aside className="doc-tree">
          <div className="tree-head">
            <div className="tree-title">目录</div>
            <label className="tree-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4-4" />
              </svg>
              <input
                ref={searchInputRef}
                aria-label="搜索文档"
                type="search"
                placeholder="搜索标题、正文、评论"
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
              />
            </label>
          </div>
          <TreeSection
            title="全局文档"
            items={directoryItems.filter((item) => item.scope === 'global')}
          />
          <TreeSection
            title="项目文档"
            items={directoryItems.filter((item) => item.scope === 'project')}
          />
          <TreeSection
            title="快捷筛选"
            items={[
              { label: '有未解决评论', count: unresolvedComments },
              {
                label: '关联 Issue',
                count: docs.filter((doc) => doc.linkedIssueKeys.length > 0).length,
              },
            ]}
          />
        </aside>

        <main className="doc-list">
          <div className="doc-summary">
            <Summary label="全部文档" value={String(docs.length)} />
            <Summary
              label="项目文档"
              value={String(docs.filter((doc) => doc.scope === 'project').length)}
            />
            <Summary
              label="全局文档"
              value={String(docs.filter((doc) => doc.scope === 'global').length)}
            />
            <Summary label="待评论" value={String(unresolvedComments)} danger />
          </div>
          <div className="list-head">
            <h2>最近更新</h2>
            <span className="label">按更新时间排序</span>
          </div>

          {docs.map((doc, index) => (
            <DocListRow key={doc.id} data={data} doc={doc} active={index === 0} />
          ))}
        </main>

        {selected ? (
          <DocDetail
            data={data}
            selected={selected}
            docsQuery={docsQuery}
            onAddComment={onAddComment}
          />
        ) : null}
      </div>
    </>
  )
}

type DocTab = 'all' | 'recent' | 'comments' | 'project' | 'global'

const docTabs: Array<{ label: string; value: DocTab }> = [
  { label: '全部', value: 'all' },
  { label: '最近更新', value: 'recent' },
  { label: '待我评论', value: 'comments' },
  { label: '项目文档', value: 'project' },
  { label: '全局文档', value: 'global' },
]

function filterDocsByTab(docs: Doc[], tab: DocTab): Doc[] {
  if (tab === 'comments')
    return docs.filter((doc) => doc.comments.some((comment) => !comment.resolved))
  if (tab === 'project') return docs.filter((doc) => doc.scope === 'project')
  if (tab === 'global') return docs.filter((doc) => doc.scope === 'global')
  return docs
}

function TreeSection({
  title,
  items,
}: {
  title: string
  items: Array<{ label: string; count: number; scope?: Doc['scope'] }>
}) {
  return (
    <div className="tree-sec">
      <div className="tree-sec-t">{title}</div>
      {items.map((item, index) => (
        <div className={`tree-i ${index === 0 ? 'on' : ''}`} key={`${title}-${item.label}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 19V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" />
            <path d="M8 7h6" />
          </svg>
          <span>{item.label}</span>
          <small>{item.count}</small>
        </div>
      ))}
    </div>
  )
}

function Summary({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`stat-num ${danger ? 'block' : ''}`}>{value}</div>
    </div>
  )
}

function DocListRow({ data, doc, active }: { data: SeedData; doc: Doc; active: boolean }) {
  const owner = docOwner(data, doc)
  return (
    <div className={`doc-row-lg ${active ? 'on' : ''}`}>
      <div className="doc-mark">{doc.title.slice(0, 1)}</div>
      <div className="doc-main">
        <div className="doc-title">
          <span>{doc.title}</span>
          <span className={`scope ${doc.scope === 'global' ? 'global' : ''}`}>
            {docProjectLabel(data, doc)}
          </span>
        </div>
        <div className="doc-meta">
          {lastDirectorySegment(doc)} · 关联 {doc.linkedIssueKeys.join(' / ')} ·{' '}
          {doc.updatedAtLabel}
        </div>
      </div>
      {owner ? (
        <div className="doc-owner">
          <div className="av sm">{memberInitial(owner)}</div>
          {owner.name}
        </div>
      ) : null}
      <div className="comment-chip">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {doc.comments.length}
      </div>
    </div>
  )
}

function DocDetail({
  data,
  selected,
  docsQuery,
  onAddComment,
}: {
  data: SeedData
  selected: Doc
  docsQuery?: Extract<FeishuQueryCommand, { type: 'docs' }>
  onAddComment: (docId: string, comment: DocComment) => void | Promise<void>
}) {
  return (
    <aside className="doc-detail">
      <div className="detail-top">
        <div className="kicker">Selected Document</div>
        <h2>{selected.title}</h2>
        <div className="detail-meta">
          <span className="scope">{docProjectLabel(data, selected)}</span>
          <span>{lastDirectorySegment(selected)}</span>
          <span>·</span>
          <span>{detailUpdatedLabel(data, selected)}</span>
        </div>
      </div>

      <div className="detail-section">
        <h3>目录</h3>
        <div className="outline">
          {selected.directory.split('/').map((title, index) => (
            <div key={`${title}-${index}`}>
              <span>
                {index + 1}. {title}
              </span>
              <small>{String(index + 1).padStart(2, '0')}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="detail-section">
        <h3>正文</h3>
        <p>{selected.body}</p>
      </div>

      <div className="detail-section">
        <h3>关联 Issue</h3>
        <div className="rel">
          {selected.linkedIssueKeys.map((key) => {
            const issue = linkedIssue(data, key)
            return (
              <div className="rel-i" key={key}>
                <span className="wid">{key}</span>
                <b>{issue.title}</b>
                <span className={`type-tag`}>{issueTypeLabel[issue.type]}</span>
                <span className={`badge ${statusMeta[issue.status].badgeClass}`}>
                  <span className="dot" />
                  {statusMeta[issue.status].label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="detail-section">
        <h3>评论</h3>
        {selected.comments.map((comment) => {
          const author = getMember(data, comment.authorId)
          return (
            <div className="comment" key={comment.id}>
              <div className="av sm">{memberInitial(author)}</div>
              <div>
                <b>{author.name}</b>
                <span className="time">{comment.createdAtLabel}</span>
                <p>{comment.body}</p>
              </div>
            </div>
          )
        })}
        <button
          className="reply-box"
          aria-label="新增评论"
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
          回复或 @成员,评论会同步到关联 Issue 动态。
        </button>
      </div>

      {docsQuery ? (
        <div className="detail-section">
          <div className="feishu-doc">
            <b>飞书查询示例</b>
            群里发送 <span className="wid">/docs {docsQuery.query}</span>，返回文档摘要、关联 Issue
            和未解决评论数。
          </div>
        </div>
      ) : null}
    </aside>
  )
}

function buildDirectoryItems(
  docs: Doc[],
): Array<{ label: string; count: number; scope: Doc['scope'] }> {
  const map = new Map<string, { label: string; count: number; scope: Doc['scope'] }>()
  for (const doc of docs) {
    const key = `${doc.scope}:${doc.directory}`
    const current = map.get(key) ?? { label: lastDirectorySegment(doc), count: 0, scope: doc.scope }
    current.count += 1
    map.set(key, current)
  }
  return Array.from(map.values())
}

function lastDirectorySegment(doc: Doc): string {
  return doc.directory.split('/').at(-1)!
}

function docOwner(data: SeedData, doc: Doc) {
  const comment = doc.comments[0]
  if (comment) return getMember(data, comment.authorId)
  const issueKey = doc.linkedIssueKeys[0]
  if (issueKey) return getMember(data, linkedIssue(data, issueKey).assigneeId)
  return null
}

function detailUpdatedLabel(data: SeedData, doc: Doc) {
  const owner = docOwner(data, doc)
  return owner ? `${owner.name}更新于 ${doc.updatedAtLabel}` : doc.updatedAtLabel
}

function projectDocForProject(data: SeedData, projectId: ProjectId): Doc {
  const doc = data.docs.find((item) => item.scope === 'project' && item.projectId === projectId)
  if (!doc) throw new Error(`Project doc not found: ${projectId}`)
  return doc
}
