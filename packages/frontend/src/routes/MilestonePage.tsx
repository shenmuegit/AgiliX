import { useState } from 'react'
import { useParams } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Milestone } from '@agilix/shared'

interface MilestoneWithStats extends Milestone {
  totalIssues: number
  doneIssues: number
}

export function MilestonePage() {
  const { projectId } = useParams()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', gitRef: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => api.get<{ data: MilestoneWithStats[] }>(`/projects/${projectId}/milestones`),
    enabled: !!projectId,
  })

  const createMutation = useMutation({
    mutationFn: (input: typeof form) =>
      api.post(`/projects/${projectId}/milestones`, {
        name: input.name,
        description: input.description || undefined,
        gitRef: input.gitRef || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', projectId] })
      setShowForm(false)
      setForm({ name: '', description: '', gitRef: '' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: string; name?: string; gitRef?: string }) =>
      api.patch(`/milestones/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['milestones', projectId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/milestones/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['milestones', projectId] }),
  })

  const milestones = data?.data ?? []
  const active = milestones.filter((m) => m.status === 'ACTIVE')
  const completed = milestones.filter((m) => m.status === 'COMPLETED')

  if (isLoading) return <div className="p-6 text-[var(--color-text-secondary)]">加载中...</div>

  return (
    <div className="p-3 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">里程碑</h2>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          新建里程碑
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border border-[var(--color-border)] bg-white p-5">
          <div className="space-y-3">
            <input
              autoFocus
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="里程碑名称，如 v1.0、支付功能上线"
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="描述（可选）"
              rows={2}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none resize-y"
            />
            <input
              type="text"
              value={form.gitRef}
              onChange={(e) => setForm({ ...form, gitRef: e.target.value })}
              placeholder="关联 Git 分支或 Tag（可选），如 release/v1.0"
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-mono focus:border-[var(--color-primary)] focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => form.name.trim() && createMutation.mutate(form)}
                disabled={!form.name.trim() || createMutation.isPending}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {createMutation.isPending ? '创建中...' : '创建'}
              </button>
              <button onClick={() => setShowForm(false)} className="text-sm text-[var(--color-text-secondary)]">
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {milestones.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-secondary)]">
          还没有里程碑，点击上方按钮创建
        </div>
      )}

      {active.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-[var(--color-text-secondary)]">进行中</h3>
          <div className="space-y-3">
            {active.map((m) => (
              <MilestoneCard
                key={m.id}
                milestone={m}
                onComplete={() => updateMutation.mutate({ id: m.id, status: 'COMPLETED' })}
                onDelete={() => deleteMutation.mutate(m.id)}
              />
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-[var(--color-text-secondary)]">已完成</h3>
          <div className="space-y-3">
            {completed.map((m) => (
              <MilestoneCard
                key={m.id}
                milestone={m}
                onReopen={() => updateMutation.mutate({ id: m.id, status: 'ACTIVE' })}
                onDelete={() => deleteMutation.mutate(m.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MilestoneCard({ milestone: m, onComplete, onReopen, onDelete }: {
  milestone: MilestoneWithStats
  onComplete?: () => void
  onReopen?: () => void
  onDelete: () => void
}) {
  const pct = m.totalIssues > 0 ? Math.round((m.doneIssues / m.totalIssues) * 100) : 0

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-white p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full ${m.status === 'ACTIVE' ? 'bg-blue-500' : 'bg-green-500'}`} />
            <h4 className="font-medium text-[var(--color-text)]">{m.name}</h4>
          </div>
          {m.description && (
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{m.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onComplete && (
            <button onClick={onComplete} className="text-xs text-green-600 hover:underline">完成</button>
          )}
          {onReopen && (
            <button onClick={onReopen} className="text-xs text-blue-600 hover:underline">重新开启</button>
          )}
          <button onClick={onDelete} className="text-xs text-[var(--color-danger)] hover:underline">删除</button>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3">
        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-[var(--color-text-secondary)] shrink-0">
          {m.doneIssues}/{m.totalIssues} 完成
        </span>
      </div>

      {m.gitRef && (
        <div className="mt-2 text-xs text-[var(--color-text-secondary)]">
          <span className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-blue-700">{m.gitRef}</span>
        </div>
      )}

      <div className="mt-2 text-[10px] text-[var(--color-text-secondary)]">
        创建于 {new Date(m.createdAt).toLocaleDateString()}
      </div>
    </div>
  )
}
