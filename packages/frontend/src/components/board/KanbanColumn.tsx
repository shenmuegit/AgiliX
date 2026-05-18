import { useDroppable } from '@dnd-kit/core'
import { KanbanCard } from './KanbanCard'
import { QuickAddCard } from './QuickAddCard'

interface ColumnProps {
  column: {
    id: string
    order: number
    wipLimit: number | null
    issues: Array<{
      id: string
      key: string
      title: string
      type: string
      priority: string
      storyPoints: number | null
      columnOrder: number
      status: { name: string; color: string }
      assignee: { id: string; name: string; avatarUrl: string | null } | null
      labels: Array<{ label: { id: string; name: string; color: string } }>
    }>
  }
}

export function KanbanColumn({ column }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const statusName = column.issues[0]?.status.name ?? 'Empty'
  const statusColor = column.issues[0]?.status.color ?? '#6B7280'
  const isOverWip = column.wipLimit ? column.issues.length >= column.wipLimit : false

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 flex-shrink-0 flex-col rounded-lg transition-colors ${
        isOver ? 'bg-blue-50' : 'bg-[var(--color-bg-secondary)]'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor }} />
          <span className="text-sm font-medium text-[var(--color-text)]">{statusName}</span>
          <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-xs text-[var(--color-text-secondary)]">
            {column.issues.length}
          </span>
        </div>
        {column.wipLimit && (
          <span className={`text-xs ${isOverWip ? 'text-[var(--color-danger)] font-medium' : 'text-[var(--color-text-secondary)]'}`}>
            WIP: {column.wipLimit}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-2 px-2 pb-2">
        {column.issues
          .sort((a, b) => a.columnOrder - b.columnOrder)
          .map((issue) => (
            <KanbanCard key={issue.id} issue={issue} />
          ))}
        {column.order === 0 && <QuickAddCard />}
      </div>
    </div>
  )
}
