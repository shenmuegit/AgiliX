import { Fragment, useRef, useState } from 'react'
import { ProjectFilter, type ProjectFilterValue } from '../components/ProjectFilter'
import type { Issue, IssueType, SeedData } from '../domain/types'
import { getActiveIteration, getIteration, getMember, getProject, issuesForProjectFilter, issueTypeLabel, memberInitial, priorityMeta, statusMeta, sumPoints } from '../domain/view-models'

export function IssuesPage({ data, projectId, onProjectChange }: { data: SeedData; projectId: ProjectFilterValue; onProjectChange: (projectId: ProjectFilterValue) => void }) {
  const [typeFilter, setTypeFilter] = useState<IssueType | 'all'>('all')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const baseIssues = issuesForProjectFilter(data, projectId)
  const typeFilteredIssues = typeFilter === 'all' ? baseIssues : baseIssues.filter((issue) => issue.type === typeFilter)
  const normalizedQuery = query.trim().toLowerCase()
  const issues =
    normalizedQuery === ''
      ? typeFilteredIssues
      : typeFilteredIssues.filter((issue) => [issue.key, issue.title, getMember(data, issue.assigneeId).name].some((value) => value.toLowerCase().includes(normalizedQuery)))
  const selectedProject = projectId === 'all' ? null : getProject(data, projectId)
  const selectedIteration = selectedProject ? getActiveIteration(data, selectedProject) : null
  const groups = groupIssues(data, issues)
  const doingCount = issues.filter((issue) => issue.status === 'doing').length
  const bugCount = issues.filter((issue) => issue.type === 'bug').length
  const assigneeCount = new Set(issues.map((issue) => issue.assigneeId)).size

  return (
    <>
      <header className="top">
        <div className="top-title">
          <h1>需求 & 缺陷</h1>
          <div className="sub">
            <span>{selectedIteration ? `${selectedIteration.name} · 工作项台账` : '全部项目 · 工作项台账'}</span>
          </div>
        </div>
        <div className="top-sp" />
        <button
          className="icon-btn"
          title="搜索"
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
        {searchOpen ? <input ref={searchInputRef} className="inline-search" aria-label="搜索工单" type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="搜索工单号、标题、经办人" /> : null}
        <button className="btn btn-ghost" onClick={() => setNotice(`已准备导出 ${issues.length} 个工单`)}>
          导出
        </button>
        <button className="btn btn-primary" onClick={() => setNotice('新建工单需要接入创建接口')}>
          新建工单
        </button>
      </header>
      <div className="toolbar">
        <div className="seg">
          {issueTypeFilters.map((filter) => (
            <button className={typeFilter === filter.value ? 'on' : undefined} key={filter.value} onClick={() => setTypeFilter(filter.value)}>
              {filter.label}
            </button>
          ))}
        </div>
        <div className="chip-flat">状态:进行中 +{doingCount}</div>
        <div className="chip-flat">迭代:{selectedProject ? selectedProject.activeIterationCode : '全部'}</div>
        <div className="chip-flat">经办:{assigneeCount} 人</div>
        <ProjectFilter projects={data.projects} value={projectId} onChange={onProjectChange} />
        <div className="top-sp" />
        <span className="label">{issues.length} 项 · 故事点 {sumPoints(issues)} · 缺陷 {bugCount}</span>
      </div>
      {notice ? <section className="fs-reply" role="status">{notice}</section> : null}
      <main className="lg-body">
        <table className="lg-table">
          <thead>
            <tr>
              <th>工单号</th>
              <th>标题</th>
              <th>优先级</th>
              <th>状态</th>
              <th>经办人</th>
              <th className="r">点数</th>
              <th className="r">更新</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.label}>
                <tr className="grp-row" key={group.label}>
                  <td colSpan={7}>
                    <span className="label">{group.label}</span>
                  </td>
                </tr>
                {group.issues.map((issue) => {
                  const member = getMember(data, issue.assigneeId)
                  const iteration = getIteration(data, issue.iterationId)
                  return (
                <tr key={issue.key}>
                  <td>
                    <span className="wid">{issue.key}</span>
                  </td>
                  <td>
                    <div className="lg-title">
                      <span className="type-tag">{issueTypeLabel[issue.type]}</span>
                      <span>{issue.title}</span>
                      {issue.linkedDocIds.length > 0 ? <span className="feishu-dot">文档</span> : null}
                    </div>
                  </td>
                  <td>
                    <span className={`pri ${priorityMeta[issue.priority].className}`}>{priorityMeta[issue.priority].label}</span>
                  </td>
                  <td>
                    <span className={`badge ${statusMeta[issue.status].badgeClass}`}>
                      <span className="dot" />
                      {statusMeta[issue.status].label}
                    </span>
                  </td>
                  <td>
                    <div className="assignee">
                      <div className="av sm">{memberInitial(member)}</div>
                      {member.name}
                    </div>
                  </td>
                  <td className="r">
                    <span className="num">{issue.storyPoints}</span>
                  </td>
                  <td className="r muted">{iteration.code} · 第 {iteration.day} 天</td>
                </tr>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </main>
    </>
  )
}

const issueTypeFilters: Array<{ label: string; value: IssueType | 'all' }> = [
  { label: '全部', value: 'all' },
  { label: '需求', value: 'story' },
  { label: '缺陷', value: 'bug' },
  { label: '技术债', value: 'tech' },
]

function groupIssues(data: SeedData, issues: Issue[]) {
  const groups = new Map<string, { label: string; issues: Issue[] }>()
  for (const issue of issues) {
    const project = getProject(data, issue.projectId)
    const iteration = getIteration(data, issue.iterationId)
    const label = `${project.name} · ${iteration.name}`
    const group = groups.get(label) ?? { label, issues: [] }
    group.issues.push(issue)
    groups.set(label, group)
  }
  return Array.from(groups.values())
}
