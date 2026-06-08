import { ProjectFilter, type ProjectFilterValue } from '../components/ProjectFilter'
import { filterIssues } from '../domain/issues'
import type { SeedData } from '../domain/types'

export function IssuesPage({
  data,
  projectId,
  onProjectChange,
}: {
  data: SeedData
  projectId: ProjectFilterValue
  onProjectChange: (projectId: ProjectFilterValue) => void
}) {
  const issues = filterIssues(data.issues, { projectId, status: 'all', assigneeId: 'all', keyword: '' })

  return (
    <main>
      <header>
        <h1>Issues</h1>
        <p>需求 & 缺陷</p>
      </header>
      <ProjectFilter projects={data.projects} value={projectId} onChange={onProjectChange} />
      <section>
        {issues.map((issue) => (
          <article key={issue.key}>
            <span>{issue.key}</span>
            <strong>{issue.title}</strong>
            <span>{issue.status}</span>
          </article>
        ))}
      </section>
    </main>
  )
}
