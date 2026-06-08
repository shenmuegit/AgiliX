import type { Milestone, ProjectId, SeedData } from '../domain/types'

interface GanttRow {
  wid: string
  name: string
  start: number
  end: number
  status: 'todo' | 'doing' | 'review' | 'test' | 'done'
  owner: string
  ghost?: boolean
}

interface GanttGroup {
  epic: string
  color: string
  rows: GanttRow[]
}

const weeks = ['W1', 'W2', 'W3', 'W4', 'W5']
const days = ['03', '05', '07', '10', '12', '14', '17', '19', '21', '24']

const cellWidth = 100 / 15

const ganttGroups: GanttGroup[] = [
  {
    epic: '召回与语义',
    color: '#7d6a8f',
    rows: [
      { wid: 'SRCH-177', name: '联想词接口缓存与防抖', start: 1, end: 4, status: 'test', owner: '高' },
      { wid: 'SRCH-198', name: '语义向量检索召回', start: 2, end: 9, status: 'doing', owner: '高' },
      { wid: 'SRCH-209', name: '空格 query 命中率修复', start: 4, end: 6, status: 'doing', owner: '苏' },
      { wid: 'SRCH-224', name: '网关超时与降级策略', start: 8, end: 13, status: 'todo', owner: '何', ghost: true },
    ],
  },
  {
    epic: '结果页体验',
    color: '#3f6f6a',
    rows: [
      { wid: 'SRCH-164', name: '搜索入口信息架构', start: 0, end: 2, status: 'done', owner: '陈' },
      { wid: 'SRCH-186', name: '历史与收藏打通', start: 3, end: 6, status: 'review', owner: '周' },
      { wid: 'SRCH-212', name: '结果卡片重设计', start: 4, end: 8, status: 'doing', owner: '陈' },
      { wid: 'SRCH-218', name: '二级聚合(团队/项目)', start: 9, end: 13, status: 'todo', owner: '陈', ghost: true },
    ],
  },
  {
    epic: '检索基建',
    color: '#9a6a4a',
    rows: [
      { wid: 'SRCH-170', name: '检索指标看板', start: 0, end: 3, status: 'done', owner: '何' },
      { wid: 'SRCH-201', name: '日志接入多维表格', start: 5, end: 8, status: 'review', owner: '林' },
    ],
  },
]

const statusTone = {
  todo: 'todo',
  doing: 'amber',
  review: 'blue',
  test: 'amber',
  done: 'green',
} as const

function findMilestone(data: SeedData): Milestone {
  const milestone = data.milestones.find((item) => item.title === 'Beta 开关接入')
  if (!milestone) throw new Error('Milestone not found: Beta 开关接入')
  return milestone
}

export function GanttPage({
  data,
  projectId: _projectId,
  onSaveMilestone,
}: {
  data: SeedData
  projectId: ProjectId
  onSaveMilestone: (milestone: Milestone) => void
}) {
  const betaMilestone = findMilestone(data)

  return (
    <main className="gt-body">
      <header className="top">
        <div>
          <p className="kicker">搜索平台</p>
          <h1>排期甘特</h1>
          <p>6 月 · Sprint 24 → 25</p>
        </div>
        <div className="actions">
          <button className="ghost">同步飞书日历</button>
          <button className="primary" onClick={() => onSaveMilestone(betaMilestone)}>
            保存 Beta 开关接入
          </button>
        </div>
      </header>

      <section className="gt" aria-label="项目甘特图">
        <div className="gt-head">
          <div className="corner">工作项 / 里程碑</div>
          <div className="gt-weeks">
            <div className="wk-row">
              {weeks.map((week) => (
                <span key={week} className="wk">
                  {week}
                </span>
              ))}
            </div>
            <div className="day-row">
              {days.map((day) => (
                <span key={day} className="day">
                  {day}
                </span>
              ))}
            </div>
          </div>
        </div>

        {ganttGroups.map((group) => (
          <div key={group.epic} className="gt-group">
            <article className="gt-row gt-grp">
              <div className="gt-name">
                <span className="grp-dot" style={{ background: group.color }} />
                <strong>史诗 · {group.epic}</strong>
              </div>
              <div className="lane">
                <div className="lane-grid" />
              </div>
            </article>
            {group.rows.map((row) => (
              <article key={row.wid} className="gt-row">
                <div className="gt-name">
                  <span className="wid">{row.wid}</span>
                  <strong>{row.name}</strong>
                </div>
                <div className="lane">
                  <div className="lane-grid" />
                  <div className="today-line" />
                  <span
                    className={`bar ${row.ghost ? 'ghost' : statusTone[row.status]}`}
                    style={{
                      left: `${row.start * cellWidth}%`,
                      width: `calc(${(row.end - row.start + 1) * cellWidth}% - 6px)`,
                      marginLeft: 3,
                    }}
                  >
                    <span>{row.name}</span>
                    <span className="av sm">{row.owner}</span>
                  </span>
                </div>
              </article>
            ))}
          </div>
        ))}

        <article className="gt-row">
          <div className="gt-name">
            <strong className="milestone-name">里程碑</strong>
          </div>
          <div className="lane ms-row">
            <div className="lane-grid" />
            <div className="today-line" />
            <div className="ms" style={{ left: `${9.5 * cellWidth}%` }}>
              <span className="pin" />
              <span className="ms-lbl">灰度上线</span>
            </div>
            <div className="ms" style={{ left: `${14.5 * cellWidth}%` }}>
              <span className="pin" />
              <span className="ms-lbl">全量发布</span>
            </div>
          </div>
        </article>
      </section>
    </main>
  )
}
