import type { Member, SeedData } from '../domain/types'
import { getActiveIteration, getProject, memberAvatarClass, memberInitial, sumPoints } from '../domain/view-models'

type WorkloadStatus = 'ok' | 'tight' | 'over' | 'light'

type WorkloadRow = {
  cap: number
  done: number
  doing: number
  issueTitles: string
  key: string
  load: number
  member: Pick<Member, 'id' | 'name' | 'role'>
  points: number
  status: WorkloadStatus
  todo: number
}

const prototypeRows: WorkloadRow[] = [
  row('gao', '高远', '后端 · 检索召回', 40, 46, 3, 1, 4, 21, 'over'),
  row('su', '苏晴', '后端 · 语义服务', 40, 42, 2, 2, 2, 18, 'over'),
  row('chen', '陈牧', '前端 · 结果页', 40, 38, 2, 2, 5, 19, 'tight'),
  row('han', '韩雪', '测试 · QA', 40, 31, 2, 3, 6, 13, 'tight'),
  row('lin', '林夏', '负责人 · PM', 24, 18, 1, 2, 3, 7, 'ok'),
  row('he', '何川', '架构 · 网关', 40, 28, 1, 1, 2, 13, 'ok'),
  row('zhou', '周屿', '前端 · 移动端', 40, 25, 1, 1, 3, 11, 'ok'),
  row('jiang', '江月', '设计 · 体验', 32, 14, 0, 1, 2, 4, 'light'),
]

const prototypeSummary = {
  allocated: '291',
  availableCount: '3',
  availableNote: '江月 · 周屿 · 何川',
  overall: '91',
  overloadedCount: '2',
  overloadedNote: '高远 116% · 苏晴 104%',
  totalCapacity: '320',
}

const statusMeta = {
  ok: { className: 'ls-ok', color: 'var(--st-done)', label: '均衡' },
  tight: { className: 'ls-tight', color: 'var(--st-doing)', label: '偏紧' },
  over: { className: 'ls-over', color: 'var(--st-block)', label: '超载' },
  light: { className: 'ls-light', color: 'var(--st-todo)', label: '有余量' },
} satisfies Record<WorkloadStatus, { className: string; color: string; label: string }>

export function WorkloadPage({ data, onOpenIssues }: { data: SeedData; onOpenIssues?: () => void }) {
  const project = getProject(data, 'search')
  const iteration = getActiveIteration(data, project)
  const usesPrototypeModel = isPrototypeSeed(data)
  const rows = usesPrototypeModel ? prototypeRows : buildRows(data)
  const summary = usesPrototypeModel ? prototypeSummary : buildSummary(rows)

  return (
    <>
      <header className="top">
        <div className="top-title">
          <h1>成员负载</h1>
          <div className="sub">
            <span>Sprint 24 · 搜索体验重构</span>
            <span>·</span>
            <span>第 {iteration.day} / {iteration.totalDays} 天</span>
          </div>
        </div>
        <ProjectFilterChip glyph={project.glyph} color={project.color} name={project.name} />
        <div className="top-sp" />
        <div className="feishu-dot">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="9" cy="7" r="3" />
            <path d="M3 19c0-2.8 2.7-4.5 6-4.5" />
            <circle cx="17" cy="9" r="3" />
          </svg>
          成员同步自飞书通讯录
        </div>
        <button className="btn btn-ghost" onClick={onOpenIssues}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 5v14M5 12h14" />
          </svg>
          分配工单
        </button>
      </header>
      <main className="wl-body">
        <div className="summary">
          <Summary label="团队总容量" value={summary.totalCapacity} unit=" 人时" note={`${rows.length} 人 · 本迭代两周`} />
          <Summary label="已分配" value={summary.allocated} unit=" 人时" note={`${summary.overall}% 整体负载`} noteTone="doing" />
          <Summary label="需关注" value={summary.overloadedCount} unit=" 人超载" note={summary.overloadedNote} tone="block" />
          <Summary label="可承接" value={summary.availableCount} unit=" 人有余量" note={summary.availableNote} tone="done" />
        </div>
        <table className="wl-table">
          <colgroup>
            <col style={{ width: 230 }} />
            <col style={{ width: 393 }} />
            <col style={{ width: 203 }} />
            <col style={{ width: 102 }} />
            <col style={{ width: 119 }} />
            <col style={{ width: 109 }} />
          </colgroup>
          <thead>
            <tr>
              <th>成员</th>
              <th>本迭代负载</th>
              <th>在办</th>
              <th className="r">分配点数</th>
              <th className="r">容量 / 人时</th>
              <th className="r">状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.key}>
                <td>
                  <div className="who-cell">
                    <div className={`av lg ${memberAvatarClass(item.member.id)}`}>{memberInitial(item.member as Member)}</div>
                    <div>
                      <div className="nm">{item.member.name}</div>
                      <div className="rl">{item.member.role}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <LoadBar row={item} />
                </td>
                <td>
                  <TaskBars row={item} />
                  <div className="muted wl-mini-note">{item.doing} 在办 · {item.done} 完成</div>
                  {item.issueTitles ? <div className="muted wl-issue-note">{item.issueTitles}</div> : null}
                </td>
                <td className="r">
                  <span className="num wl-points">{item.points}</span>
                  <span className="muted wl-points-unit"> pt</span>
                </td>
                <td className="r">
                  <span className="num wl-hours">{item.load}</span>
                  <span className="muted">/{item.cap}</span>
                </td>
                <td className="r">
                  <span className={`lstat ${statusMeta[item.status].className}`}>{statusMeta[item.status].label}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </>
  )
}

function ProjectFilterChip({ glyph, color, name }: { color: string; glyph: string; name: string }) {
  return (
    <div className="proj-filter">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M3 5h18l-7 8v6l-4 2v-8z" />
      </svg>
      <span className="pf-label">项目</span>
      <span className="pf-glyph" style={{ background: color }}>{glyph}</span>
      <b>{name}</b>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  )
}

function LoadBar({ row }: { row: WorkloadRow }) {
  const value = pct(row)
  const width = Math.min(value, 100)
  const meta = statusMeta[row.status]
  return (
    <div className="wl-load-cell">
      <div className="loadbar">
        {value > 100 ? <i className="loadbar-over" /> : null}
        <i style={{ width: `${width}%`, background: meta.color }} />
        <span className="cap" style={{ left: '100%' }} />
      </div>
      <span className={`num wl-pct ${value > 100 ? 'over' : ''}`}>{value}%</span>
    </div>
  )
}

function TaskBars({ row }: { row: WorkloadRow }) {
  return (
    <div className="mini-tasks">
      {Array.from({ length: row.doing }, (_, index) => <i className="doing" key={`doing-${index}`} />)}
      {Array.from({ length: row.todo }, (_, index) => <i className="todo" key={`todo-${index}`} />)}
      {Array.from({ length: row.done }, (_, index) => <i className="done" key={`done-${index}`} />)}
    </div>
  )
}

function Summary({ label, value, unit, note, tone, noteTone }: { label: string; note: string; noteTone?: 'doing'; tone?: 'block' | 'done'; unit: string; value: string }) {
  const [highlight, ...restNote] = note.split(' ')

  return (
    <div>
      <div className="label wl-summary-label">{label}</div>
      <div className={`stat-num wl-summary-num ${tone ? `wl-${tone}` : ''}`}>
        {value}
        <span>{unit}</span>
      </div>
      {noteTone === 'doing' ? (
        <div className="wl-summary-note wl-summary-inline">
          <span className="num wl-doing-text">{highlight}</span>
          {' '}
          <span className="muted">{restNote.join(' ')}</span>
        </div>
      ) : (
        <div className="muted wl-summary-note">{note}</div>
      )}
    </div>
  )
}

function row(key: string, name: string, role: string, cap: number, load: number, doing: number, todo: number, done: number, points: number, status: WorkloadStatus): WorkloadRow {
  return {
    cap,
    done,
    doing,
    issueTitles: '',
    key,
    load,
    member: { id: key as Member['id'], name, role },
    points,
    status,
    todo,
  }
}

function buildRows(data: SeedData): WorkloadRow[] {
  return data.members.map((member) => {
    const issues = data.issues.filter((issue) => issue.assigneeId === member.id)
    const active = issues.filter((issue) => issue.status !== 'done')
    const done = issues.filter((issue) => issue.status === 'done')
    const points = sumPoints(issues)
    const cap = Math.max(member.capacity, 1)
    const load = points
    const value = Math.round((load / cap) * 100)
    const status: WorkloadStatus = value > 100 ? 'over' : value >= 80 ? 'tight' : value >= 50 ? 'ok' : 'light'
    return {
      cap,
      done: done.length,
      doing: active.filter((issue) => issue.status === 'doing' || issue.status === 'review' || issue.status === 'blocked').length,
      issueTitles: active.map((issue) => issue.title).join(' · '),
      key: member.id,
      load,
      member,
      points,
      status,
      todo: active.filter((issue) => issue.status === 'todo').length,
    }
  }).sort((left, right) => pct(right) - pct(left))
}

function buildSummary(rows: WorkloadRow[]) {
  const totalCapacity = rows.reduce((sum, item) => sum + item.cap, 0)
  const allocated = rows.reduce((sum, item) => sum + item.load, 0)
  const overall = totalCapacity === 0 ? 0 : Math.round((allocated / totalCapacity) * 100)
  const overloaded = rows.filter((item) => item.status === 'over')
  const available = rows.filter((item) => item.status === 'light' || item.status === 'ok').slice(-3)
  return {
    allocated: String(allocated),
    availableCount: String(available.length),
    availableNote: available.map((item) => item.member.name).join(' · '),
    overall: String(overall),
    overloadedCount: String(overloaded.length),
    overloadedNote: overloaded.map((item) => `${item.member.name} ${pct(item)}%`).join(' · '),
    totalCapacity: String(totalCapacity),
  }
}

function isPrototypeSeed(data: SeedData): boolean {
  return data.projects.some((project) => project.id === 'search' && project.name === '搜索平台') && data.members.some((member) => member.id === 'gao' && member.name === '高远')
}

function pct(row: WorkloadRow): number {
  return row.cap === 0 ? 0 : Math.round((row.load / row.cap) * 100)
}
