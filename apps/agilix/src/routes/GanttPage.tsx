import type { Issue, Milestone, MilestoneStatus, ProjectId, SeedData } from '../domain/types'
import {
  getActiveIteration,
  getMember,
  getProject,
  issuesForIteration,
  memberInitial,
} from '../domain/view-models'

const statusTone = {
  todo: 'ghost',
  doing: 'amber',
  review: 'blue',
  blocked: 'amber',
  done: 'green',
} as const

const milestoneTone: Record<MilestoneStatus, string> = {
  done: 'green',
  doing: 'amber',
  risk: 'amber',
  planned: 'ghost',
}

export function GanttPage({
  data,
  projectId,
  onSaveMilestone,
  onOpenFeishu,
}: {
  data: SeedData
  projectId: ProjectId
  onSaveMilestone: (milestone: Milestone) => void
  onOpenFeishu?: () => void
}) {
  const project = getProject(data, projectId)
  const iteration = getActiveIteration(data, project)
  const issues = issuesForIteration(data, projectId, iteration.code)
  const milestones = data.milestones
    .filter((item) => item.projectId === projectId && item.iterationId === iteration.id)
    .sort((left, right) => left.startDay - right.startDay)
  const focusMilestone =
    milestones.find((milestone) => milestone.status === 'risk') ?? milestones[0]
  if (!focusMilestone) throw new Error(`Milestone not found: ${projectId}/${iteration.id}`)
  const weeks = iteration.calendarWeeks
  const totalSlots = weeks.reduce((sum, week) => sum + week.days.length, 0)
  const cellWidth = 100 / totalSlots

  return (
    <main className="gt-body">
      <header className="top">
        <div className="top-title">
          <p className="kicker">{project.name}</p>
          <h1>排期甘特</h1>
          <p>{iteration.calendarTitle}</p>
        </div>
        <div className="top-sp" />
        <div className="seg">
          <button>周</button>
          <button className="on">双周</button>
          <button>月</button>
        </div>
        <div className="feishu-dot">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="4" width="18" height="17" rx="2" />
            <path d="M8 2v4M16 2v4M3 10h18" />
          </svg>
          <button className="feishu-action" onClick={onOpenFeishu}>
            同步飞书日历
          </button>
        </div>
        <button className="btn btn-primary" onClick={() => onSaveMilestone(focusMilestone)}>
          保存 {focusMilestone.title}
        </button>
      </header>

      <section className="gt" aria-label="项目甘特图">
        <div className="gt-head">
          <div className="corner">工作项 / 里程碑</div>
          <div className="gt-weeks">
            <div className="wk-row" style={{ gridTemplateColumns: `repeat(${totalSlots}, 1fr)` }}>
              {weeks.map((week) => (
                <span
                  key={week.label}
                  className="wk"
                  style={{ gridColumn: `span ${week.days.length}` }}
                >
                  <b>{week.label}</b>
                  <small>{week.rangeLabel}</small>
                </span>
              ))}
            </div>
            <div className="day-row" style={{ gridTemplateColumns: `repeat(${totalSlots}, 1fr)` }}>
              {weeks
                .flatMap((week) => week.days)
                .map((day) => (
                  <span key={day} className="day">
                    {day}
                  </span>
                ))}
            </div>
          </div>
        </div>

        <div className="gt-group">
          <article className="gt-row gt-grp">
            <div className="gt-name">
              <span className="grp-dot" style={{ background: project.color }} />
              <strong>迭代 · {iteration.name}</strong>
            </div>
            <div className="lane">
              <LaneGrid totalSlots={totalSlots} />
            </div>
          </article>
          {issues.map((issue, index) => (
            <IssueRow
              key={issue.key}
              data={data}
              issue={issue}
              index={index}
              totalSlots={totalSlots}
              cellWidth={cellWidth}
            />
          ))}
        </div>

        <article className="gt-row">
          <div className="gt-name">
            <strong className="milestone-name">里程碑</strong>
          </div>
          <div className="lane ms-row">
            <LaneGrid totalSlots={totalSlots} />
            <div className="today-line" style={{ left: `${(iteration.day - 1) * cellWidth}%` }} />
            {milestones.map((milestone) => (
              <div
                className="ms"
                key={milestone.id}
                style={{ left: `${(milestone.startDay - 0.5) * cellWidth}%` }}
              >
                <span className={`pin ${milestoneTone[milestone.status]}`} />
                <span className="ms-lbl">{milestone.title}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  )
}

function IssueRow({
  data,
  issue,
  index,
  totalSlots,
  cellWidth,
}: {
  data: SeedData
  issue: Issue
  index: number
  totalSlots: number
  cellWidth: number
}) {
  const owner = getMember(data, issue.assigneeId)
  const start = (index % totalSlots) + 1
  const width = Math.min(totalSlots - start + 1, Math.max(1, issue.storyPoints))

  return (
    <article className="gt-row">
      <div className="gt-name">
        <span className="wid">{issue.key}</span>
        <strong>{issue.title}</strong>
      </div>
      <div className="lane">
        <LaneGrid totalSlots={totalSlots} />
        <span
          className={`bar ${statusTone[issue.status]}`}
          style={{
            left: `${(start - 1) * cellWidth}%`,
            width: `calc(${width * cellWidth}% - 6px)`,
            marginLeft: 3,
          }}
        >
          <span>{issue.title}</span>
          <span className="av sm">{memberInitial(owner)}</span>
        </span>
      </div>
    </article>
  )
}

function LaneGrid({ totalSlots }: { totalSlots: number }) {
  return <div className="lane-grid" style={{ backgroundSize: `${100 / totalSlots}% 100%` }} />
}
