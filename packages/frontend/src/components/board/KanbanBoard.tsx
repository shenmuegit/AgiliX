import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { api } from '@/lib/api'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'

interface BoardProps {
  board: {
    id: string
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
        status: { name: string; color: string }
        assignee: { id: string; name: string; avatarUrl: string | null } | null
        labels: Array<{ label: { id: string; name: string; color: string } }>
      }>
    }>
  }
}

export function KanbanBoard({ board }: BoardProps) {
  const { projectId } = useParams()
  const queryClient = useQueryClient()
  const [activeCard, setActiveCard] = useState<BoardProps['board']['columns'][0]['issues'][0] | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const moveMutation = useMutation({
    mutationFn: (params: { issueId: string; boardColumnId: string; columnOrder: number }) =>
      api.patch(`/issues/${params.issueId}/move`, {
        boardColumnId: params.boardColumnId,
        columnOrder: params.columnOrder,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['board', projectId] }),
  })

  function handleDragStart(event: DragStartEvent) {
    const issue = board.columns
      .flatMap((c) => c.issues)
      .find((i) => i.id === event.active.id)
    setActiveCard(issue ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null)
    const { active, over } = event
    if (!over) return

    const targetColumnId = String(over.id)
    const column = board.columns.find((c) => c.id === targetColumnId)
    if (!column) return

    moveMutation.mutate({
      issueId: String(active.id),
      boardColumnId: targetColumnId,
      columnOrder: column.issues.length,
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 140px)' }}>
        {board.columns.map((column) => (
          <KanbanColumn key={column.id} column={column} />
        ))}
      </div>
      <DragOverlay>
        {activeCard ? <KanbanCard issue={activeCard} isDragOverlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}
