import { buildGanttRows } from '../domain/gantt'
import type { Milestone, ProjectId, SeedData } from '../domain/types'

function findMilestone(data: SeedData, id: string): Milestone {
  const milestone = data.milestones.find((item) => item.id === id)
  if (!milestone) throw new Error(`Milestone not found: ${id}`)
  return milestone
}

export function GanttPage({
  data,
  projectId,
  onSaveMilestone,
}: {
  data: SeedData
  projectId: ProjectId
  onSaveMilestone: (milestone: Milestone) => void
}) {
  const rows = buildGanttRows(data, projectId)

  return (
    <main>
      <h1>排期甘特</h1>
      <section>
        <h2>里程碑</h2>
        {rows.map((row) => {
          const milestone = findMilestone(data, row.id)

          return (
            <article key={row.id}>
              <h3>{row.title}</h3>
              <p>
                第 {row.startDay} - {row.endDay} 天
              </p>
              <p>{row.status}</p>
              <button onClick={() => onSaveMilestone(milestone)}>保存 {row.title}</button>
            </article>
          )
        })}
      </section>
    </main>
  )
}
