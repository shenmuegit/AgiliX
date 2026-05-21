import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Project } from '@agilix/shared'

export function ProjectListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ key: '', name: '', description: '', gitType: 'GITHUB' as 'GITHUB' | 'GITLAB', repoPath: '', accessToken: '' })
  const [createError, setCreateError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<{ data: Project[] }>('/projects'),
    retry: 1,
  })

  const createMutation = useMutation({
    mutationFn: async (input: typeof form) => {
      const project = await api.post<{ data: Project }>('/projects', {
        key: input.key,
        name: input.name,
        description: input.description || undefined,
      })

      if (input.repoPath.trim() && input.accessToken.trim()) {
        const baseUrl = input.gitType === 'GITHUB' ? 'https://api.github.com' : 'https://gitlab.com'
        const provider = await api.post<{ data: { id: string } }>(`/projects/${project.data.id}/git-providers`, {
          type: input.gitType,
          baseUrl,
          accessToken: input.accessToken.trim(),
        })
        await api.post(`/git-providers/${provider.data.id}/repos`, {
          fullPath: input.repoPath.trim(),
        }).catch(() => {})
      }

      return project
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setShowCreate(false)
      setCreateError('')
      setForm({ key: '', name: '', description: '', gitType: 'GITHUB', repoPath: '', accessToken: '' })
      navigate(`/projects/${res.data.id}/board`)
    },
    onError: (e: Error) => setCreateError(e.message || '创建失败'),
  })

  const projects = data?.data ?? []

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">项目</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          创建项目
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 rounded-lg border border-[var(--color-border)] bg-white p-6">
          <h2 className="mb-4 text-lg font-medium">新建项目</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-32">
                <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">项目标识</label>
                <input
                  type="text"
                  placeholder="AGX"
                  value={form.key}
                  onChange={(e) => setForm({ ...form, key: e.target.value.toUpperCase() })}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">项目名称</label>
                <input
                  type="text"
                  placeholder="My Project"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">描述（可选）</label>
              <textarea
                placeholder="项目描述..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
                rows={2}
              />
            </div>

            <div className="border-t border-[var(--color-border)] pt-4">
              <h3 className="mb-3 text-sm font-medium text-[var(--color-text-secondary)]">Git 仓库（可选）</h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <select
                    value={form.gitType}
                    onChange={(e) => setForm({ ...form, gitType: e.target.value as 'GITHUB' | 'GITLAB' })}
                    className="w-32 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                  >
                    <option value="GITHUB">GitHub</option>
                    <option value="GITLAB">GitLab</option>
                  </select>
                  <input
                    type="text"
                    placeholder="owner/repo"
                    value={form.repoPath}
                    onChange={(e) => setForm({ ...form, repoPath: e.target.value })}
                    className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
                  />
                </div>
                {form.repoPath && (
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Personal Access Token"
                    value={form.accessToken}
                    onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
                  />
                )}
              </div>
            </div>

            {createError && <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{createError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setCreateError(''); createMutation.mutate(form) }}
                disabled={!form.key || !form.name || createMutation.isPending}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending ? '创建中...' : '创建'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-[var(--color-text-secondary)]">加载中...</div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-12 text-center">
          <p className="text-[var(--color-text-secondary)]">还没有项目，点击上方按钮创建第一个项目</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}/board`)}
              className="rounded-lg border border-[var(--color-border)] bg-white p-5 text-left transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                  {project.key}
                </span>
                <h3 className="font-medium text-[var(--color-text)]">{project.name}</h3>
              </div>
              {project.description && (
                <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">
                  {project.description}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
