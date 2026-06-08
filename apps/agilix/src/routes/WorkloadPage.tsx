import type { SeedData } from '../domain/types'

const workloadRows = [
  ['高远', '后端 · 检索召回', 116, 3, 4, 21, '46/40', '超载', 'ls-over'],
  ['苏晴', '后端 · 语义服务', 104, 2, 2, 18, '42/40', '超载', 'ls-over'],
  ['陈牧', '前端 · 结果页', 95, 2, 5, 19, '38/40', '偏紧', 'ls-tight'],
  ['韩雪', '测试 · QA', 78, 2, 6, 13, '31/40', '偏紧', 'ls-tight'],
  ['林夏', '负责人 · PM', 75, 1, 3, 7, '18/24', '均衡', 'ls-ok'],
  ['何川', '架构 · 网关', 70, 1, 2, 13, '28/40', '均衡', 'ls-ok'],
  ['周屿', '前端 · 移动端', 63, 1, 3, 11, '25/40', '均衡', 'ls-ok'],
  ['江月', '设计 · 体验', 44, 0, 2, 4, '14/32', '有余量', 'ls-light'],
] as const

export function WorkloadPage(_props: { data: SeedData }) {
  return (
    <>
      <header className="top">
        <div className="top-title">
          <h1>成员负载</h1>
          <div className="sub">
            <span>Sprint 24 · 搜索体验重构</span>
            <span>·</span>
            <span>第 7 / 10 天</span>
          </div>
        </div>
        <div className="top-sp" />
        <div className="feishu-dot">成员同步自飞书通讯录</div>
        <button className="btn btn-ghost">分配工单</button>
      </header>
      <main className="wl-body">
        <div className="summary">
          <Summary label="团队总容量" value="320" unit="人时" note="8 人 · 本迭代两周" />
          <Summary label="已分配" value="291" unit="人时" note="91% 整体负载" />
          <Summary label="需关注" value="2" unit="人超载" note="高远 116% · 苏晴 104%" danger />
          <Summary label="可承接" value="3" unit="人有余量" note="江月 · 周屿 · 何川" success />
        </div>
        <table className="wl-table">
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
            {workloadRows.map(([name, role, pct, doing, done, points, capacity, status, statusClass]) => (
              <tr key={name}>
                <td>
                  <div className="who-cell">
                    <div className="av lg">{name[0]}</div>
                    <div>
                      <div className="nm">{name}</div>
                      <div className="rl">{role}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="loadbar-wrap">
                    <div className="loadbar">
                      <i style={{ width: `${Math.min(pct, 100)}%` }} />
                      <span className="cap" />
                    </div>
                    <span className="num">{pct}%</span>
                  </div>
                </td>
                <td>
                  <div className="mini-tasks">
                    {Array.from({ length: doing }).map((_, index) => (
                      <i key={`doing-${index}`} />
                    ))}
                    {Array.from({ length: done }).map((_, index) => (
                      <i className="done-i" key={`done-${index}`} />
                    ))}
                  </div>
                  <div className="muted">{doing} 在办 · {done} 完成</div>
                </td>
                <td className="r">
                  <span className="num">{points}</span> pt
                </td>
                <td className="r">{capacity}</td>
                <td className="r">
                  <span className={`lstat ${statusClass}`}>{status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </>
  )
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
