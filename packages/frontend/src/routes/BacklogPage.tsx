import { useState } from 'react'
import { useParams } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  ISSUE_TYPE_CONFIG,
  PRIORITY_CONFIG,
  type IssueType,
  type Priority,
  type Sprint,
} from '@agilix/shared'
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
  const queryClient = useQueryClient()
  const openIssueDrawer = useUIStore((s) => s.openIssueDrawer)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<IssueType>('TASK')

  const { data, isLoading } = useQuery({
    queryKey: ['backlog', projectId],
    queryFn: () => api.get<{ data: BacklogIssue[] }>(`/projects/${projectId}/backlog`),
    enabled: !!projectId,
  })

  const { data: sprintData } = useQuery({
    queryKey: ['sprints', projectId],
    queryFn: () => api.get<{ data: Sprint[] }>(`/projects/${projectId}/sprints`),
    enabled: !!projectId,
  })

  const createMutation = useMutation({
    mutationFn: (input: { title: string; type: IssueType }) =>
      api.post(`/projects/${projectId}/issues`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog', projectId] })
      setNewTitle('')
      setShowCreate(false)
    },
  })

  const assignToSprintMutation = useMutation({
    mutationFn: ({ sprintId, issueIds }: { sprintId: string; issueIds: string[] }) =>
      api.post(`/sprints/${sprintId}/issues`, { issueIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog', projectId] })
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] })
      setSelected(new Set())
    },
  })

  const issues = data?.data ?? []
  const plannedSprints = (sprintData?.data ?? []).filter((s) => s.status !== 'COMPLETED')
  const totalPoints = issues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0)

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (isLoading) return <div className="text-[var(--color-text-secondary)]">加载中...</div>

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">Backlog</h2>
          <span className="text-sm text-[var(--color-text-secondary)]">
            {issues.length} 个 Issue · {totalPoints} SP
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && plannedSprints.length > 0 && (
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  assignToSprintMutation.mutate({
                    sprintId: e.target.value,
                    issueIds: Array.from(selected),
                  })
                }
              }}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
            >
              <option value="" disabled>移入 Sprint ({selected.size} 个)...</option>
              {plannedSprints.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            创建 Issue
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="mb-4 rounded-lg border border-[var(--color-primary)] bg-white p-4">
          <div className="flex items-center gap-3">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as IssueType)}
              className="rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm"
            >
              {Object.entries(ISSUE_TYPE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <input
              autoFocus
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTitle.trim()) createMutation.mutate({ title: newTitle.trim(), type: newType })
                if (e.key === 'Escape') setShowCreate(false)
              }}
              placeholder="输入标题，回车创建..."
              className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
            />
            <button
              onClick={() => newTitle.trim() && createMutation.mutate({ title: newTitle.trim(), type: newType })}
              disabled={!newTitle.trim() || createMutation.isPending}
              className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              创建
            </button>
            <button onClick={() => setShowCreate(false)} className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
              取消
            </button>
          </div>
        </div>
      )}

      {issues.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-12 text-center text-[var(--color-text-secondary)]">
          Backlog 为空，点击上方按钮创建第一个 Issue
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--color-border)] bg-white">
          {issues.map((issue, i) => (
            <div
              key={issue.id}
              className={`flex cursor-pointer items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors ${
                i > 0 ? 'border-t border-[var(--color-border)]' : ''
              } ${selected.has(issue.id) ? 'bg-blue-50' : ''}`}
            >
              <input
                type="checkbox"
                checked={selected.has(issue.id)}
                onChange={() => toggleSelect(issue.id)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <div
                className="flex flex-1 items-center gap-4"
                onClick={() => openIssueDrawer(issue.id)}
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
