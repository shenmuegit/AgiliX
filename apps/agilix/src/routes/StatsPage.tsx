import type { ReactNode } from 'react'
import type { ProjectId, SeedData } from '../domain/types'
import { blockedIssues, donePoints, getProject, issuesForIteration, statusMeta, statusOrder, sumPoints, unresolvedIssues } from '../domain/view-models'

export function StatsPage({ data, projectId, iterationCode }: { data: SeedData; projectId: ProjectId; iterationCode: string }) {
  const project = getProject(data, projectId)
  const iteration = data.iterations.find((item) => item.projectId === projectId && item.code === iterationCode)
  if (!iteration) throw new Error(`Iteration not found: ${projectId}/${iterationCode}`)

  const issues = issuesForIteration(data, projectId, iterationCode)
  const total = sumPoints(issues)
  const done = donePoints(issues)
  const remaining = total - done
  const remainingIssues = unresolvedIssues(issues).length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  const remainingDays = iteration.totalDays - iteration.day + 1
  const requiredPerDay = remainingDays > 0 ? (remaining / remainingDays).toFixed(1) : remaining.toFixed(1)
  const unresolvedBugs = issues.filter((issue) => issue.type === 'bug' && issue.status !== 'done').length
  const blocked = blockedIssues(issues).length
  const velocityValues = data.iterations.filter((item) => item.projectId === projectId).map((item) => item.velocity)
  const avgVelocity = velocityValues.reduce((sum, value) => sum + value, 0) / velocityValues.length
  const statusRows = statusOrder.map((status) => {
    const count = issues.filter((issue) => issue.status === status).length
    const width = issues.length === 0 ? 0 : Math.round((count / issues.length) * 100)
    return { status, count, width }
  })

  return (
    <>
      <header className="top">
        <div className="top-title">
          <h1>迭代统计</h1>
          <div className="sub">
            <span>
              {iteration.code} · {iteration.name}
            </span>
            <span>·</span>
            <span>
              第 {iteration.day} / {iteration.totalDays} 天
            </span>
            <span>·</span>
            <span>{project.name}</span>
          </div>
        </div>
        <div className="top-sp" />
        <div className="feishu-dot">{data.feishu.groups[0]}</div>
        <button className="btn btn-ghost">导出周报</button>
      </header>
      <main className="st-body">
        <div className="metric-strip">
          <Metric label="已完成 / 计划" value={String(done)} unit={<><span>/ </span><span>{total}</span></>} note={`${pct}% 故事点燃尽`} />
          <Metric label="剩余" value={String(remaining)} unit={`pt · ${remainingIssues} 工单`} note={`${requiredPerDay} pt/天 需达成`} />
          <Metric label="预计完成" value={blocked > 0 ? '有风险' : '准时'} note={`按当前速度 · 第 ${iteration.totalDays} 天`} danger={blocked > 0} success={blocked === 0} />
          <Metric label="未解决缺陷" value={String(unresolvedBugs)} unit="个" note={`${blocked} 阻塞 · ${issues.length} 总工单`} danger={unresolvedBugs > 0} />
        </div>
        <div className="grid2">
          <section className="panel">
            <div className="panel-h">
              <h3>故事点燃尽</h3>
              <div className="legend">
                <span>理想</span>
                <span>实际</span>
                <span>预测</span>
              </div>
            </div>
            <svg viewBox="0 0 640 280" className="burn-svg">
              <path d="M50,30 L610,250" className="ideal" />
              <path d={burnPath(total, remaining, iteration.day, iteration.totalDays)} className="actual" />
              <path d={forecastPath(total, remaining, iteration.day, iteration.totalDays)} className="forecast" />
              <circle cx={xForDay(iteration.day, iteration.totalDays)} cy={yForRemaining(total, remaining)} r="5" />
              <text x={xForDay(iteration.day, iteration.totalDays)} y={yForRemaining(total, remaining) - 10}>
                {remaining}
              </text>
            </svg>
          </section>
          <div className="stats-side">
            <section className="panel">
              <div className="panel-h">
                <h3>近五迭代速度</h3>
                <span className="label">pt / 迭代</span>
              </div>
              <div className="vbar">
                {velocityValues.map((value, index) => (
                  <div className="vbar-col" key={`${index}-${value}`}>
                    <div className={`bar ${index === velocityValues.length - 1 ? 'cur' : ''}`} style={{ height: `${Math.max(12, Math.round((value / Math.max(total, value)) * 100))}%` }}>
                      <span>{value}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p>
                平均速度 {avgVelocity.toFixed(1)} pt · 本迭代计划 {total} pt
              </p>
            </section>
            <section className="panel">
              <div className="panel-h">
                <h3>工作项分布</h3>
              </div>
              {statusRows.map((row) => (
                <div className="dist-row" key={row.status}>
                  <span className={`badge ${statusMeta[row.status].badgeClass}`}>{statusMeta[row.status].label}</span>
                  <div className="dist-bar">
                    <i style={{ width: `${row.width}%`, background: statusMeta[row.status].color }} />
                  </div>
                  <span className="num">{row.count}</span>
                </div>
              ))}
            </section>
          </div>
        </div>
      </main>
    </>
  )
}

function Metric({ label, value, unit, note, success, danger }: { label: string; value: string; unit?: ReactNode; note: string; success?: boolean; danger?: boolean }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div>
        <span className={`stat-num ${success ? 'done' : danger ? 'block' : ''}`}>{value}</span>
        {unit ? <span className="metric-unit">{unit}</span> : null}
      </div>
      <p>{note}</p>
    </div>
  )
}

function burnPath(total: number, remaining: number, day: number, totalDays: number): string {
  const midDay = Math.max(1, day - 1)
  const midRemaining = Math.min(total, Math.round((total + remaining) / 2))
  return `M50,30 L${xForDay(midDay, totalDays)},${yForRemaining(total, midRemaining)} L${xForDay(day, totalDays)},${yForRemaining(total, remaining)}`
}

function forecastPath(total: number, remaining: number, day: number, totalDays: number): string {
  return `M${xForDay(day, totalDays)},${yForRemaining(total, remaining)} L610,250`
}

function xForDay(day: number, totalDays: number): number {
  return Math.round(50 + ((Math.max(1, day) - 1) / Math.max(1, totalDays - 1)) * 560)
}

function yForRemaining(total: number, remaining: number): number {
  if (total === 0) return 250
  return Math.round(30 + (1 - remaining / total) * 220)
}
