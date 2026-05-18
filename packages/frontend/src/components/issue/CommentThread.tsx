import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface Comment {
  id: string
  content: string
  createdAt: string
  author: { id: string; name: string; avatarUrl: string | null }
}

export function CommentThread({ issueId }: { issueId: string }) {
  const queryClient = useQueryClient()
  const [newComment, setNewComment] = useState('')

  const { data } = useQuery({
    queryKey: ['comments', issueId],
    queryFn: () => api.get<{ data: Comment[] }>(`/issues/${issueId}/comments`),
  })

  const addMutation = useMutation({
    mutationFn: (content: string) =>
      api.post(`/issues/${issueId}/comments`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', issueId] })
      setNewComment('')
    },
  })

  const comments = data?.data ?? []

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-[var(--color-text)]">
        评论 ({comments.length})
      </h3>

      <div className="space-y-3 mb-4">
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-lg border border-[var(--color-border)] p-3">
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-medium text-[var(--color-primary)]">
                {comment.author.name[0]}
              </div>
              <span className="text-xs font-medium text-[var(--color-text)]">{comment.author.name}</span>
              <span className="text-[10px] text-[var(--color-text-secondary)]">
                {new Date(comment.createdAt).toLocaleString('zh-CN')}
              </span>
            </div>
            <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">{comment.content}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="添加评论..."
          rows={2}
          className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none resize-none"
        />
        <button
          onClick={() => newComment.trim() && addMutation.mutate(newComment.trim())}
          disabled={!newComment.trim() || addMutation.isPending}
          className="self-end rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          发送
        </button>
      </div>
    </div>
  )
}
