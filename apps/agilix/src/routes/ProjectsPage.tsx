import { buildIterationStats } from '../domain/iterations'
import type { SeedData } from '../domain/types'

export function ProjectsPage({ data }: { data: SeedData }) {
  return (
    <main>
      <header>
        <h1>项目总览</h1>
        <p>共 {data.members.length} 名成员协作</p>
      </header>
      <section>
        {data.projects.map((project) => {
          const stats = buildIterationStats(data, project.id, project.activeIterationCode)

          return (
            <article key={project.id}>
              <h2>{project.name}</h2>
              <p>
                {project.activeIterationCode} · {stats.iteration.name}
              </p>
              <p>迭代进度 {stats.completionPercent}%</p>
              <p>Issue {data.issues.filter((issue) => issue.projectId === project.id).length}</p>
            </article>
          )
        })}
      </section>
    </main>
  )
}
