import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface TimeLog {
  id: string
  minutes: number
  description: string | null
  logDate: string
  user: { id: string; name: string }
}

export function TimeLogWidget({ issueId }: { issueId: string }) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [hours, setHours] = useState('')
  const [desc, setDesc] = useState('')

  const { data } = useQuery({
    queryKey: ['timelogs', issueId],
    queryFn: () => api.get<{ data: TimeLog[] }>(`/issues/${issueId}/timelogs`),
  })

  const addMutation = useMutation({
    mutationFn: (input: { minutes: number; description?: string; logDate: string }) =>
      api.post(`/issues/${issueId}/timelogs`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timelogs', issueId] })
      setHours('')
      setDesc('')
      setShowForm(false)
    },
  })

  const logs = data?.data ?? []
  const totalMinutes = logs.reduce((sum, l) => sum + l.minutes, 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const remainingMins = totalMinutes % 60

  function handleSubmit() {
    const mins = Math.round(parseFloat(hours) * 60)
    if (mins > 0) {
      addMutation.mutate({
        minutes: mins,
        description: desc || undefined,
        logDate: new Date().toISOString(),
      })
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--color-text)]">
          工时 ({totalHours}h {remainingMins > 0 ? `${remainingMins}m` : ''})
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-[var(--color-primary)] hover:underline"
        >
          {showForm ? '取消' : '+ 记录'}
        </button>
      </div>

      {showForm && (
        <div className="mb-3 flex gap-2">
          <input
            type="number"
            step="0.5"
            min="0.5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="小时"
            className="w-20 rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
          />
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="描述（可选）"
            className="flex-1 rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
          />
          <button
            onClick={handleSubmit}
            disabled={!hours || addMutation.isPending}
            className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            记录
          </button>
        </div>
      )}

      {logs.length > 0 && (
        <div className="space-y-1">
          {logs.slice(0, 5).map((log) => (
            <div key={log.id} className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
              <span className="font-medium text-[var(--color-text)]">{log.user.name}</span>
              <span>{Math.floor(log.minutes / 60)}h{log.minutes % 60 > 0 ? ` ${log.minutes % 60}m` : ''}</span>
              {log.description && <span className="truncate">— {log.description}</span>}
              <span className="ml-auto">{new Date(log.logDate).toLocaleDateString('zh-CN')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
