import { useEffect } from 'react'
import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useProjectStore } from '@/stores/projectStore'
import { KanbanBoard } from '@/components/board/KanbanBoard'
import type { Project } from '@agilix/shared'

export function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject)

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

  if (isLoading) {
    return <div className="text-[var(--color-text-secondary)]">加载看板...</div>
  }

  if (!boardData?.data) {
    return <div className="text-[var(--color-text-secondary)]">看板未找到</div>
  }

  return <KanbanBoard board={boardData.data} />
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
      storyPoints: number | null
      columnOrder: number
      status: { id: string; name: string; category: string; color: string }
      assignee: { id: string; name: string; avatarUrl: string | null } | null
      labels: Array<{ label: { id: string; name: string; color: string } }>
    }>
  }>
}
