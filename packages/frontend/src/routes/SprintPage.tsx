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

const STATUS_STYLES: Record<string, string> = {
  PLANNED: 'bg-gray-100 text-gray-700',
  ACTIVE: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
}

const STATUS_LABELS: Record<string, string> = {
  PLANNED: '计划中',
  ACTIVE: '进行中',
  COMPLETED: '已完成',
}

interface SprintIssue {
  id: string
  key: string
  title: string
  type: string
  priority: string
  storyPoints: number | null
  status: { name: string; color: string; category: string }
  assignee: { name: string; avatarUrl: string | null } | null
}

interface SprintDetail extends Sprint {
  issues: SprintIssue[]
}

export function SprintPage() {
  const { projectId } = useParams()
  const queryClient = useQueryClient()
  const openIssueDrawer = useUIStore((s) => s.openIssueDrawer)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', goal: '', startDate: '', endDate: '' })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['sprints', projectId],
    queryFn: () => api.get<{ data: Sprint[] }>(`/projects/${projectId}/sprints`),
    enabled: !!projectId,
  })

  const { data: detailData } = useQuery({
    queryKey: ['sprint-detail', expandedId],
    queryFn: () => api.get<{ data: SprintDetail }>(`/sprints/${expandedId}`),
    enabled: !!expandedId,
  })

  const createMutation = useMutation({
    mutationFn: (input: { name: string; goal?: string; startDate?: string; endDate?: string }) =>
      api.post(`/projects/${projectId}/sprints`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] })
      setShowCreate(false)
      setForm({ name: '', goal: '', startDate: '', endDate: '' })
    },
  })

  const startMutation = useMutation({
    mutationFn: (sprintId: string) => api.post(`/sprints/${sprintId}/start`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sprints', projectId] }),
  })

  const completeMutation = useMutation({
    mutationFn: (sprintId: string) => api.post(`/sprints/${sprintId}/complete`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] })
      queryClient.invalidateQueries({ queryKey: ['backlog', projectId] })
    },
  })

  const sprints = data?.data ?? []
  const sprintDetail = detailData?.data
  const sprintIssues = sprintDetail?.issues ?? []
  const doneCount = sprintIssues.filter((i) => i.status.category === 'DONE').length
  const totalPoints = sprintIssues.reduce((s, i) => s + (i.storyPoints ?? 0), 0)
  const donePoints = sprintIssues.filter((i) => i.status.category === 'DONE').reduce((s, i) => s + (i.storyPoints ?? 0), 0)

  function handleCreate() {
    const input: Record<string, string> = { name: form.name }
    if (form.goal) input.goal = form.goal
    if (form.startDate) input.startDate = new Date(form.startDate).toISOString()
    if (form.endDate) input.endDate = new Date(form.endDate).toISOString()
    createMutation.mutate(input as any)
  }

  if (isLoading) return <div className="text-[var(--color-text-secondary)]">加载中...</div>

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Sprint</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          创建 Sprint
        </button>
      </div>

      {showCreate && (
        <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-white p-5">
          <h3 className="mb-3 font-medium">新建 Sprint</h3>
          <div className="space-y-3">
            <input
              autoFocus
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Sprint 名称"
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
            />
            <textarea
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
              placeholder="Sprint 目标（可选）"
              rows={2}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none resize-none"
            />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">开始日期</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">结束日期</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!form.name.trim() || createMutation.isPending}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                创建
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {sprints.length === 0 && !showCreate ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-12 text-center text-[var(--color-text-secondary)]">
          暂无 Sprint，点击上方按钮创建
        </div>
      ) : (
        <div className="space-y-4">
          {sprints.map((sprint) => {
            const isExpanded = expandedId === sprint.id

            return (
              <div key={sprint.id} className="rounded-lg border border-[var(--color-border)] bg-white">
                <div
                  className="flex cursor-pointer items-center justify-between p-5"
                  onClick={() => setExpandedId(isExpanded ? null : sprint.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--color-text-secondary)]">{isExpanded ? '▼' : '▶'}</span>
                    <h3 className="font-medium">{sprint.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[sprint.status]}`}>
                      {STATUS_LABELS[sprint.status]}
                    </span>
                    {sprint.startDate && sprint.endDate && (
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {new Date(sprint.startDate).toLocaleDateString('zh-CN')} — {new Date(sprint.endDate).toLocaleDateString('zh-CN')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {sprint.status === 'PLANNED' && (
                      <button
                        onClick={() => startMutation.mutate(sprint.id)}
                        disabled={startMutation.isPending}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        启动
                      </button>
                    )}
                    {sprint.status === 'ACTIVE' && (
                      <button
                        onClick={() => completeMutation.mutate(sprint.id)}
                        disabled={completeMutation.isPending}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        完成 Sprint
                      </button>
                    )}
                  </div>
                </div>

                {sprint.goal && (
                  <p className="px-5 pb-2 text-sm text-[var(--color-text-secondary)]">{sprint.goal}</p>
                )}

                {isExpanded && sprintDetail && (
                  <div className="border-t border-[var(--color-border)]">
                    <div className="flex items-center gap-6 px-5 py-3 text-xs text-[var(--color-text-secondary)]">
                      <span>Issue: {doneCount}/{sprintIssues.length}</span>
                      <span>Story Points: {donePoints}/{totalPoints}</span>
                      {sprintIssues.length > 0 && (
                        <div className="flex items-center gap-2 flex-1">
                          <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-green-500 transition-all"
                              style={{ width: `${sprintIssues.length > 0 ? (doneCount / sprintIssues.length) * 100 : 0}%` }}
                            />
                          </div>
                          <span>{sprintIssues.length > 0 ? Math.round((doneCount / sprintIssues.length) * 100) : 0}%</span>
                        </div>
                      )}
                    </div>

                    {sprintIssues.length === 0 ? (
                      <div className="px-5 py-6 text-center text-sm text-[var(--color-text-secondary)]">
                        暂无 Issue，从 Backlog 页面将 Issue 移入此 Sprint
                      </div>
                    ) : (
                      <div>
                        {sprintIssues.map((issue) => (
                          <div
                            key={issue.id}
                            onClick={() => openIssueDrawer(issue.id)}
                            className="flex cursor-pointer items-center gap-4 border-t border-[var(--color-border)] px-5 py-3 hover:bg-gray-50 transition-colors"
                          >
                            <span className="text-xs font-medium" style={{ color: ISSUE_TYPE_CONFIG[issue.type as IssueType]?.color }}>
                              {ISSUE_TYPE_CONFIG[issue.type as IssueType]?.label}
                            </span>
                            <span className="w-20 text-xs text-[var(--color-text-secondary)]">{issue.key}</span>
                            <span className="flex-1 text-sm">{issue.title}</span>
                            <span className="text-xs" style={{ color: PRIORITY_CONFIG[issue.priority as Priority]?.color }}>
                              {PRIORITY_CONFIG[issue.priority as Priority]?.label}
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
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
