import { useState, useEffect } from 'react'
import { useParams } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Project, GitPlatform } from '@agilix/shared'

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

      {/* Workflow Editor */}
      <WorkflowEditor projectId={projectId!} workflowStatuses={statuses} />

      {/* Members */}
      <section className="mb-8 rounded-lg border border-[var(--color-border)] bg-white p-6">
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

      {/* Feishu Group */}
      <FeishuGroupSection projectId={projectId!} currentGroupId={project.feishuGroupId} />

      {/* Git Integration */}
      <GitProviderSection projectId={projectId!} />
    </div>
  )
}

// ──────────────── Workflow Editor ────────────────

const CATEGORY_OPTIONS = [
  { value: 'TODO', label: '待办', color: 'bg-gray-100 text-gray-700' },
  { value: 'IN_PROGRESS', label: '进行中', color: 'bg-blue-100 text-blue-700' },
  { value: 'DONE', label: '已完成', color: 'bg-green-100 text-green-700' },
]

const PRESET_COLORS = ['#6B7280', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6']

function WorkflowEditor({ projectId, workflowStatuses }: { projectId: string; workflowStatuses: Array<{ id: string; name: string; category: string; order: number; color: string }> }) {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<'TODO' | 'IN_PROGRESS' | 'DONE'>('IN_PROGRESS')
  const [newColor, setNewColor] = useState('#3B82F6')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['project', projectId] })

  const addMutation = useMutation({
    mutationFn: (input: { name: string; category: string; color: string }) =>
      api.post(`/projects/${projectId}/workflow-statuses`, input),
    onSuccess: () => { invalidate(); setShowAdd(false); setNewName('') },
  })

  const updateMutation = useMutation({
    mutationFn: ({ statusId, ...input }: { statusId: string; name?: string; category?: string; color?: string }) =>
      api.patch(`/projects/${projectId}/workflow-statuses/${statusId}`, input),
    onSuccess: () => { invalidate(); setEditingId(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: (statusId: string) => api.delete(`/projects/${projectId}/workflow-statuses/${statusId}`),
    onSuccess: invalidate,
  })

  const reorderMutation = useMutation({
    mutationFn: (statuses: Array<{ id: string; order: number }>) =>
      api.put(`/projects/${projectId}/workflow-statuses/reorder`, { statuses }),
    onSuccess: invalidate,
  })

  function moveStatus(index: number, direction: -1 | 1) {
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= workflowStatuses.length) return
    const reordered = workflowStatuses.map((s, i) => {
      if (i === index) return { id: s.id, order: workflowStatuses[swapIndex].order }
      if (i === swapIndex) return { id: s.id, order: workflowStatuses[index].order }
      return { id: s.id, order: s.order }
    })
    reorderMutation.mutate(reordered)
  }

  return (
    <section className="mb-8 rounded-lg border border-[var(--color-border)] bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium">工作流状态</h3>
        <button
          onClick={() => setShowAdd(true)}
          className="text-xs text-[var(--color-primary)] hover:underline"
        >
          + 添加状态
        </button>
      </div>

      <div className="space-y-2">
        {workflowStatuses.map((status, idx) => (
          <div key={status.id} className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] px-4 py-3">
            <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />

            {editingId === status.id ? (
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => {
                  if (editName.trim() && editName !== status.name) {
                    updateMutation.mutate({ statusId: status.id, name: editName.trim() })
                  } else {
                    setEditingId(null)
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  if (e.key === 'Escape') setEditingId(null)
                }}
                className="flex-1 rounded border border-[var(--color-primary)] px-2 py-0.5 text-sm outline-none"
              />
            ) : (
              <span
                className="flex-1 text-sm font-medium cursor-pointer hover:text-[var(--color-primary)]"
                onClick={() => { setEditingId(status.id); setEditName(status.name) }}
              >
                {status.name}
              </span>
            )}

            <select
              value={status.category}
              onChange={(e) => updateMutation.mutate({ statusId: status.id, category: e.target.value as any })}
              className="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs focus:outline-none"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            <div className="flex items-center gap-1">
              <button
                onClick={() => moveStatus(idx, -1)}
                disabled={idx === 0}
                className="rounded p-1 text-xs text-[var(--color-text-secondary)] hover:bg-gray-100 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                onClick={() => moveStatus(idx, 1)}
                disabled={idx === workflowStatuses.length - 1}
                className="rounded p-1 text-xs text-[var(--color-text-secondary)] hover:bg-gray-100 disabled:opacity-30"
              >
                ↓
              </button>
            </div>

            <input
              type="color"
              value={status.color}
              onChange={(e) => updateMutation.mutate({ statusId: status.id, color: e.target.value })}
              className="h-6 w-6 cursor-pointer rounded border-0 p-0"
            />

            <button
              onClick={() => {
                if (confirm(`确定删除状态 "${status.name}"？`)) deleteMutation.mutate(status.id)
              }}
              className="rounded p-1 text-xs text-[var(--color-danger)] hover:bg-red-50"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="mt-3 rounded-lg border border-[var(--color-primary)] bg-blue-50/30 p-4">
          <div className="space-y-3">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="状态名称"
              className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
            />
            <div className="flex gap-3">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`h-6 w-6 rounded-full border-2 transition-all ${newColor === c ? 'border-[var(--color-primary)] scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => newName.trim() && addMutation.mutate({ name: newName.trim(), category: newCategory, color: newColor })}
                disabled={!newName.trim() || addMutation.isPending}
                className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                添加
              </button>
              <button onClick={() => setShowAdd(false)} className="text-sm text-[var(--color-text-secondary)]">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// ──────────────── Feishu Group ────────────────

function FeishuGroupSection({ projectId, currentGroupId }: { projectId: string; currentGroupId: string | null }) {
  const queryClient = useQueryClient()
  const [groupId, setGroupId] = useState(currentGroupId || '')

  useEffect(() => { setGroupId(currentGroupId || '') }, [currentGroupId])

  const updateMutation = useMutation({
    mutationFn: (feishuGroupId: string | null) =>
      api.patch(`/projects/${projectId}/feishu-group`, { feishuGroupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
  })

  return (
    <section className="mb-8 rounded-lg border border-[var(--color-border)] bg-white p-6">
      <h3 className="mb-4 font-medium">飞书群关联</h3>
      <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
        关联飞书群后，Bot 通知（任务分配、状态变更、Sprint 启动等）将自动发送到该群。
      </p>
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          placeholder="飞书群 Chat ID"
          className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
        />
        <button
          onClick={() => updateMutation.mutate(groupId.trim() || null)}
          disabled={updateMutation.isPending}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {currentGroupId ? '更新' : '关联'}
        </button>
        {currentGroupId && (
          <button
            onClick={() => { setGroupId(''); updateMutation.mutate(null) }}
            className="text-xs text-[var(--color-danger)] hover:underline"
          >
            解除关联
          </button>
        )}
      </div>
      {currentGroupId && (
        <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          已关联群: {currentGroupId}
        </div>
      )}
    </section>
  )
}

// ──────────────── Git Provider ────────────────

function GitProviderSection({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [gitForm, setGitForm] = useState({ type: 'GITHUB' as GitPlatform, baseUrl: '', accessToken: '' })

  const { data } = useQuery({
    queryKey: ['git-providers', projectId],
    queryFn: () => api.get<{ data: Array<{ id: string; type: string; baseUrl: string; repositories: Array<{ id: string; name: string; fullPath: string }> }> }>(`/projects/${projectId}/git-providers`),
  })

  const addMutation = useMutation({
    mutationFn: (input: { type: GitPlatform; baseUrl: string; accessToken: string }) =>
      api.post(`/projects/${projectId}/git-providers`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git-providers', projectId] })
      setShowForm(false)
      setGitForm({ type: 'GITHUB', baseUrl: '', accessToken: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/git-providers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['git-providers', projectId] }),
  })

  const providers = data?.data ?? []
  const hasBoundRepo = providers.some(p => p.repositories.length > 0)

  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium">Git 集成</h3>
        {!hasBoundRepo && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            + 添加平台
          </button>
        )}
      </div>

      {showForm && !hasBoundRepo && (
        <div className="mb-4 rounded-lg border border-[var(--color-border)] p-4">
          <div className="space-y-3">
            <select
              value={gitForm.type}
              onChange={(e) => setGitForm({ ...gitForm, type: e.target.value as GitPlatform })}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            >
              <option value="GITHUB">GitHub</option>
              <option value="GITLAB">GitLab</option>
            </select>
            <input
              type="text"
              value={gitForm.baseUrl}
              onChange={(e) => setGitForm({ ...gitForm, baseUrl: e.target.value })}
              placeholder={gitForm.type === 'GITHUB' ? 'https://api.github.com' : 'https://gitlab.com'}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
            />
            <input
              type="text"
              autoComplete="off"
              value={gitForm.accessToken}
              onChange={(e) => setGitForm({ ...gitForm, accessToken: e.target.value })}
              placeholder="Access Token"
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => addMutation.mutate(gitForm)}
                disabled={!gitForm.baseUrl || !gitForm.accessToken || addMutation.isPending}
                className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                连接
              </button>
              <button onClick={() => setShowForm(false)} className="text-sm text-[var(--color-text-secondary)]">
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {providers.length === 0 && !showForm ? (
        <p className="text-sm text-[var(--color-text-secondary)]">
          尚未连接 Git 平台。连接后 Issue 将双向同步，MR/PR 自动关联。
        </p>
      ) : (
        <div className="space-y-3">
          {providers.map((p) => (
            <GitProviderCard key={p.id} provider={p} onDelete={() => deleteMutation.mutate(p.id)} />
          ))}
        </div>
      )}

      <div className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-[var(--color-text-secondary)]">
        <p className="font-medium mb-1 text-[var(--color-text)]">Webhook 配置（Issue 双向同步）</p>
        <p className="mb-1">在 Git 仓库 Settings → Webhooks 中添加以下地址，勾选 <strong>Issues</strong>、<strong>Merge requests/Pull requests</strong>、<strong>Push</strong> 事件：</p>
        <p>GitHub: <code className="bg-white px-1.5 py-0.5 rounded select-all">{location.origin}/api/git/webhook/github</code></p>
        <p>GitLab: <code className="bg-white px-1.5 py-0.5 rounded select-all">{location.origin}/api/git/webhook/gitlab</code></p>
      </div>
    </section>
  )
}

function GitProviderCard({ provider, onDelete }: {
  provider: { id: string; type: string; baseUrl: string; repositories: Array<{ id: string; name: string; fullPath: string }> }
  onDelete: () => void
}) {
  const queryClient = useQueryClient()
  const [repoPath, setRepoPath] = useState('')
  const [newToken, setNewToken] = useState('')
  const [showTokenUpdate, setShowTokenUpdate] = useState(false)

  const [error, setError] = useState('')
  const addRepoMutation = useMutation({
    mutationFn: (fullPath: string) =>
      api.post(`/git-providers/${provider.id}/repos`, { fullPath }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git-providers'] })
      setRepoPath('')
      setError('')
    },
    onError: (e: Error) => setError(e.message || '绑定失败'),
  })

  const updateTokenMutation = useMutation({
    mutationFn: (accessToken: string) =>
      api.patch(`/git-providers/${provider.id}`, { accessToken }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git-providers'] })
      setNewToken('')
      setShowTokenUpdate(false)
      setError('')
    },
    onError: (e: Error) => setError(e.message || '更新失败'),
  })

  return (
    <div className="rounded-lg border border-[var(--color-border)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${
            provider.type === 'GITHUB' ? 'bg-gray-900 text-white' : 'bg-orange-500 text-white'
          }`}>
            {provider.type === 'GITHUB' ? 'GitHub' : 'GitLab'}
          </span>
          <span className="text-sm text-[var(--color-text-secondary)]">{provider.baseUrl}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowTokenUpdate(!showTokenUpdate)} className="text-xs text-[var(--color-primary)] hover:underline">
            更新 Token
          </button>
          <button onClick={onDelete} className="text-xs text-[var(--color-danger)] hover:underline">
            断开
          </button>
        </div>
      </div>

      {showTokenUpdate && (
        <div className="mb-3 flex items-center gap-2">
          <input
            type="text"
            autoComplete="off"
            value={newToken}
            onChange={(e) => setNewToken(e.target.value)}
            placeholder="粘贴新的 Access Token"
            className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
          />
          <button
            onClick={() => newToken.trim() && updateTokenMutation.mutate(newToken.trim())}
            disabled={!newToken.trim() || updateTokenMutation.isPending}
            className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {updateTokenMutation.isPending ? '更新中...' : '保存'}
          </button>
        </div>
      )}

      {provider.repositories.length > 0 && (
        <div className="mb-3 space-y-1">
          {provider.repositories.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded bg-gray-50 px-3 py-1.5 text-xs font-mono text-[var(--color-text-secondary)]">
              <span className="flex-1">{r.fullPath}</span>
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700">已绑定</span>
            </div>
          ))}
        </div>
      )}

      {provider.repositories.length === 0 && (
        <>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder={provider.type === 'GITHUB' ? 'owner/repo' : 'group/project'}
              className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
            />
            <button
              onClick={() => repoPath.trim() && addRepoMutation.mutate(repoPath.trim())}
              disabled={!repoPath.trim() || addRepoMutation.isPending}
              className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {addRepoMutation.isPending ? '绑定中...' : '绑定仓库'}
            </button>
          </div>
        </>
      )}
      {error && <p className="mt-2 text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  )
}
