import { useState, useRef, useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ISSUE_TYPE_CONFIG, PRIORITY_CONFIG, type IssueType, type Priority } from '@agilix/shared'
import { useUIStore } from '@/stores/uiStore'
import { api } from '@/lib/api'

interface CardProps {
  issue: {
    id: string
    key: string
    title: string
    type: string
    priority: string
    labels: Array<{ label: { id: string; name: string; color: string } }>
  }
  isDragOverlay?: boolean
}

export function KanbanCard({ issue, isDragOverlay }: CardProps) {
  const openIssueDrawer = useUIStore((s) => s.openIssueDrawer)
  const queryClient = useQueryClient()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: issue.id })

  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/issues/${issue.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board'] })
      setMenu(null)
    },
  })

  useEffect(() => {
    if (!menu) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menu])

  const typeConfig = ISSUE_TYPE_CONFIG[issue.type as IssueType]
  const priorityConfig = PRIORITY_CONFIG[issue.priority as Priority]

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => !isDragging && !menu && openIssueDrawer(issue.id)}
      onContextMenu={(e) => {
        if (isDragOverlay) return
        e.preventDefault()
        setMenu({ x: e.clientX, y: e.clientY })
      }}
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

      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: priorityConfig.color }} title={priorityConfig.label}>
          ●
        </span>
      </div>

      {menu && (
        <div
          ref={menuRef}
          className="fixed z-50 rounded-lg border border-[var(--color-border)] bg-white py-1 shadow-lg"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`确定删除 ${issue.key}？`)) deleteMutation.mutate()
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[var(--color-danger)] hover:bg-red-50"
          >
            删除
          </button>
        </div>
      )}
    </div>
  )
}
