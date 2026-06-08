import type { ProjectId, SeedData } from '../domain/types'

export function StatsPage(_props: { data: SeedData; projectId: ProjectId; iterationCode: string }) {
  return (
    <>
      <header className="top">
        <div className="top-title">
          <h1>迭代统计</h1>
          <div className="sub">
            <span>Sprint 24 · 搜索体验重构</span>
            <span>·</span>
            <span>第 7 / 10 天</span>
          </div>
        </div>
        <div className="top-sp" />
        <div className="feishu-dot">每日 18:00 推送至群</div>
        <button className="btn btn-ghost">导出周报</button>
      </header>
      <main className="st-body">
        <div className="metric-strip">
          <Metric label="已完成 / 计划" value="47" unit="/ 68" note="69% 故事点燃尽" />
          <Metric label="剩余" value="21" unit="pt · 6 工单" note="3.5 pt/天 需达成" />
          <Metric label="预计完成" value="准时" note="按当前速度 · 第 10 天" success />
          <Metric label="未解决缺陷" value="9" unit="个" note="▲ 2 较昨日 · 1 阻塞" danger />
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
              <path d="M50,30 L106,43 L162,56 L218,75 L274,95 L330,121 L386,150 L442,182" className="actual" />
              <path d="M442,182 L610,250" className="forecast" />
              <circle cx="442" cy="182" r="5" />
              <text x="442" y="172">
                21
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
                {[42, 51, 38, 49, 47].map((value, index) => (
                  <div className="vbar-col" key={`${index}-${value}`}>
                    <div className={`bar ${index === 4 ? 'cur' : ''}`} style={{ height: `${Math.round((value / 68) * 100)}%` }}>
                      <span>{value}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p>平均速度 45.4 pt · 本迭代预估 68 pt</p>
            </section>
            <section className="panel">
              <div className="panel-h">
                <h3>工作项分布</h3>
              </div>
              {[
                ['已完成', '42%', '14', 'var(--st-done)'],
                ['进行中', '24%', '8', 'var(--st-doing)'],
                ['评审/测试', '18%', '6', 'var(--st-review)'],
                ['待办', '12%', '4', 'var(--st-todo)'],
              ].map(([label, width, value, color]) => (
                <div className="dist-row" key={label}>
                  <span className="badge b-done">{label}</span>
                  <div className="dist-bar">
                    <i style={{ width, background: color }} />
                  </div>
                  <span className="num">{value}</span>
                </div>
              ))}
            </section>
          </div>
        </div>
      </main>
    </>
  )
}

function Metric({ label, value, unit, note, success, danger }: { label: string; value: string; unit?: string; note: string; success?: boolean; danger?: boolean }) {
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
