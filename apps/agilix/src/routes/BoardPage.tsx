import { filterIssues, groupIssuesByStatus } from '../domain/issues'
import type { IssueStatus, ProjectId, SeedData } from '../domain/types'

const columnLabels: Record<IssueStatus, string> = {
  todo: '待办',
  doing: '进行中',
  review: 'Review',
  blocked: '阻塞',
  done: '完成',
}

export function BoardPage({
  data,
  projectId,
  onMoveIssue,
}: {
  data: SeedData
  projectId: ProjectId | 'all'
  onMoveIssue: (issueKey: string, status: IssueStatus) => void
}) {
  const grouped = groupIssuesByStatus(filterIssues(data.issues, { projectId, status: 'all', assigneeId: 'all', keyword: '' }))

  return (
    <main>
      <h1>看板</h1>
      <section>
        {(['todo', 'doing', 'review', 'blocked', 'done'] as const).map((status) => (
          <div key={status}>
            <h2>{columnLabels[status]}</h2>
            {grouped[status].map((issue) => (
              <article key={issue.key}>
                <span>{issue.key}</span>
                <strong>{issue.title}</strong>
                {status === 'review' ? <button onClick={() => onMoveIssue(issue.key, 'done')}>{issue.key} 完成</button> : null}
              </article>
            ))}
          </div>
        ))}
      </section>
    </main>
  )
}
