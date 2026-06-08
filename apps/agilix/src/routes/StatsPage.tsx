import { buildIterationStats } from '../domain/iterations'
import type { ProjectId, SeedData } from '../domain/types'

export function StatsPage({ data, projectId, iterationCode }: { data: SeedData; projectId: ProjectId; iterationCode: string }) {
  const stats = buildIterationStats(data, projectId, iterationCode)

  return (
    <main>
      <h1>迭代统计</h1>
      <section>
        <h2>{stats.iteration.name}</h2>
        <p>完成 {stats.completionPercent}%</p>
        <p>总点数 {stats.totalPoints}</p>
        <p>已完成 {stats.donePoints}</p>
        <p>阻塞 {stats.blockedCount}</p>
      </section>
      <section>
        <h2>近五迭代速度</h2>
        <p>{stats.velocity} pt / 迭代</p>
      </section>
    </main>
  )
}
