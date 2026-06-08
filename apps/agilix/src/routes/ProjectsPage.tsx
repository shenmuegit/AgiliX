import type { SeedData } from '../domain/types'

const projectCards = [
  { glyph: '搜', color: 'var(--accent)', name: '搜索平台', sprint: 'S24 · 搜索体验重构', day: '第 7 / 10 天', pct: 69, bar: 'var(--st-done)', done: 47, total: 68, bugs: 9, team: ['林', '陈', '周', '高'], more: '+4', health: '偏紧', healthClass: 'h-risk', owner: '林夏', spark: [42, 51, 38, 49, 47] },
  { glyph: '数', color: '#3f6f6a', name: '数据看板', sprint: 'S12 · 指标自助配置', day: '第 4 / 10 天', pct: 54, bar: '#3f6f6a', done: 18, total: 33, bugs: 3, team: ['何', '苏', '江'], health: '正常', healthClass: 'h-ok', owner: '何川', spark: [28, 31, 26, 30, 33] },
  { glyph: '开', color: '#7d6a8f', name: '开放平台', sprint: 'S07 · 鉴权重构', day: '第 9 / 10 天', pct: 45, bar: 'var(--st-block)', done: 14, total: 31, bugs: 5, team: ['高', '何', '林'], health: '受阻', healthClass: 'h-block', owner: '高远', spark: [22, 24, 19, 25, 16] },
  { glyph: '移', color: '#9a6a4a', name: '移动端 App', sprint: 'S19 · 离线缓存', day: '第 8 / 10 天', pct: 90, bar: 'var(--st-done)', done: 27, total: 30, bugs: 1, team: ['周', '陈', '韩'], health: '正常', healthClass: 'h-ok', owner: '周屿', spark: [24, 20, 29, 26, 27] },
]

export function ProjectsPage({ data }: { data: SeedData }) {
  return (
    <>
      <header className="top">
        <div className="top-title">
          <h1>项目总览</h1>
          <div className="sub">
            <span>研发组合 · 4 个进行中项目</span>
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
          <SummaryItem label="进行中项目" value="4" note={`共 ${data.members.length} 名成员协作`} />
          <SummaryItem label="活跃迭代" value="4" note="本周 2 个待发布" />
          <SummaryItem label="本周完成点数" value="63" unit="pt" note="▲ 11% 较上周" />
          <SummaryItem label="需关注" value="1" unit="项受阻" note="开放平台 · 鉴权依赖" danger />
        </div>
        <div className="pv-grid">
          {projectCards.map((project) => (
            <article className="pcard" key={project.name}>
              <div className="pc-top">
                <div className="pc-glyph" style={{ background: project.color }}>
                  {project.glyph}
                </div>
                <div className="pc-name">
                  <h3>
                    {project.name}
                    <span className={`health ${project.healthClass}`}>
                      <span className="dot" />
                      {project.health}
                    </span>
                  </h3>
                  <div className="sprint">
                    <span className="wid">{project.sprint}</span>
                    <span>·</span>
                    <span>{project.day}</span>
                  </div>
                </div>
              </div>
              <div className="pc-body">
                <div className="pc-prog-h">
                  <span className="label">迭代进度</span>
                  <span className="pct">
                    {project.pct}
                    <span>%</span>
                  </span>
                </div>
                <div className="pbar">
                  <i style={{ width: `${project.pct}%`, background: project.bar }} />
                </div>
                <div className="pc-stats">
                  <div>
                    <div className="v">
                      {project.done}
                      <span>/{project.total}</span>
                    </div>
                    <div className="l">故事点</div>
                  </div>
                  <div>
                    <div className="v">{project.bugs}</div>
                    <div className="l">未解缺陷</div>
                  </div>
                  <div>
                    <div className="v">{project.team.length + (project.more ? Number(project.more.slice(1)) : 0)}</div>
                    <div className="l">成员</div>
                  </div>
                </div>
                <div className="pc-foot">
                  <div>
                    <div className="label">负责人 · 团队</div>
                    <div className="facepile">
                      {project.team.map((name) => (
                        <div className="av sm" key={`${project.name}-${name}`}>
                          {name}
                        </div>
                      ))}
                      {project.more ? <div className="more">{project.more}</div> : null}
                    </div>
                  </div>
                  <div>
                    <div className="label">近五迭代速度</div>
                    <div className="spark">
                      {project.spark.map((value, index) => (
                        <i key={`${index}-${value}`} className={index === project.spark.length - 1 ? 'cur' : ''} style={{ height: `${Math.round((value / Math.max(...project.spark)) * 26)}px` }} />
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
