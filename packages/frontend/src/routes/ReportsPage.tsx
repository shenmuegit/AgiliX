import { useState } from 'react'
import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { api } from '@/lib/api'
import type { Sprint, SprintSnapshot } from '@agilix/shared'

export function ReportsPage() {
  const { projectId } = useParams()
  const [tab, setTab] = useState<'burndown' | 'velocity'>('burndown')

  const { data: sprintsData } = useQuery({
    queryKey: ['sprints', projectId],
    queryFn: () => api.get<{ data: Sprint[] }>(`/projects/${projectId}/sprints`),
    enabled: !!projectId,
  })

  const sprints = sprintsData?.data ?? []
  const activeSprint = sprints.find((s) => s.status === 'ACTIVE')
  const completedSprints = sprints.filter((s) => s.status === 'COMPLETED')
  const [selectedSprintId, setSelectedSprintId] = useState('')

  const burndownSprintId = selectedSprintId || activeSprint?.id
  const { data: burndownData } = useQuery({
    queryKey: ['burndown', burndownSprintId],
    queryFn: () => api.get<{ data: SprintSnapshot[] }>(`/sprints/${burndownSprintId}/burndown`),
    enabled: !!burndownSprintId,
  })

  const snapshots = burndownData?.data ?? []

  const velocityData = completedSprints.map((s) => ({
    name: s.name,
    totalPoints: s.totalPoints ?? 0,
    completedPoints: s.completedPoints ?? 0,
  }))

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold">报表</h2>
        <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
          <button
            onClick={() => setTab('burndown')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'burndown' ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-[var(--color-text-secondary)] hover:bg-gray-50'
            }`}
          >
            燃尽图
          </button>
          <button
            onClick={() => setTab('velocity')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'velocity' ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-[var(--color-text-secondary)] hover:bg-gray-50'
            }`}
          >
            速度图
          </button>
        </div>
      </div>

      {tab === 'burndown' && (
        <div className="rounded-lg border border-[var(--color-border)] bg-white p-3 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">Sprint 燃尽图</h3>
            <select
              value={burndownSprintId ?? ''}
              onChange={(e) => setSelectedSprintId(e.target.value)}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
            >
              {sprints.filter((s) => s.status !== 'PLANNED').map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.status === 'ACTIVE' ? '(进行中)' : ''}
                </option>
              ))}
            </select>
          </div>

          {snapshots.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-[var(--color-text-secondary)]">
              暂无燃尽数据。Sprint 启动后，每日快照会自动生成。
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={snapshots}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="remainingPoints"
                  name="剩余 SP"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="completedPoints"
                  name="已完成 SP"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {tab === 'velocity' && (
        <div className="rounded-lg border border-[var(--color-border)] bg-white p-6">
          <h3 className="mb-4 font-medium">团队速度图</h3>
          {velocityData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-[var(--color-text-secondary)]">
              暂无速度数据。完成至少一个 Sprint 后显示。
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completedPoints" name="已完成 SP" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalPoints" name="计划 SP" fill="#93C5FD" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  )
}
