import type { Issue, SeedData } from '../domain/types'
import { blockedIssues, completionPercent, donePoints, getActiveIteration, projectMemberIds, reviewIssues, sumPoints } from '../domain/view-models'

export function ProjectsPage({ data }: { data: SeedData }) {
  const projectCards = data.projects.map((project) => {
    const iteration = getActiveIteration(data, project)
    const issues = data.issues.filter((issue) => issue.projectId === project.id && issue.iterationId === iteration.id)
    const blocked = blockedIssues(issues)
    const review = reviewIssues(issues)
    const pct = completionPercent(issues)
    const total = sumPoints(issues)
    const done = donePoints(issues)
    const members = projectMemberIds(issues).map((memberId) => {
      const member = data.members.find((item) => item.id === memberId)
      if (!member) throw new Error(`Member not found: ${memberId}`)
      return member
    })
    const health = getHealth(blocked.length, review.length, pct)

    return { project, iteration, issues, blocked, pct, total, done, members, health }
  })

  const allBlocked = projectCards.flatMap((card) => card.blocked)
  const allIssues = data.issues
  const allDone = donePoints(allIssues)

  return (
    <>
      <header className="top">
        <div className="top-title">
          <h1>项目总览</h1>
          <div className="sub">
            <span>研发组合 · {data.projects.length} 个进行中项目</span>
          </div>
        </div>
        <div className="top-sp" />
        <div className="feishu-dot">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          每周一推送组合周报
        </div>
        <button className="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 5v14M5 12h14" />
          </svg>
          新建项目
        </button>
      </header>

      <main className="pv-body">
        <div className="summary">
          <SummaryItem label="进行中项目" value={String(data.projects.length)} note={`共 ${data.members.length} 名成员协作`} />
          <SummaryItem label="活跃迭代" value={String(data.iterations.length)} note={`${data.iterations.filter((iteration) => iteration.day >= iteration.totalDays).length} 个待发布`} />
          <SummaryItem label="本周完成点数" value={String(allDone)} unit="pt" note={`计划 ${sumPoints(allIssues)} pt`} />
          <SummaryItem label="需关注" value={String(allBlocked.length)} unit="项受阻" note={allBlocked[0] ? `${projectName(data, allBlocked[0])} · ${allBlocked[0].title}` : '暂无阻塞'} danger={allBlocked.length > 0} />
        </div>
        <div className="pv-grid">
          {projectCards.map(({ project, iteration, issues, blocked, pct, total, done, members, health }) => (
            <article className="pcard" key={project.id}>
              <div className="pc-top">
                <div className="pc-glyph" style={{ background: project.color }}>
                  {project.glyph}
                </div>
                <div className="pc-name">
                  <h3>
                    {project.name}
                    <span className={`health ${health.className}`}>
                      <span className="dot" />
                      {health.label}
                    </span>
                  </h3>
                  <div className="sprint">
                    <span className="wid">
                      {iteration.code} · {iteration.name}
                    </span>
                    <span>·</span>
                    <span>
                      第 {iteration.day} / {iteration.totalDays} 天
                    </span>
                  </div>
                </div>
              </div>
              <div className="pc-body">
                <div className="pc-prog-h">
                  <span className="label">迭代进度</span>
                  <span className="pct">
                    {pct}
                    <span>%</span>
                  </span>
                </div>
                <div className="pbar">
                  <i style={{ width: `${pct}%`, background: blocked.length > 0 ? 'var(--st-block)' : project.color }} />
                </div>
                <div className="pc-stats">
                  <div>
                    <div className="v">
                      {done}
                      <span>/{total}</span>
                    </div>
                    <div className="l">故事点</div>
                  </div>
                  <div>
                    <div className="v">{issues.filter((issue) => issue.type === 'bug' && issue.status !== 'done').length}</div>
                    <div className="l">未解缺陷</div>
                  </div>
                  <div>
                    <div className="v">{members.length}</div>
                    <div className="l">成员</div>
                  </div>
                </div>
                <div className="pc-foot">
                  <div>
                    <div className="label">负责人 · 团队</div>
                    <div className="facepile">
                      {members.slice(0, 4).map((member) => (
                        <div className="av sm" key={`${project.id}-${member.id}`}>
                          {member.name.slice(0, 1)}
                        </div>
                      ))}
                      {members.length > 4 ? <div className="more">+{members.length - 4}</div> : null}
                    </div>
                  </div>
                  <div>
                    <div className="label">近五迭代速度</div>
                    <div className="spark">
                      {sparkValues(data, project.id).map((value, index, values) => (
                        <i key={`${project.id}-${index}-${value}`} className={index === values.length - 1 ? 'cur' : ''} style={{ height: `${Math.max(4, Math.round((value / Math.max(...values, 1)) * 26))}px` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </>
  )
}

function getHealth(blockedCount: number, reviewCount: number, pct: number): { label: string; className: string } {
  if (blockedCount > 0) return { label: '受阻', className: 'h-block' }
  if (reviewCount > 0 || pct < 50) return { label: '偏紧', className: 'h-risk' }
  return { label: '正常', className: 'h-ok' }
}

function projectName(data: SeedData, issue: Issue): string {
  const project = data.projects.find((item) => item.id === issue.projectId)
  if (!project) throw new Error(`Project not found: ${issue.projectId}`)
  return project.name
}

function sparkValues(data: SeedData, projectId: string): number[] {
  const values = data.iterations.filter((iteration) => iteration.projectId === projectId).map((iteration) => iteration.velocity)
  return values.length > 0 ? values : [0]
}

function SummaryItem({ label, value, unit, note, danger }: { label: string; value: string; unit?: string; note: string; danger?: boolean }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`stat-num ${danger ? 'block' : ''}`}>
        {value}
        {unit ? <span>{unit}</span> : null}
      </div>
      <div className="muted">{note}</div>
    </div>
  )
}
