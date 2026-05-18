import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { api } from '@/lib/api'
import { ISSUE_TYPE_CONFIG, type IssueType } from '@agilix/shared'

export function QuickAddCard() {
  const { projectId } = useParams()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<IssueType>('TASK')

  const createMutation = useMutation({
    mutationFn: (input: { title: string; type: IssueType }) =>
      api.post(`/projects/${projectId}/issues`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', projectId] })
      setTitle('')
      setIsOpen(false)
    },
  })

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-lg border border-dashed border-[var(--color-border)] px-3 py-2 text-left text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
      >
        + 创建 Issue
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-[var(--color-primary)] bg-white p-3 shadow-sm">
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && title.trim()) {
            createMutation.mutate({ title: title.trim(), type })
          }
          if (e.key === 'Escape') setIsOpen(false)
        }}
        placeholder="输入标题，回车创建..."
        className="mb-2 w-full border-none text-sm outline-none placeholder:text-[var(--color-text-secondary)]"
      />
      <div className="flex items-center justify-between">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as IssueType)}
          className="rounded border border-[var(--color-border)] px-2 py-1 text-xs focus:border-[var(--color-primary)] focus:outline-none"
        >
          {Object.entries(ISSUE_TYPE_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        <div className="flex gap-1">
          <button
            onClick={() => setIsOpen(false)}
            className="rounded px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-gray-100"
          >
            取消
          </button>
          <button
            onClick={() => title.trim() && createMutation.mutate({ title: title.trim(), type })}
            disabled={!title.trim() || createMutation.isPending}
            className="rounded bg-[var(--color-primary)] px-2 py-1 text-xs text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            创建
          </button>
        </div>
      </div>
    </div>
  )
}
