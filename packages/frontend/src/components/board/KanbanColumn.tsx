import { useState } from 'react'
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
      columnOrder: number
      status: { name: string; color: string }
      labels: Array<{ label: { id: string; name: string; color: string } }>
    }>
  }
  onWipLimitChange?: (columnId: string, wipLimit: number | null) => void
}

export function KanbanColumn({ column, onWipLimitChange }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const [editingWip, setEditingWip] = useState(false)
  const [wipValue, setWipValue] = useState('')

  const statusName = column.issues[0]?.status.name ?? 'Empty'
  const statusColor = column.issues[0]?.status.color ?? '#6B7280'
  const isOverWip = column.wipLimit ? column.issues.length > column.wipLimit : false
  const isAtWip = column.wipLimit ? column.issues.length === column.wipLimit : false

  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 md:w-72 flex-shrink-0 flex-col rounded-lg transition-colors ${
        isOverWip ? 'bg-red-50 ring-1 ring-red-200' :
        isAtWip ? 'bg-yellow-50' :
        isOver ? 'bg-blue-50' : 'bg-[var(--color-bg-secondary)]'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor }} />
          <span className="text-sm font-medium text-[var(--color-text)]">{statusName}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-xs ${
            isOverWip ? 'bg-red-200 text-red-700 font-medium' :
            isAtWip ? 'bg-yellow-200 text-yellow-700' :
            'bg-gray-200 text-[var(--color-text-secondary)]'
          }`}>
            {column.issues.length}
          </span>
        </div>

        {editingWip ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              type="number"
              min="0"
              value={wipValue}
              onChange={(e) => setWipValue(e.target.value)}
              onBlur={() => {
                const val = wipValue ? parseInt(wipValue) : null
                onWipLimitChange?.(column.id, val && val > 0 ? val : null)
                setEditingWip(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                if (e.key === 'Escape') setEditingWip(false)
              }}
              className="w-10 rounded border border-[var(--color-primary)] px-1 py-0.5 text-xs text-center outline-none"
              placeholder="--"
            />
          </div>
        ) : (
          <button
            onClick={() => { setWipValue(column.wipLimit?.toString() ?? ''); setEditingWip(true) }}
            className={`text-xs transition-colors ${
              isOverWip ? 'text-red-600 font-semibold' :
              column.wipLimit ? 'text-[var(--color-text-secondary)]' :
              'text-transparent hover:text-[var(--color-text-secondary)]'
            }`}
            title="点击设置 WIP 限制"
          >
            {column.wipLimit ? `WIP: ${column.wipLimit}` : 'WIP'}
          </button>
        )}
      </div>

      {isOverWip && (
        <div className="mx-2 mb-2 rounded bg-red-100 px-2 py-1 text-xs text-red-600 text-center">
          超出 WIP 限制 ({column.issues.length}/{column.wipLimit})
        </div>
      )}

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
