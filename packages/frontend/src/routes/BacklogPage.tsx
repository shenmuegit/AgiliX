import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ISSUE_TYPE_CONFIG, PRIORITY_CONFIG, type IssueType, type Priority } from '@agilix/shared'
import { useUIStore } from '@/stores/uiStore'

interface BacklogIssue {
  id: string
  key: string
  title: string
  type: string
  priority: string
  storyPoints: number | null
  status: { name: string; color: string }
  assignee: { name: string; avatarUrl: string | null } | null
}

export function BacklogPage() {
  const { projectId } = useParams()
  const openIssueDrawer = useUIStore((s) => s.openIssueDrawer)

  const { data, isLoading } = useQuery({
    queryKey: ['backlog', projectId],
    queryFn: () => api.get<{ data: BacklogIssue[] }>(`/projects/${projectId}/backlog`),
    enabled: !!projectId,
  })

  const issues = data?.data ?? []

  if (isLoading) return <div className="text-[var(--color-text-secondary)]">加载中...</div>

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Backlog</h2>
        <span className="text-sm text-[var(--color-text-secondary)]">{issues.length} 个 Issue</span>
      </div>

      {issues.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-12 text-center text-[var(--color-text-secondary)]">
          Backlog 为空
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--color-border)] bg-white">
          {issues.map((issue, i) => (
            <div
              key={issue.id}
              onClick={() => openIssueDrawer(issue.id)}
              className={`flex cursor-pointer items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors ${
                i > 0 ? 'border-t border-[var(--color-border)]' : ''
              }`}
            >
              <span className="text-xs font-medium" style={{ color: ISSUE_TYPE_CONFIG[issue.type as IssueType].color }}>
                {ISSUE_TYPE_CONFIG[issue.type as IssueType].label}
              </span>
              <span className="w-20 text-xs text-[var(--color-text-secondary)]">{issue.key}</span>
              <span className="flex-1 text-sm text-[var(--color-text)]">{issue.title}</span>
              <span className="text-xs" style={{ color: PRIORITY_CONFIG[issue.priority as Priority].color }}>
                {PRIORITY_CONFIG[issue.priority as Priority].label}
              </span>
              {issue.storyPoints != null && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px]">{issue.storyPoints} SP</span>
              )}
              <span className="rounded px-2 py-0.5 text-xs text-white" style={{ backgroundColor: issue.status.color }}>
                {issue.status.name}
              </span>
              {issue.assignee && (
                <span className="text-xs text-[var(--color-text-secondary)]">{issue.assignee.name}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
