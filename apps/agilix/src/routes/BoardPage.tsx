import { useRef, useState } from 'react'
import type { Issue, IssueStatus, ProjectId, SeedData } from '../domain/types'
import { completionPercent, donePoints, getActiveIteration, getMember, getProject, issueTypeLabel, issuesForProjectFilter, memberInitial, priorityMeta, statusMeta, statusOrder, sumPoints } from '../domain/view-models'

export function BoardPage({
  data,
  projectId,
  onMoveIssue,
  onOpenIssues,
  onOpenFeishu,
}: {
  data: SeedData
  projectId: ProjectId | 'all'
  onMoveIssue: (issueKey: string, status: IssueStatus) => void
  onOpenIssues?: () => void
  onOpenFeishu?: () => void
}) {
  const [view, setView] = useState<BoardView>('board')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const baseIssues = issuesForProjectFilter(data, projectId)
  const normalizedQuery = query.trim().toLowerCase()
  const issues =
    normalizedQuery === ''
      ? baseIssues
      : baseIssues.filter((issue) => [issue.key, issue.title, getMember(data, issue.assigneeId).name].some((value) => value.toLowerCase().includes(normalizedQuery)))
  const selectedProject = projectId === 'all' ? null : getProject(data, projectId)
  const selectedIteration = selectedProject ? getActiveIteration(data, selectedProject) : null
  const totalPoints = sumPoints(issues)
  const members = Array.from(new Set(issues.map((issue) => issue.assigneeId))).map((memberId) => getMember(data, memberId))

  return (
    <>
      <header className="top">
        <h1 className="sr-only-action">看板</h1>
        <div className="sprint-chip">
          <span className="sp-no">{selectedProject ? selectedProject.activeIterationCode.replace(/\D/g, '') : data.projects.length}</span>
          <div className="sp-tt">
            <b>{selectedIteration ? selectedIteration.name : '全部项目'}</b>
            <span>{selectedIteration ? `第 ${selectedIteration.day}/${selectedIteration.totalDays} 天` : `${data.projects.length} 个项目`}</span>
          </div>
        </div>
        <div className="top-title">
          <div className="sub">
            <span className="num">{selectedIteration ? `还剩 ${selectedIteration.totalDays - selectedIteration.day + 1} 天` : `${issues.length} 个工单`}</span>
            <span>·</span>
            <span>{completionPercent(issues)}% 故事点完成</span>
          </div>
        </div>
        <div className="top-sp" />
        <div className="feishu-dot">{data.feishu.groups[0]}</div>
        <button
          className="icon-btn"
          aria-label="搜索"
          onClick={() => {
            setSearchOpen(true)
            requestAnimationFrame(() => searchInputRef.current?.focus())
          }}
        >
          ⌕
        </button>
        {searchOpen ? <input ref={searchInputRef} className="inline-search" aria-label="搜索看板工单" type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="搜索工单" /> : null}
        <button className="icon-btn" aria-label="通知" onClick={onOpenFeishu}>
          !
        </button>
        <button className="btn btn-primary" onClick={onOpenIssues}>
          新建
        </button>
      </header>
      <div className="toolbar">
        <div className="seg">
          {boardViews.map((item) => (
            <button className={view === item.value ? 'on' : undefined} key={item.value} onClick={() => setView(item.value)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="chip-flat">筛选</div>
        <div className="chip-flat">经办人</div>
        <div className="chip-flat">分组:状态</div>
        <div className="top-sp" />
        <span className="label">
          共 {issues.length} 个工单 · 故事点 {donePoints(issues)}/{totalPoints}
        </span>
        <div className="facepile">
          {members.map((member) => (
            <div className="av sm" key={member.id}>
              {memberInitial(member)}
            </div>
          ))}
        </div>
      </div>
      <main className="board-wrap">
        {view === 'board' ? <BoardColumns data={data} issues={issues} onMoveIssue={onMoveIssue} /> : null}
        {view === 'table' ? <BoardTable data={data} issues={issues} /> : null}
        {view === 'timeline' ? <BoardTimeline data={data} issues={issues} /> : null}
      </main>
    </>
  )
}

type BoardView = 'board' | 'table' | 'timeline'

const boardViews: Array<{ label: string; value: BoardView }> = [
  { label: '看板', value: 'board' },
  { label: '表格', value: 'table' },
  { label: '时间线', value: 'timeline' },
]

function BoardColumns({ data, issues, onMoveIssue }: { data: SeedData; issues: Issue[]; onMoveIssue: (issueKey: string, status: IssueStatus) => void }) {
  return (
    <div className="board">
      {statusOrder.map((status) => {
        const list = issues.filter((issue) => issue.status === status)
        const points = sumPoints(list)
        return (
          <section className="col" key={status}>
            <div className="col-h">
              <span className="col-bar" style={{ background: statusMeta[status].color }} />
              <span className="col-t">{statusMeta[status].boardLabel}</span>
              <span className="col-n">{list.length}</span>
              <span className="top-sp" />
              <span className="label">{points}pt</span>
            </div>
            <div className="col-body">
              {list.map((issue) => (
                <IssueCard key={issue.key} data={data} issue={issue} onMoveIssue={onMoveIssue} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function BoardTable({ data, issues }: { data: SeedData; issues: Issue[] }) {
  return (
    <table className="lg-table" aria-label="看板表格视图">
      <thead>
        <tr>
          <th>工单号</th>
          <th>标题</th>
          <th>状态</th>
          <th>经办人</th>
          <th className="r">点数</th>
        </tr>
      </thead>
      <tbody>
        {issues.map((issue) => {
          const member = getMember(data, issue.assigneeId)
          return (
            <tr key={issue.key}>
              <td>
                <span className="wid">{issue.key}</span>
              </td>
              <td>{issue.title}</td>
              <td>
                <span className={`badge ${statusMeta[issue.status].badgeClass}`}>{statusMeta[issue.status].label}</span>
              </td>
              <td>{member.name}</td>
              <td className="r">{issue.storyPoints}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function BoardTimeline({ data, issues }: { data: SeedData; issues: Issue[] }) {
  return (
    <ol className="feed" aria-label="看板时间线视图">
      {issues.map((issue) => {
        const member = getMember(data, issue.assigneeId)
        return (
          <li className="feed-item" key={issue.key}>
            <b>
              {issue.key} · {issue.title}
            </b>
            <p>
              {member.name} · {statusMeta[issue.status].label} · {issue.storyPoints}pt
            </p>
          </li>
        )
      })}
    </ol>
  )
}

function IssueCard({ data, issue, onMoveIssue }: { data: SeedData; issue: Issue; onMoveIssue: (issueKey: string, status: IssueStatus) => void }) {
  const member = getMember(data, issue.assigneeId)
  const project = getProject(data, issue.projectId)
  const progress = issue.status === 'todo' ? 0 : issue.status === 'doing' ? 55 : issue.status === 'blocked' ? 45 : issue.status === 'review' ? 85 : 100

  return (
    <article className="card">
      <div className="card-accent" style={{ background: statusMeta[issue.status].color }} />
      <div className="card-top">
        <div className="card-top-l">
          <span className="type-tag">{issueTypeLabel[issue.type]}</span>
          <span className="wid">{issue.key}</span>
        </div>
        <span className={`pri ${priorityMeta[issue.priority].className}`}>{priorityMeta[issue.priority].label}</span>
      </div>
      <div className="card-title">{issue.title}</div>
      <div className="card-tags">
        <span className="tag">{project.name}</span>
        <span className="tag">{statusMeta[issue.status].label}</span>
        {issue.linkedDocIds.length > 0 ? <span className="feishu-dot">文档</span> : null}
      </div>
      {issue.status !== 'done' ? (
        <div className="subbar">
          <i style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      <div className="card-meta">
        <span className="label">{issue.blockerReason ?? ''}</span>
        <div className="card-meta-l">
          <span className="pts">
            {issue.storyPoints}
            <small>pt</small>
          </span>
          <div className="facepile">
            <div className="av sm">{memberInitial(member)}</div>
          </div>
          {issue.status !== 'done' ? (
            <button className="sr-only-action" aria-label={`${issue.key} 完成`} onClick={() => onMoveIssue(issue.key, 'done')}>
              完成
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
