import { useState } from 'react'
import { useParams } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface Commit {
  id: string
  sha: string
  message: string
  author: string
  branch: string | null
  committedAt: string | null
  createdAt: string
  issue: { id: string; key: string; title: string } | null
  repository: { fullPath: string } | null
}

interface DiffFile {
  filename: string
  status: string
  additions: number
  deletions: number
  patch: string
}

export function CommitsPage() {
  const { projectId } = useParams()
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['commits', projectId],
    queryFn: () => api.get<{ data: Commit[] }>(`/projects/${projectId}/commits?limit=100`),
    enabled: !!projectId,
  })

  const [syncMsg, setSyncMsg] = useState('')
  const [syncError, setSyncError] = useState('')
  const syncMutation = useMutation({
    mutationFn: () => api.post<{ data: { synced: number; providers: number; repos: number; errors: string[] } }>(`/projects/${projectId}/sync-commits`),
    onSuccess: (res) => {
      const { synced, providers, repos, errors } = res.data
      if (providers === 0) {
        setSyncMsg('该项目未绑定 Git 平台，请到「设置」页面添加')
        setSyncError('')
      } else if (repos === 0) {
        setSyncMsg('Git 平台已连接但未绑定仓库，请到「设置」页面绑定仓库')
        setSyncError('')
      } else if (synced > 0) {
        setSyncMsg(`已同步 ${synced} 条提交`)
        setSyncError('')
      } else {
        setSyncMsg('')
        setSyncError(errors.length > 0 ? errors.join('\n') : '未获取到提交，可能 Token 无 Contents 读取权限')
      }
      queryClient.invalidateQueries({ queryKey: ['commits', projectId] })
    },
    onError: (e: Error) => { setSyncMsg(''); setSyncError(e.message || '同步失败') },
  })

  const commits = data?.data ?? []

  if (isLoading) return <div className="p-3 md:p-6 text-[var(--color-text-secondary)]">加载中...</div>

  return (
    <div className="p-3 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">提交历史</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--color-text-secondary)]">{commits.length} 条提交</span>
          <button
            onClick={() => { setSyncError(''); syncMutation.mutate() }}
            disabled={syncMutation.isPending}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {syncMutation.isPending ? '同步中...' : '同步提交'}
          </button>
        </div>
      </div>
      {syncError && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-xs text-red-600 whitespace-pre-wrap break-all">{syncError}</p>}
      {syncMsg && <p className="mb-4 rounded bg-blue-50 px-3 py-2 text-xs text-blue-700">{syncMsg}</p>}

      {commits.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-white p-8 text-center text-sm text-[var(--color-text-secondary)]">
          暂无提交记录。绑定 Git 仓库并推送代码后，提交将自动同步到这里。
        </div>
      ) : (
        <div className="space-y-1">
          {commits.map((commit) => (
            <CommitRow
              key={commit.id}
              commit={commit}
              expanded={expandedId === commit.id}
              onToggle={() => setExpandedId(expandedId === commit.id ? null : commit.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CommitRow({ commit, expanded, onToggle }: { commit: Commit; expanded: boolean; onToggle: () => void }) {
  const firstLine = commit.message.split('\n')[0]
  const time = commit.committedAt || commit.createdAt
  const timeStr = time ? formatRelative(time) : ''

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-white">
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <code className="mt-0.5 shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-[var(--color-text-secondary)]">
          {commit.sha.slice(0, 7)}
        </code>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{firstLine}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
            <span>{commit.author}</span>
            {commit.branch && (
              <span className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-blue-700">{commit.branch}</span>
            )}
            {commit.issue && (
              <span className="rounded bg-purple-50 px-1.5 py-0.5 text-purple-700">{commit.issue.key}</span>
            )}
            {commit.repository && (
              <span className="hidden md:inline text-[var(--color-text-secondary)]">{commit.repository.fullPath}</span>
            )}
          </div>
        </div>
        <span className="shrink-0 text-xs text-[var(--color-text-secondary)]">{timeStr}</span>
      </button>

      {expanded && <CommitDiff commitId={commit.id} />}
    </div>
  )
}

function CommitDiff({ commitId }: { commitId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['commit-diff', commitId],
    queryFn: () => api.get<{ data: { sha: string; files: DiffFile[] } }>(`/commits/${commitId}/diff`),
  })

  if (isLoading) return <div className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">加载 diff...</div>
  if (error) return <div className="px-4 py-3 text-xs text-[var(--color-danger)]">加载失败</div>

  const files = data?.data?.files ?? []

  return (
    <div className="border-t border-[var(--color-border)]">
      <div className="px-4 py-2 text-xs text-[var(--color-text-secondary)] bg-gray-50">
        {files.length} 个文件变更
        <span className="ml-2 text-green-600">
          +{files.reduce((s, f) => s + f.additions, 0)}
        </span>
        <span className="ml-1 text-red-600">
          -{files.reduce((s, f) => s + f.deletions, 0)}
        </span>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {files.map((file) => (
          <DiffFileView key={file.filename} file={file} />
        ))}
      </div>
    </div>
  )
}

function DiffFileView({ file }: { file: DiffFile }) {
  const [collapsed, setCollapsed] = useState(false)

  const statusColors: Record<string, string> = {
    added: 'text-green-700 bg-green-50',
    removed: 'text-red-700 bg-red-50',
    modified: 'text-yellow-700 bg-yellow-50',
    renamed: 'text-blue-700 bg-blue-50',
  }

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs hover:bg-gray-50"
      >
        <span className="text-[var(--color-text-secondary)]">{collapsed ? '▶' : '▼'}</span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusColors[file.status] || 'text-gray-700 bg-gray-50'}`}>
          {file.status}
        </span>
        <span className="flex-1 font-mono truncate">{file.filename}</span>
        {file.additions > 0 && <span className="text-green-600">+{file.additions}</span>}
        {file.deletions > 0 && <span className="text-red-600">-{file.deletions}</span>}
      </button>

      {!collapsed && file.patch && (
        <div className="overflow-x-auto bg-gray-900 text-xs leading-5">
          <pre className="px-4 py-2">
            {file.patch.split('\n').map((line, i) => (
              <div
                key={i}
                className={
                  line.startsWith('+') ? 'text-green-400 bg-green-900/30' :
                  line.startsWith('-') ? 'text-red-400 bg-red-900/30' :
                  line.startsWith('@@') ? 'text-cyan-400' :
                  'text-gray-400'
                }
              >
                {line}
              </div>
            ))}
          </pre>
        </div>
      )}
    </div>
  )
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return new Date(iso).toLocaleDateString()
}
