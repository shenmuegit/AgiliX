import type { Issue, Member, SeedData } from '../domain/types'
import { memberInitial, sumPoints } from '../domain/view-models'

export function WorkloadPage({ data, onOpenIssues }: { data: SeedData; onOpenIssues?: () => void }) {
  const rows = data.members.map((member) => buildRow(data, member)).sort((left, right) => right.pct - left.pct)
  const totalCapacity = data.members.reduce((sum, member) => sum + member.capacity, 0)
  const allocated = rows.reduce((sum, row) => sum + row.points, 0)
  const overloaded = rows.filter((row) => row.pct > 100)
  const available = rows.filter((row) => row.pct < 70)
  const overall = totalCapacity === 0 ? 0 : Math.round((allocated / totalCapacity) * 100)

  return (
    <>
      <header className="top">
        <div className="top-title">
          <h1>成员负载</h1>
          <div className="sub">
            <span>全部项目 · 当前迭代</span>
            <span>·</span>
            <span>{data.members.length} 人</span>
          </div>
        </div>
        <div className="top-sp" />
        <div className="feishu-dot">{data.feishu.groups[0]}</div>
        <button className="btn btn-ghost" onClick={onOpenIssues}>
          分配工单
        </button>
      </header>
      <main className="wl-body">
        <div className="summary">
          <Summary label="团队总容量" value={String(totalCapacity)} unit="pt" note={`${data.members.length} 人 · 当前数据`} />
          <Summary label="已分配" value={String(allocated)} unit="pt" note={`${overall}% 整体负载`} />
          <Summary label="需关注" value={String(overloaded.length)} unit="人超载" note={overloaded.map((row) => `${row.member.name} ${row.pct}%`).join(' · ')} danger />
          <Summary label="可承接" value={String(available.length)} unit="人有余量" note={available.map((row) => row.member.name).join(' · ')} success />
        </div>
        <table className="wl-table">
          <thead>
            <tr>
              <th>成员</th>
              <th>本迭代负载</th>
              <th>在办</th>
              <th className="r">分配点数</th>
              <th className="r">容量</th>
              <th className="r">状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.member.id}>
                <td>
                  <div className="who-cell">
                    <div className="av lg">{memberInitial(row.member)}</div>
                    <div>
                      <div className="nm">{row.member.name}</div>
                      <div className="rl">{row.member.role}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="loadbar-wrap">
                    <div className="loadbar">
                      <i style={{ width: `${Math.min(row.pct, 100)}%` }} />
                      <span className="cap" />
                    </div>
                    <span className="num">{row.pct}%</span>
                  </div>
                </td>
                <td>
                  <div className="mini-tasks">
                    {row.activeIssues.map((issue) => (
                      <i key={issue.key} title={issue.title} />
                    ))}
                    {row.doneIssues.map((issue) => (
                      <i className="done-i" key={issue.key} title={issue.title} />
                    ))}
                  </div>
                  <div className="muted">
                    {row.activeIssues.length} 在办 · {row.doneIssues.length} 完成
                  </div>
                  <div className="muted">{row.issueTitles}</div>
                </td>
                <td className="r">
                  <span className="num">{row.points}</span> pt
                </td>
                <td className="r">{row.points}/{row.member.capacity}</td>
                <td className="r">
                  <span className={`lstat ${row.statusClass}`}>{row.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </>
  )
}

function buildRow(data: SeedData, member: Member) {
  const issues = data.issues.filter((issue) => issue.assigneeId === member.id)
  const activeIssues = issues.filter((issue) => issue.status !== 'done')
  const doneIssues = issues.filter((issue) => issue.status === 'done')
  const points = sumPoints(issues)
  const pct = member.capacity === 0 ? 0 : Math.round((points / member.capacity) * 100)
  const status = pct > 100 ? '超载' : pct >= 80 ? '偏紧' : pct >= 50 ? '均衡' : '有余量'
  const statusClass = pct > 100 ? 'ls-over' : pct >= 80 ? 'ls-tight' : pct >= 50 ? 'ls-ok' : 'ls-light'
  return {
    member,
    activeIssues,
    doneIssues,
    points,
    pct,
    status,
    statusClass,
    issueTitles: issueTitles(activeIssues),
  }
}

function issueTitles(issues: Issue[]): string {
  return issues.map((issue) => issue.title).join(' · ')
}

function Summary({ label, value, unit, note, danger, success }: { label: string; value: string; unit: string; note: string; danger?: boolean; success?: boolean }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`stat-num ${danger ? 'block' : success ? 'done' : ''}`}>
        {value}
        <span>{unit}</span>
      </div>
      <div className="muted">{note}</div>
    </div>
  )
}
