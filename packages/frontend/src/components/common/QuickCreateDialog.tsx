import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useUIStore } from '@/stores/uiStore'
import { ISSUE_TYPE_CONFIG, PRIORITY_CONFIG, type IssueType, type Priority } from '@agilix/shared'

export function QuickCreateDialog() {
  const open = useUIStore((s) => s.quickCreateOpen)
  const close = useUIStore((s) => s.closeQuickCreate)
  const openIssueDrawer = useUIStore((s) => s.openIssueDrawer)
  const { projectId } = useParams()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [type, setType] = useState<IssueType>('TASK')
  const [priority, setPriority] = useState<Priority>('MEDIUM')

  const createMutation = useMutation({
    mutationFn: (input: { title: string; type: IssueType; priority: Priority }) =>
      api.post<{ data: { id: string } }>(`/projects/${projectId}/issues`, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['board', projectId] })
      const issue = data?.data
      if (issue?.id) openIssueDrawer(issue.id)
      close()
      setTitle('')
      setType('TASK')
      setPriority('MEDIUM')
    },
  })

  useEffect(() => {
    if (open) {
      setTitle('')
      setType('TASK')
      setPriority('MEDIUM')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  function handleSubmit() {
    if (!title.trim()) return
    createMutation.mutate({ title: title.trim(), type, priority })
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" onClick={close} />
      <div className="fixed inset-x-3 top-[10%] z-50 mx-auto max-w-[480px] rounded-xl border border-[var(--color-border)] bg-white shadow-2xl sm:inset-x-auto sm:left-1/2 sm:top-[20%] sm:-translate-x-1/2">
        <div className="border-b border-[var(--color-border)] px-5 py-3">
          <h3 className="text-sm font-medium">新建 Issue</h3>
        </div>
        <div className="space-y-3 p-5">
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit()
              if (e.key === 'Escape') close()
            }}
            placeholder="输入标题..."
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">类型</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as IssueType)}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
              >
                {Object.entries(ISSUE_TYPE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">优先级</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
              >
                {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-[var(--color-border)] px-5 py-3">
          <span className="text-xs text-[var(--color-text-secondary)]">
            <kbd className="rounded bg-gray-100 px-1 py-0.5">Enter</kbd> 创建
          </span>
          <div className="flex gap-2">
            <button
              onClick={close}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || createMutation.isPending}
              className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              创建
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
