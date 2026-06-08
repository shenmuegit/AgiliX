import type { SeedData } from '../domain/types'
import { buildIterationStats } from '../domain/iterations'
import { buildWorkbenchSnapshot } from '../domain/workbench'

export function TeamPage({ data }: { data: SeedData }) {
  const snapshot = buildWorkbenchSnapshot(data)
  const primaryProject = data.projects[0]
  if (!primaryProject) throw new Error('Team workbench requires at least one project')
  const iterationStats = buildIterationStats(data, primaryProject.id, primaryProject.activeIterationCode)

  return (
    <main>
      <header>
        <h1>团队工作台</h1>
        <p>飞书只做通知和查询</p>
      </header>
      <section>
        <h2>今天要盯住 {snapshot.attentionIssueKeys.length} 件事</h2>
        <p>迭代完成 {iterationStats.completionPercent}%</p>
      </section>
      <section aria-label="待处理 Issue">
        <h2>待处理 Issue</h2>
        {snapshot.attentionIssueKeys.map((key) => (
          <article key={key}>{key}</article>
        ))}
      </section>
      <section>
        <h2>最近文档</h2>
        {snapshot.recentDocTitles.slice(0, 4).map((title) => (
          <article key={title}>{title}</article>
        ))}
      </section>
    </main>
  )
}
