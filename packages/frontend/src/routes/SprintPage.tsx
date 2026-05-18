import { useParams } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Sprint } from '@agilix/shared'

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

export function SprintPage() {
  const { projectId } = useParams()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['sprints', projectId],
    queryFn: () => api.get<{ data: Sprint[] }>(`/projects/${projectId}/sprints`),
    enabled: !!projectId,
  })

  const startMutation = useMutation({
    mutationFn: (sprintId: string) => api.post(`/sprints/${sprintId}/start`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sprints', projectId] }),
  })

  const sprints = data?.data ?? []

  if (isLoading) return <div className="text-[var(--color-text-secondary)]">加载中...</div>

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Sprint</h2>
      </div>

      {sprints.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-12 text-center text-[var(--color-text-secondary)]">
          暂无 Sprint
        </div>
      ) : (
        <div className="space-y-4">
          {sprints.map((sprint) => (
            <div key={sprint.id} className="rounded-lg border border-[var(--color-border)] bg-white p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium">{sprint.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[sprint.status]}`}>
                    {STATUS_LABELS[sprint.status]}
                  </span>
                </div>
                {sprint.status === 'PLANNED' && (
                  <button
                    onClick={() => startMutation.mutate(sprint.id)}
                    className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)]"
                  >
                    启动 Sprint
                  </button>
                )}
              </div>
              {sprint.goal && <p className="text-sm text-[var(--color-text-secondary)] mb-2">{sprint.goal}</p>}
              <div className="flex gap-4 text-xs text-[var(--color-text-secondary)]">
                {sprint.startDate && <span>开始: {new Date(sprint.startDate).toLocaleDateString('zh-CN')}</span>}
                {sprint.endDate && <span>结束: {new Date(sprint.endDate).toLocaleDateString('zh-CN')}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
