import { useState, type ReactNode } from 'react'
import type { ProjectId, SeedData } from '../domain/types'
import { blockedIssues, donePoints, getProject, issuesForIteration, sumPoints } from '../domain/view-models'

const burnActualPoints = [
  [50, 30],
  [106, 43],
  [162, 56],
  [218, 75],
  [274, 95],
  [330, 121],
  [386, 150],
  [442, 182],
] as const

const velocityRows = [
  { code: 'S20', value: 42, height: 62, current: false },
  { code: 'S21', value: 51, height: 75, current: false },
  { code: 'S22', value: 38, height: 56, current: false },
  { code: 'S23', value: 49, height: 72, current: false },
  { code: 'S24', value: 47, height: 69, current: true },
] as const

const distributionRows = [
  { label: '已完成', count: 14, width: 42, badgeClass: 'b-done', color: 'var(--st-done)' },
  { label: '进行中', count: 8, width: 24, badgeClass: 'b-doing', color: 'var(--st-doing)' },
  { label: '评审/测试', count: 6, width: 18, badgeClass: 'b-review', color: 'var(--st-review)' },
  { label: '待办', count: 4, width: 12, badgeClass: 'b-todo', color: 'var(--st-todo)' },
] as const

export function StatsPage({ data, projectId, iterationCode }: { data: SeedData; projectId: ProjectId; iterationCode: string }) {
  const [exportNotice, setExportNotice] = useState('')
  const project = getProject(data, projectId)
  const iteration = data.iterations.find((item) => item.projectId === projectId && item.code === iterationCode)
  if (!iteration) throw new Error(`Iteration not found: ${projectId}/${iterationCode}`)

  const issues = issuesForIteration(data, projectId, iterationCode)
  const total = sumPoints(issues)
  const done = donePoints(issues)
  const remaining = total - done
  const unresolvedBugs = issues.filter((issue) => issue.type === 'bug' && issue.status !== 'done').length
  const blocked = blockedIssues(issues).length

  return (
    <>
      <header className="top">
        <div className="top-title">
          <h1>迭代统计</h1>
          <div className="sub">
            <span>
              Sprint {iteration.code.replace(/^S/, '')} · {iteration.name}
            </span>
            <span>·</span>
            <span>
              第 {iteration.day} / {iteration.totalDays} 天
            </span>
          </div>
        </div>
        <button className="proj-filter" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" style={{ width: 13, height: 13, opacity: 0.7 }}>
            <path d="M3 5h18l-7 8v6l-4 2v-8z" />
          </svg>
          <span className="pf-label">项目</span>
          <span className="pf-glyph" style={{ background: project.color }}>
            {project.glyph}
          </span>
          <b>{project.name}</b>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 14, height: 14, opacity: 0.55 }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <div className="top-sp" />
        <div className="feishu-dot">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          每日 18:00 推送至群
        </div>
        <button className="btn btn-ghost" onClick={() => setExportNotice(`${project.name} ${iteration.code} 周报已准备导出`)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
          </svg>
          导出周报
        </button>
      </header>
      {exportNotice ? <section className="fs-reply" role="status">{exportNotice}</section> : null}
      <main className="st-body">
        <div className="metric-strip">
          <Metric label="已完成 / 计划" value={String(done)} unit={<span className="stat-num metric-plan-unit"> / {total}</span>} note={<><span className="num done">69%</span> <span className="muted">故事点燃尽</span></>} />
          <Metric label="剩余" value={String(remaining)} unit={<span className="metric-text-unit"> pt · 6 工单</span>} note={<><span className="num doing">3.5</span> <span className="muted">pt/天 需达成</span></>} />
          <Metric label="预计完成" value={blocked > 0 ? '有风险' : '准时'} note={<><span className="muted">按当前速度 · 第</span> <span className="num">{iteration.totalDays}</span> <span className="muted">天</span></>} danger={blocked > 0} success={blocked === 0} />
          <Metric label="未解决缺陷" value={String(unresolvedBugs)} unit={<span className="metric-text-unit"> 个</span>} note={<><span className="delta down">▲ 2</span> <span className="muted">较昨日 · 1 阻塞</span></>} danger={unresolvedBugs > 0} />
        </div>
        <div className="grid2">
          <section className="panel">
            <div className="panel-h">
              <h3>故事点燃尽</h3>
              <div className="legend">
                <span><i className="legend-ideal" />理想</span>
                <span><i className="legend-actual" />实际</span>
                <span><i className="legend-forecast" />预测</span>
              </div>
            </div>
            <svg viewBox="0 0 640 280" className="burn-svg">
              <g className="burn-grid">
                <line x1="50" y1="30" x2="50" y2="250" />
                <line x1="50" y1="250" x2="610" y2="250" />
                <line x1="50" y1="195" x2="610" y2="195" />
                <line x1="50" y1="140" x2="610" y2="140" />
                <line x1="50" y1="85" x2="610" y2="85" />
              </g>
              <g className="axis-labels y-axis">
                <text x="42" y="34">68</text>
                <text x="42" y="89">51</text>
                <text x="42" y="144">34</text>
                <text x="42" y="199">17</text>
                <text x="42" y="254">0</text>
              </g>
              <g className="axis-labels x-axis">
                <text x="50" y="266">D0</text>
                <text x="218" y="266">D3</text>
                <text x="386" y="266">D6</text>
                <text x="442" y="266" className="today">今天</text>
                <text x="610" y="266">D10</text>
              </g>
              <path d="M50,30 L610,250" className="ideal" fill="none" />
              <path d={`${burnActualPoints.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x},${y}`).join(' ')} L442,250 L50,250 Z`} className="actual-fill" fill="var(--accent)" />
              <polyline points={burnActualPoints.map(([x, y]) => `${x},${y}`).join(' ')} className="actual" fill="none" />
              <polyline points="442,182 610,250" className="forecast" fill="none" />
              <g className="burn-points">
                <circle cx="50" cy="30" r="3" />
                <circle cx="162" cy="56" r="3" />
                <circle cx="274" cy="95" r="3" />
                <circle cx="330" cy="121" r="3" />
                <circle cx="386" cy="150" r="3" />
              </g>
              <circle cx="442" cy="182" r="5" className="today-point" />
              <text x="442" y="172" className="today-value">
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
                {velocityRows.map((row) => (
                  <div className="vbar-col" key={row.code}>
                    <div className="bar" style={{ height: `${row.height}%`, background: row.current ? 'var(--accent)' : 'var(--rule-2)' }}>
                      <span className="v" style={{ color: row.current ? 'var(--accent)' : 'var(--ink-3)' }}>
                        {row.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="velocity-labels">
                {velocityRows.map((row) => (
                  <span className="vlbl" key={row.code}>
                    {row.code}
                  </span>
                ))}
              </div>
              <div className="hairline" />
              <p>
                平均速度 <span className="num">45.4</span> pt · 本迭代预估 <span className="num">{total}</span> pt
              </p>
            </section>
            <section className="panel">
              <div className="panel-h">
                <h3>工作项分布</h3>
              </div>
              {distributionRows.map((row) => (
                <div className="dist-row" key={row.label}>
                  <span className={`badge ${row.badgeClass}`}>
                    <span className="dot" />
                    {row.label}
                  </span>
                  <div className="dist-bar">
                    <i style={{ width: `${row.width}%`, background: row.color }} />
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

function Metric({ label, value, unit, note, success, danger }: { label: string; value: string; unit?: ReactNode; note: ReactNode; success?: boolean; danger?: boolean }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div>
        <span className={`stat-num ${success ? 'done' : danger ? 'block' : ''}`}>{value}</span>
        {unit}
      </div>
      <div className="metric-note">{note}</div>
    </div>
  )
}
