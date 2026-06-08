import { Fragment, useRef, useState } from 'react'
import type { Issue, IssueStatus, ProjectId, SeedData } from '../domain/types'
import {
  completionPercent,
  donePoints,
  getActiveIteration,
  getIteration,
  getProject,
  issueTypeLabel,
  issuesForProjectFilter,
  priorityMeta,
  statusMeta,
  statusOrder,
  sumPoints,
} from '../domain/view-models'

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
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const baseIssues = issuesForProjectFilter(data, projectId)
  const normalizedQuery = query.trim().toLowerCase()
  const searchedIssues =
    normalizedQuery === ''
      ? baseIssues
      : baseIssues.filter((issue) =>
          searchableIssueValues(data, issue).some((value) => value.toLowerCase().includes(normalizedQuery)),
        )
  const issues =
    statusFilter === 'all'
      ? searchedIssues
      : searchedIssues.filter((issue) => issue.status === statusFilter)
  const selectedProject = projectId === 'all' ? null : getProject(data, projectId)
  const selectedIteration = selectedProject ? getActiveIteration(data, selectedProject) : null
  const totalPoints = sumPoints(issues)

  return (
    <>
      <header className="top">
        <h1 className="sr-only-action">看板</h1>
        <div className="sprint-chip">
          <span className="sp-no">
            {selectedProject
              ? selectedProject.activeIterationCode.replace(/\D/g, '')
              : data.projects.length}
          </span>
          <div className="sp-tt">
            <b>{selectedIteration ? selectedIteration.name : '全部项目'}</b>
            <span>
              {selectedIteration
                ? `${selectedIteration.dateRangeLabel} · 第 ${selectedIteration.day} 天`
                : `${data.projects.length} 个项目`}
            </span>
          </div>
        </div>
        <div className="top-title">
          <div className="sub">
            <span className="num">
              {selectedIteration
                ? `还剩 ${selectedIteration.totalDays - selectedIteration.day + 1} 天`
                : `${issues.length} 个工单`}
            </span>
            <span>·</span>
            <span>{completionPercent(issues)}% 故事点完成</span>
          </div>
        </div>
        <div className="top-sp" />
        <div className="feishu-dot">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          机器人已同步
        </div>
        <button
          className="icon-btn"
          aria-label="搜索"
          onClick={() => {
            setSearchOpen(true)
            requestAnimationFrame(() => searchInputRef.current?.focus())
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
        </button>
        {searchOpen ? (
          <input
            ref={searchInputRef}
            className="inline-search"
            aria-label="搜索看板工单"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="搜索工单"
          />
        ) : null}
        <button className="icon-btn" aria-label="通知" onClick={onOpenFeishu}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
        </button>
        <button className="btn btn-primary" onClick={onOpenIssues}>
          新建
        </button>
      </header>
      <div className="toolbar">
        <div className="seg">
          {boardViews.map((item) => (
            <button
              className={view === item.value ? 'on' : undefined}
              key={item.value}
              onClick={() => setView(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="状态筛选">
          {statusFilters.map((filter) => (
            <button
              className={statusFilter === filter.value ? 'on' : undefined}
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="top-sp" />
        <span className="label">
          共 {issues.length} 个工单 · 故事点 {donePoints(issues)}/{totalPoints}
        </span>
      </div>
      <main className="board-wrap">
        {view === 'board' ? (
          <BoardColumns data={data} issues={issues} onMoveIssue={onMoveIssue} />
        ) : null}
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

const statusFilters: Array<{ label: string; value: IssueStatus | 'all' }> = [
  { label: '全部', value: 'all' },
  ...statusOrder.map((status) => ({ label: statusMeta[status].label, value: status })),
]

function searchableIssueValues(data: SeedData, issue: Issue): string[] {
  const project = getProject(data, issue.projectId)
  const iteration = getIteration(data, issue.iterationId)
  return [
    issue.key,
    issue.title,
    issueTypeLabel[issue.type],
    priorityMeta[issue.priority].label,
    statusMeta[issue.status].label,
    project.name,
    iteration.name,
    iteration.code,
    issue.blockerReason ?? '',
  ]
}

function BoardColumns({
  data,
  issues,
  onMoveIssue,
}: {
  data: SeedData
  issues: Issue[]
  onMoveIssue: (issueKey: string, status: IssueStatus) => void
}) {
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
          <th>类型</th>
          <th>优先级</th>
          <th>状态</th>
          <th>项目 / 迭代</th>
          <th className="r">点数</th>
          <th>阻塞说明</th>
        </tr>
      </thead>
      <tbody>
        {groupIssuesByStatus(issues).map((group) => (
          <Fragment key={group.status}>
            <tr className="grp-row">
              <td colSpan={8}>
                <span className="label">
                  状态 · {statusMeta[group.status].label} · {group.issues.length} 项 ·{' '}
                  {sumPoints(group.issues)}pt
                </span>
              </td>
            </tr>
            {group.issues.map((issue) => {
              const project = getProject(data, issue.projectId)
              const iteration = getIteration(data, issue.iterationId)
              return (
                <tr key={issue.key}>
                  <td>
                    <span className="wid">{issue.key}</span>
                  </td>
                  <td>
                    <div className="lg-title">
                      <strong>{issue.title}</strong>
                      {issue.linkedDocIds.length > 0 ? <span className="feishu-dot">文档</span> : null}
                    </div>
                  </td>
                  <td>
                    <span className="type-tag">{issueTypeLabel[issue.type]}</span>
                  </td>
                  <td>
                    <span className={`pri ${priorityMeta[issue.priority].className}`}>
                      {priorityMeta[issue.priority].label}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${statusMeta[issue.status].badgeClass}`}>
                      <span className="dot" />
                      {statusMeta[issue.status].label}
                    </span>
                  </td>
                  <td>
                    <div className="lg-title">
                      <strong>{project.name}</strong>
                      <p>{iteration.name}</p>
                    </div>
                  </td>
                  <td className="r">
                    <span className="num">{issue.storyPoints}</span>
                  </td>
                  <td>{issue.blockerReason ?? '-'}</td>
                </tr>
              )
            })}
          </Fragment>
        ))}
      </tbody>
    </table>
  )
}

function BoardTimeline({ data, issues }: { data: SeedData; issues: Issue[] }) {
  return (
    <ol className="status-timeline" aria-label="看板状态时间线">
      {groupIssuesByStatus(issues).map((group) => {
        return (
          <li className="timeline-status" key={group.status}>
            <div className="timeline-dot" style={{ background: statusMeta[group.status].color }} />
            <div className="timeline-status-body">
              <b>
                {statusMeta[group.status].label} · {group.issues.length} 项 ·{' '}
                {sumPoints(group.issues)}pt
              </b>
              <div className="timeline-issues">
                {group.issues.map((issue) => {
                  const project = getProject(data, issue.projectId)
                  const iteration = getIteration(data, issue.iterationId)
                  return (
                    <article className="timeline-issue" key={issue.key}>
                      <b>
                        {issue.key} · {issue.title}
                      </b>
                      <p>
                        {project.name} · {iteration.name} · {issueTypeLabel[issue.type]} ·{' '}
                        {priorityMeta[issue.priority].label}优先级 · {issue.storyPoints}pt
                      </p>
                      {issue.blockerReason ? <em>{issue.blockerReason}</em> : null}
                    </article>
                  )
                })}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function groupIssuesByStatus(issues: Issue[]) {
  return statusOrder
    .map((status) => ({ status, issues: issues.filter((issue) => issue.status === status) }))
    .filter((group) => group.issues.length > 0)
}

function IssueCard({
  data,
  issue,
  onMoveIssue,
}: {
  data: SeedData
  issue: Issue
  onMoveIssue: (issueKey: string, status: IssueStatus) => void
}) {
  const project = getProject(data, issue.projectId)
  const progress =
    issue.status === 'todo'
      ? 0
      : issue.status === 'doing'
        ? 55
        : issue.status === 'blocked'
          ? 45
          : issue.status === 'review'
            ? 85
            : 100

  return (
    <article className="card">
      <div className="card-accent" style={{ background: statusMeta[issue.status].color }} />
      <div className="card-top">
        <div className="card-top-l">
          <span className="type-tag">{issueTypeLabel[issue.type]}</span>
          <span className="wid">{issue.key}</span>
        </div>
        <span className={`pri ${priorityMeta[issue.priority].className}`}>
          {priorityMeta[issue.priority].label}
        </span>
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
          {issue.status !== 'done' ? (
            <button
              className="sr-only-action"
              aria-label={`${issue.key} 完成`}
              onClick={() => onMoveIssue(issue.key, 'done')}
            >
              完成
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
