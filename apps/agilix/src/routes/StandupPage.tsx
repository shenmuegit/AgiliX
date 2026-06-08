import { buildStandupSummary } from '../domain/standup'
import type { ProjectId, SeedData, Standup } from '../domain/types'

export function StandupPage({
  data,
  projectId,
  onSaveStandup,
}: {
  data: SeedData
  projectId: ProjectId
  onSaveStandup: (standup: Standup) => void
}) {
  const standup = data.standups.find((item) => item.projectId === projectId)
  if (!standup) throw new Error(`Standup not found: ${projectId}`)
  const summary = buildStandupSummary(data, projectId)

  return (
    <main>
      <h1>每日站会</h1>
      <p>关联飞书日历 · 每日 10:00</p>
      <p>
        {summary.dateLabel} · {summary.timeLabel}
      </p>
      <section>
        <h2>昨日</h2>
        <p>{summary.yesterdayCount} 项</p>
      </section>
      <section>
        <h2>今日</h2>
        <p>{summary.todayCount} 项</p>
      </section>
      <section>
        <h2>阻塞</h2>
        {summary.blockers.map((key) => (
          <span key={key}>{key}</span>
        ))}
      </section>
      <button onClick={() => onSaveStandup(standup)}>保存站会</button>
    </main>
  )
}
