import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useProjectStore } from '@/stores/projectStore'
import { KanbanBoard } from '@/components/board/KanbanBoard'
import { BoardFilters, type BoardFilter } from '@/components/board/BoardFilters'
import type { Project } from '@agilix/shared'

export function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject)
  const [filter, setFilter] = useState<BoardFilter>({ type: '', priority: '', search: '' })

  const { data: projectData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get<{ data: Project }>(`/projects/${projectId}`),
    enabled: !!projectId,
  })

  useEffect(() => {
    if (projectData?.data) setCurrentProject(projectData.data)
    return () => setCurrentProject(null)
  }, [projectData, setCurrentProject])

  const { data: boardData, isLoading } = useQuery({
    queryKey: ['board', projectId],
    queryFn: () => api.get<{ data: BoardResponse }>(`/projects/${projectId}/board`),
    enabled: !!projectId,
  })

  const filteredBoard = useMemo(() => {
    if (!boardData?.data) return null
    const hasFilter = filter.type || filter.priority || filter.search
    if (!hasFilter) return boardData.data

    return {
      ...boardData.data,
      columns: boardData.data.columns.map((col) => ({
        ...col,
        issues: col.issues.filter((issue) => {
          if (filter.type && issue.type !== filter.type) return false
          if (filter.priority && issue.priority !== filter.priority) return false
          if (filter.search && !issue.title.toLowerCase().includes(filter.search.toLowerCase()) && !issue.key.toLowerCase().includes(filter.search.toLowerCase())) return false
          return true
        }),
      })),
    }
  }, [boardData, filter])

  if (isLoading) {
    return <div className="text-[var(--color-text-secondary)]">加载看板...</div>
  }

  if (!filteredBoard) {
    return <div className="text-[var(--color-text-secondary)]">看板未找到</div>
  }

  return (
    <div>
      <BoardFilters filter={filter} onChange={setFilter} />
      <KanbanBoard board={filteredBoard} />
    </div>
  )
}

interface BoardResponse {
  id: string
  name: string
  columns: Array<{
    id: string
    statusId: string
    order: number
    wipLimit: number | null
    issues: Array<{
      id: string
      key: string
      title: string
      type: string
      priority: string
      columnOrder: number
      status: { id: string; name: string; category: string; color: string }
      labels: Array<{ label: { id: string; name: string; color: string } }>
    }>
  }>
}
