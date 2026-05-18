import { useDraggable } from '@dnd-kit/core'
import { ISSUE_TYPE_CONFIG, PRIORITY_CONFIG, type IssueType, type Priority } from '@agilix/shared'
import { useUIStore } from '@/stores/uiStore'

interface CardProps {
  issue: {
    id: string
    key: string
    title: string
    type: string
    priority: string
    storyPoints: number | null
    assignee: { id: string; name: string; avatarUrl: string | null } | null
    labels: Array<{ label: { id: string; name: string; color: string } }>
  }
  isDragOverlay?: boolean
}

export function KanbanCard({ issue, isDragOverlay }: CardProps) {
  const openIssueDrawer = useUIStore((s) => s.openIssueDrawer)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: issue.id })

  const typeConfig = ISSUE_TYPE_CONFIG[issue.type as IssueType]
  const priorityConfig = PRIORITY_CONFIG[issue.priority as Priority]

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => !isDragging && openIssueDrawer(issue.id)}
      className={`cursor-pointer rounded-lg border border-[var(--color-border)] bg-white p-3 shadow-sm transition-shadow hover:shadow-md ${
        isDragging && !isDragOverlay ? 'opacity-40' : ''
      } ${isDragOverlay ? 'shadow-lg rotate-2' : ''}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-medium" style={{ color: typeConfig.color }}>
          {typeConfig.label}
        </span>
        <span className="text-xs text-[var(--color-text-secondary)]">{issue.key}</span>
      </div>

      <p className="mb-2 text-sm font-medium text-[var(--color-text)] line-clamp-2">{issue.title}</p>

      {issue.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {issue.labels.map(({ label }) => (
            <span
              key={label.id}
              className="rounded px-1.5 py-0.5 text-[10px] text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: priorityConfig.color }} title={priorityConfig.label}>
            ●
          </span>
          {issue.storyPoints != null && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
              {issue.storyPoints} SP
            </span>
          )}
        </div>

        {issue.assignee && (
          issue.assignee.avatarUrl ? (
            <img
              src={issue.assignee.avatarUrl}
              alt={issue.assignee.name}
              className="h-6 w-6 rounded-full"
              title={issue.assignee.name}
            />
          ) : (
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-medium text-[var(--color-primary)]"
              title={issue.assignee.name}
            >
              {issue.assignee.name[0]}
            </div>
          )
        )}
      </div>
    </div>
  )
}
