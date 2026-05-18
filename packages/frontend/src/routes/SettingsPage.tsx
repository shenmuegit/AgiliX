import { useState, useEffect } from 'react'
import { useParams } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Project } from '@agilix/shared'

interface ProjectDetail extends Project {
  members: Array<{ id: string; role: string; user: { id: string; name: string; avatarUrl: string | null } }>
  workflows: Array<{
    id: string
    name: string
    statuses: Array<{ id: string; name: string; category: string; order: number; color: string }>
  }>
}

export function SettingsPage() {
  const { projectId } = useParams()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get<{ data: ProjectDetail }>(`/projects/${projectId}`),
    enabled: !!projectId,
  })

  const project = data?.data
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (project) {
      setName(project.name)
      setDescription(project.description || '')
    }
  }, [project])

  const updateMutation = useMutation({
    mutationFn: (input: { name?: string; description?: string }) =>
      api.patch(`/projects/${projectId}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  if (isLoading) return <div className="text-[var(--color-text-secondary)]">加载中...</div>
  if (!project) return <div className="text-[var(--color-text-secondary)]">项目未找到</div>

  const workflow = project.workflows[0]
  const statuses = workflow?.statuses?.sort((a, b) => a.order - b.order) ?? []
  const members = project.members ?? []

  return (
    <div className="max-w-3xl">
      <h2 className="mb-6 text-lg font-bold">项目设置</h2>

      {/* Project Info */}
      <section className="mb-8 rounded-lg border border-[var(--color-border)] bg-white p-6">
        <h3 className="mb-4 font-medium">基本信息</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">项目标识</label>
            <input
              type="text"
              value={project.key}
              disabled
              className="w-32 rounded-lg border border-[var(--color-border)] bg-gray-50 px-3 py-2 text-sm text-[var(--color-text-secondary)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">项目名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name !== project.name && updateMutation.mutate({ name })}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => description !== (project.description || '') && updateMutation.mutate({ description: description || undefined })}
              rows={3}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none resize-y"
            />
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="mb-8 rounded-lg border border-[var(--color-border)] bg-white p-6">
        <h3 className="mb-4 font-medium">工作流状态</h3>
        <div className="space-y-2">
          {statuses.map((status) => (
            <div key={status.id} className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] px-4 py-3">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: status.color }} />
              <span className="flex-1 text-sm font-medium">{status.name}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
                {status.category === 'TODO' ? '待办' : status.category === 'IN_PROGRESS' ? '进行中' : '已完成'}
              </span>
              <span className="text-xs text-[var(--color-text-secondary)]">#{status.order}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
          自定义工作流编辑将在后续版本中支持
        </p>
      </section>

      {/* Members */}
      <section className="rounded-lg border border-[var(--color-border)] bg-white p-6">
        <h3 className="mb-4 font-medium">项目成员</h3>
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] px-4 py-3">
              {member.user.avatarUrl ? (
                <img src={member.user.avatarUrl} alt={member.user.name} className="h-8 w-8 rounded-full" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-[var(--color-primary)]">
                  {member.user.name[0]}
                </div>
              )}
              <span className="flex-1 text-sm font-medium">{member.user.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                member.role === 'OWNER' ? 'bg-yellow-100 text-yellow-700' :
                member.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {member.role === 'OWNER' ? '拥有者' : member.role === 'ADMIN' ? '管理员' : '成员'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
