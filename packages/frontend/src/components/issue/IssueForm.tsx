import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ISSUE_TYPE_CONFIG, PRIORITY_CONFIG, type IssueType, type Priority } from '@agilix/shared'

interface IssueData {
  id: string
  key: string
  title: string
  description: string | null
  type: string
  priority: string
  storyPoints: number | null
  dueDate: string | null
  status: { id: string; name: string; color: string }
  assignee: { id: string; name: string; avatarUrl: string | null } | null
  reporter: { id: string; name: string }
}

export function IssueForm({ issue }: { issue: IssueData }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(issue.title)
  const [description, setDescription] = useState(issue.description || '')
  const [priority, setPriority] = useState(issue.priority)
  const [storyPoints, setStoryPoints] = useState(issue.storyPoints?.toString() || '')
  const [dueDate, setDueDate] = useState(issue.dueDate?.split('T')[0] || '')

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.patch(`/issues/${issue.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', issue.id] })
      queryClient.invalidateQueries({ queryKey: ['board'] })
    },
  })

  function saveField(field: string, value: unknown) {
    updateMutation.mutate({ [field]: value })
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title !== issue.title && saveField('title', title)}
        className="w-full text-lg font-semibold text-[var(--color-text)] border-none outline-none bg-transparent focus:ring-0 p-0"
      />

      {/* Status badge */}
      <div className="flex items-center gap-3">
        <span
          className="rounded-full px-3 py-1 text-xs font-medium text-white"
          style={{ backgroundColor: issue.status.color }}
        >
          {issue.status.name}
        </span>
        <span className="text-xs text-[var(--color-text-secondary)]">
          reported by {issue.reporter.name}
        </span>
      </div>

      {/* Fields grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Type */}
        <div>
          <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">类型</label>
          <select
            value={issue.type}
            onChange={(e) => saveField('type', e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
          >
            {Object.entries(ISSUE_TYPE_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">优先级</label>
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value)
              saveField('priority', e.target.value)
            }}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
          >
            {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>

        {/* Story Points */}
        <div>
          <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Story Points</label>
          <input
            type="number"
            min="0"
            max="100"
            value={storyPoints}
            onChange={(e) => setStoryPoints(e.target.value)}
            onBlur={() => {
              const val = storyPoints ? Number(storyPoints) : null
              if (val !== issue.storyPoints) saveField('storyPoints', val)
            }}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
            placeholder="—"
          />
        </div>

        {/* Due Date */}
        <div>
          <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">截止日期</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value)
              saveField('dueDate', e.target.value ? new Date(e.target.value).toISOString() : null)
            }}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">描述</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => description !== (issue.description || '') && saveField('description', description || null)}
          rows={4}
          placeholder="添加描述..."
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none resize-y"
        />
      </div>
    </div>
  )
}
