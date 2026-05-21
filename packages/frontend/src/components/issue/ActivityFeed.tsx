import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface Activity {
  id: string
  action: string
  detail: string | null
  createdAt: string
  user: { id: string; name: string } | null
}

const ACTION_LABELS: Record<string, string> = {
  created: '创建了此 Issue',
  updated: '更新了字段',
  status_changed: '变更了状态',
  logged_time: '记录了工时',
  branch_created: '创建了分支',
  mr_opened: 'MR 已打开',
  mr_merged: 'MR 已合并',
  mr_closed: 'MR 已关闭',
  pr_opened: 'PR 已打开',
  pr_merged: 'PR 已合并',
  pr_closed: 'PR 已关闭',
}

export function ActivityFeed({ issueId }: { issueId: string }) {
  const { data } = useQuery({
    queryKey: ['activity', issueId],
    queryFn: () => api.get<{ data: Activity[] }>(`/issues/${issueId}/activity`),
  })

  const activities = data?.data ?? []

  if (activities.length === 0) return null

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-[var(--color-text)]">
        活动记录
      </h3>
      <div className="space-y-2">
        {activities.map((activity) => {
          let detail: Record<string, any> = {}
          try { detail = activity.detail ? JSON.parse(activity.detail) : {} } catch {}

          return (
            <div key={activity.id} className="flex gap-2 text-xs">
              <div className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-300" />
              <div className="flex-1">
                <span className="font-medium text-[var(--color-text)]">
                  {activity.user?.name || '系统'}
                </span>
                <span className="text-[var(--color-text-secondary)]">
                  {' '}{ACTION_LABELS[activity.action] || activity.action}
                </span>
                {detail.name && (
                  <span className="ml-1 rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px]">
                    {detail.name}
                  </span>
                )}
                {detail.title && (
                  <span className="ml-1 text-[var(--color-text-secondary)]">
                    — {detail.title}
                  </span>
                )}
                {detail.minutes && (
                  <span className="ml-1 text-[var(--color-text-secondary)]">
                    {Math.floor(detail.minutes / 60)}h{detail.minutes % 60 > 0 ? ` ${detail.minutes % 60}m` : ''}
                  </span>
                )}
                <span className="ml-2 text-[var(--color-text-secondary)]">
                  {new Date(activity.createdAt).toLocaleString('zh-CN')}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
