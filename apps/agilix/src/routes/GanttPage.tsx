import type { Issue, Milestone, MilestoneStatus, ProjectId, SeedData } from '../domain/types'
import { getActiveIteration, getMember, getProject, issuesForIteration, memberInitial } from '../domain/view-models'

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

export function GanttPage({ data, projectId, onSaveMilestone }: { data: SeedData; projectId: ProjectId; onSaveMilestone: (milestone: Milestone) => void }) {
  const project = getProject(data, projectId)
  const iteration = getActiveIteration(data, project)
  const issues = issuesForIteration(data, projectId, iteration.code)
  const milestones = data.milestones.filter((item) => item.projectId === projectId && item.iterationId === iteration.id).sort((left, right) => left.startDay - right.startDay)
  const focusMilestone = milestones.find((milestone) => milestone.status === 'risk') ?? milestones[0]
  if (!focusMilestone) throw new Error(`Milestone not found: ${projectId}/${iteration.id}`)
  const totalSlots = iteration.totalDays
  const cellWidth = 100 / totalSlots

  return (
    <main className="gt-body">
      <header className="top">
        <div>
          <p className="kicker">{project.name}</p>
          <h1>排期甘特</h1>
          <p>
            {iteration.code} · {iteration.name} · 第 {iteration.day}/{iteration.totalDays} 天
          </p>
        </div>
        <div className="actions">
          <button className="ghost">同步飞书日历</button>
          <button className="primary" onClick={() => onSaveMilestone(focusMilestone)}>
            保存 {focusMilestone.title}
          </button>
        </div>
      </header>

      <section className="gt" aria-label="项目甘特图">
        <div className="gt-head">
          <div className="corner">工作项 / 里程碑</div>
          <div className="gt-weeks">
            <div className="wk-row">
              {weekLabels(totalSlots).map((week) => (
                <span key={week} className="wk">
                  {week}
                </span>
              ))}
            </div>
            <div className="day-row">
              {Array.from({ length: totalSlots }, (_, index) => (
                <span key={index + 1} className="day">
                  {index + 1}
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
              <div className="lane-grid" />
            </div>
          </article>
          {issues.map((issue, index) => (
            <IssueRow key={issue.key} data={data} issue={issue} index={index} totalSlots={totalSlots} cellWidth={cellWidth} />
          ))}
        </div>

        <article className="gt-row">
          <div className="gt-name">
            <strong className="milestone-name">里程碑</strong>
          </div>
          <div className="lane ms-row">
            <div className="lane-grid" />
            <div className="today-line" style={{ left: `${(iteration.day - 1) * cellWidth}%` }} />
            {milestones.map((milestone) => (
              <div className="ms" key={milestone.id} style={{ left: `${(milestone.startDay - 0.5) * cellWidth}%` }}>
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

function IssueRow({ data, issue, index, totalSlots, cellWidth }: { data: SeedData; issue: Issue; index: number; totalSlots: number; cellWidth: number }) {
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
        <div className="lane-grid" />
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

function weekLabels(totalSlots: number): string[] {
  const weeks = Math.ceil(totalSlots / 5)
  return Array.from({ length: weeks }, (_, index) => `W${index + 1}`)
}
