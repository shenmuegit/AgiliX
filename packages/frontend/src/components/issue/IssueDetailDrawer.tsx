import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useUIStore } from '@/stores/uiStore'
import { IssueForm } from './IssueForm'
import { CommentThread } from './CommentThread'
import { TimeLogWidget } from './TimeLogWidget'
import { ISSUE_TYPE_CONFIG, PRIORITY_CONFIG, type IssueType, type Priority } from '@agilix/shared'

interface IssueDetail {
  id: string
  key: string
  title: string
  description: string | null
  type: string
  priority: string
  storyPoints: number | null
  dueDate: string | null
  status: { id: string; name: string; color: string; category: string }
  assignee: { id: string; name: string; avatarUrl: string | null } | null
  reporter: { id: string; name: string; avatarUrl: string | null }
  labels: Array<{ label: { id: string; name: string; color: string } }>
  children: Array<{ id: string; key: string; title: string; status: { name: string; color: string }; assignee: { name: string } | null }>
  mergeRequests: Array<{ id: string; title: string; state: string; sourceBranch: string; webUrl: string | null }>
  gitBranches: Array<{ id: string; name: string }>
}

export function IssueDetailDrawer() {
  const issueId = useUIStore((s) => s.drawerIssueId)
  const closeDrawer = useUIStore((s) => s.closeIssueDrawer)

  const { data, isLoading } = useQuery({
    queryKey: ['issue', issueId],
    queryFn: () => api.get<{ data: IssueDetail }>(`/issues/${issueId}`),
    enabled: !!issueId,
  })

  if (!issueId) return null

  const issue = data?.data

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={closeDrawer} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-[560px] flex-col border-l border-[var(--color-border)] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          {issue ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: ISSUE_TYPE_CONFIG[issue.type as IssueType]?.color }}>
                {ISSUE_TYPE_CONFIG[issue.type as IssueType]?.label}
              </span>
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">{issue.key}</span>
            </div>
          ) : (
            <span />
          )}
          <button
            onClick={closeDrawer}
            className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-[var(--color-text-secondary)]">加载中...</div>
          ) : issue ? (
            <div className="space-y-6 p-6">
              <IssueForm issue={issue} />

              {/* Sub-tasks */}
              {issue.children.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-[var(--color-text)]">子任务</h3>
                  <div className="space-y-1">
                    {issue.children.map((child) => (
                      <div key={child.id} className="flex items-center gap-2 rounded border border-[var(--color-border)] px-3 py-2 text-sm">
                        <span className="text-xs text-[var(--color-text-secondary)]">{child.key}</span>
                        <span className="flex-1">{child.title}</span>
                        <span className="rounded px-1.5 py-0.5 text-[10px] text-white" style={{ backgroundColor: child.status.color }}>
                          {child.status.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Git info */}
              {(issue.mergeRequests.length > 0 || issue.gitBranches.length > 0) && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-[var(--color-text)]">Git</h3>
                  {issue.gitBranches.map((b) => (
                    <div key={b.id} className="mb-1 rounded bg-gray-50 px-3 py-1.5 text-xs font-mono text-[var(--color-text-secondary)]">
                      {b.name}
                    </div>
                  ))}
                  {issue.mergeRequests.map((mr) => (
                    <div key={mr.id} className="flex items-center gap-2 rounded border border-[var(--color-border)] px-3 py-2 text-sm">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        mr.state === 'merged' ? 'bg-purple-100 text-purple-700' :
                        mr.state === 'opened' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {mr.state}
                      </span>
                      <span className="flex-1 truncate">{mr.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Time Logs */}
              <TimeLogWidget issueId={issue.id} />

              {/* Comments */}
              <CommentThread issueId={issue.id} />
            </div>
          ) : (
            <div className="p-6 text-[var(--color-text-secondary)]">Issue 未找到</div>
          )}
        </div>
      </div>
    </>
  )
}
