import type { SeedData } from '../domain/types'
import { buildWorkloadRows } from '../domain/workload'

export function WorkloadPage({ data }: { data: SeedData }) {
  const rows = buildWorkloadRows(data)
  if (rows.length === 0) throw new Error('Workload view requires at least one member')
  const averageLoad = Math.round(rows.reduce((sum, row) => sum + row.loadPercent, 0) / rows.length)

  return (
    <main>
      <h1>成员负载</h1>
      <p>
        <span>整体负载</span>
        <strong>{averageLoad}%</strong>
      </p>
      <section>
        {rows.map((row) => (
          <article key={row.memberId}>
            <h2>{row.name}</h2>
            <p>{row.loadPercent}%</p>
            {row.activeIssueKeys.map((key) => (
              <span key={key}>{key}</span>
            ))}
          </article>
        ))}
      </section>
    </main>
  )
}
