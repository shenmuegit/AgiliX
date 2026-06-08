import { useMemo, useState } from 'react'
import type { CreateDocInput } from '../api/client'
import { buildDocDirectoryTree, filterDocs, searchDocs } from '../domain/docs'
import type { Doc, DocComment, ProjectId, SeedData } from '../domain/types'

const prototypeRows: Array<{
  id: string
  mark: string
  title: string
  scope: string
  global?: boolean
  meta: string
  owner: string
  ownerClass: string
  comments: number
}> = [
  { id: 'doc-result-card', mark: '方', title: '结果卡片重设计方案', scope: '搜索平台', meta: '方案 · 关联 SRCH-212 / SRCH-186 · 12 分钟前', owner: '江月', ownerClass: 'av-jiang', comments: 4 },
  { id: 'doc-search-contract', mark: '接', title: '搜索接口字段约定', scope: '搜索平台', meta: '接口 · 关联 SRCH-209 · 1 小时前', owner: '苏晴', ownerClass: 'av-su', comments: 2 },
  { id: 'doc-release-checklist', mark: '发', title: '灰度发布检查清单', scope: '全局', global: true, meta: '清单 · 被 4 个项目引用 · 昨天', owner: '何川', ownerClass: 'av-he', comments: 1 },
  { id: 'doc-standup-note', mark: '会', title: 'S24 搜索体验重构站会纪要', scope: '搜索平台', meta: '纪要 · 关联今日阻塞 · 昨天', owner: '林夏', ownerClass: 'av-lin', comments: 6 },
  { id: 'doc-issue-standard', mark: '规', title: 'Issue 标题与验收标准规范', scope: '全局', global: true, meta: '规范 · 创建 Issue 时引用 · 2 天前', owner: '陈牧', ownerClass: 'av-chen', comments: 0 },
]

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
  const docTitles = new Set(docs.map((doc) => doc.title))
  const displayRows = query === '' ? prototypeRows : prototypeRows.filter((row) => docTitles.has(row.title))
  const directories = buildDocDirectoryTree(baseDocs)
  const selected = docs.find((doc) => doc.id === 'doc-result-card') ?? docs[0]

  const linkedIssueKeys = useMemo(() => {
    if (!selected) return []
    return selected.linkedIssueKeys.map((key) => {
      const issue = data.issues.find((item) => item.key === key)
      if (!issue) throw new Error(`Linked issue not found: ${key}`)
      return issue.key
    })
  }, [data.issues, selected])

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
        <button className="icon-btn" title="搜索" aria-label="搜索">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
        </button>
        <button className="btn btn-ghost">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          全部项目
        </button>
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
          {['全部', '最近更新', '待我评论', '项目文档', '全局文档'].map((label, index) => (
            <button className={index === 0 ? 'on' : undefined} key={label}>
              {label}
            </button>
          ))}
        </div>
        <div className="chip-flat">项目:全部</div>
        <div className="chip-flat">类型:方案 + 接口</div>
        <div className="chip-flat">评论:未解决 2</div>
        <div className="top-sp" />
        <span className="label">
          28 篇 · 本周更新 <b className="num">9</b> · 待评论 <b className="num block">3</b>
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
              <input aria-label="搜索文档" type="search" placeholder="搜索标题、正文、评论" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
            </label>
          </div>
          <TreeSection title="全局文档" items={[['团队规范', '6', true], ['发布清单', '4'], ['接口约定', '5']]} />
          <TreeSection title="项目文档" items={directories.map((directory) => [directory.name, String(directory.count)] as [string, string])} />
          <TreeSection title="快捷筛选" items={[['有未解决评论', '2'], ['关联待 Review', '3']]} />
        </aside>

        <main className="doc-list">
          <div className="doc-summary">
            <Summary label="全部文档" value="28" />
            <Summary label="项目文档" value="13" />
            <Summary label="全局文档" value="15" />
            <Summary label="待评论" value="3" danger />
          </div>
          <div className="list-head">
            <h2>最近更新</h2>
            <span className="label">按更新时间排序</span>
          </div>

          {displayRows.map((row, index) => (
            <DocListRow key={row.id} row={row} active={index === 0} />
          ))}
        </main>

        {selected ? <DocDetail selected={selected} linkedIssueKeys={linkedIssueKeys} onAddComment={onAddComment} /> : null}
      </div>
    </>
  )
}

function TreeSection({ title, items }: { title: string; items: Array<[string, string] | [string, string, boolean]> }) {
  return (
    <div className="tree-sec">
      <div className="tree-sec-t">{title}</div>
      {items.map(([label, count, active]) => (
        <div className={`tree-i ${active ? 'on' : ''}`} key={`${title}-${label}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 19V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" />
            <path d="M8 7h6" />
          </svg>
          <span>{label}</span>
          <small>{count}</small>
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

function DocListRow({ row, active }: { row: (typeof prototypeRows)[number]; active: boolean }) {
  return (
    <div className={`doc-row-lg ${active ? 'on' : ''}`}>
      <div className="doc-mark">{row.mark}</div>
      <div className="doc-main">
        <div className="doc-title">
          <span>{row.title}</span>
          <span className={`scope ${row.global ? 'global' : ''}`}>{row.scope}</span>
        </div>
        <div className="doc-meta">{row.meta}</div>
      </div>
      <div className="doc-owner">
        <div className={`av sm ${row.ownerClass}`}>{row.owner.slice(0, 1)}</div>
        {row.owner}
      </div>
      <div className="comment-chip">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {row.comments}
      </div>
    </div>
  )
}

function DocDetail({ selected, linkedIssueKeys, onAddComment }: { selected: Doc; linkedIssueKeys: string[]; onAddComment: (docId: string, comment: DocComment) => void | Promise<void> }) {
  return (
    <aside className="doc-detail">
      <div className="detail-top">
        <div className="kicker">Selected Document</div>
        <h2>{selected.title}</h2>
        <div className="detail-meta">
          <span className="scope">{selected.scope === 'project' ? '搜索平台' : '全局'}</span>
          <span>方案</span>
          <span>·</span>
          <span>江月更新于 {selected.updatedAtLabel}</span>
        </div>
      </div>

      <div className="detail-section">
        <h3>目录</h3>
        <div className="outline">
          {['背景与问题', '信息结构', '摘要高亮规则', '验收标准'].map((title, index) => (
            <div key={title}>
              <span>
                {index + 1}. {title}
              </span>
              <small>{String(index * 2 + 1).padStart(2, '0')}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="detail-section">
        <h3>关联 Issue</h3>
        <div className="rel">
          {linkedIssueKeys.map((key) => (
            <div className="rel-i" key={key}>
              <span className="wid">{key}</span>
              <b>{key === 'SRCH-186' ? '搜索历史与收藏打通' : '结果卡片摘要高亮'}</b>
              <span className={`badge ${key === 'SRCH-186' ? 'b-review' : 'b-block'}`}>
                <span className="dot" />
                {key === 'SRCH-186' ? 'Review' : '待确认'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="detail-section">
        <h3>评论</h3>
        {selected.comments.map((comment) => (
          <div className="comment" key={comment.id}>
            <div className={`av sm ${comment.authorId === 'gao' ? 'av-gao' : 'av-chen'}`}>{comment.authorId === 'gao' ? '高' : '陈'}</div>
            <div>
              <b>{comment.authorId === 'gao' ? '高远' : '陈牧'}</b>
              <span className="time">{comment.createdAtLabel}</span>
              <p>{comment.body}</p>
            </div>
          </div>
        ))}
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

      <div className="detail-section">
        <div className="feishu-doc">
          <b>飞书查询示例</b>
          群里发送 <span className="wid">/docs 结果卡片</span>，返回这篇文档的摘要、链接、关联 Issue 和未解决评论数。
        </div>
      </div>
    </aside>
  )
}
