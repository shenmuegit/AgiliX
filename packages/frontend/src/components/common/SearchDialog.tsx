import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useUIStore } from '@/stores/uiStore'
import { ISSUE_TYPE_CONFIG, PRIORITY_CONFIG, type IssueType, type Priority } from '@agilix/shared'

interface SearchResult {
  id: string
  key: string
  title: string
  type: string
  priority: string
  status: { name: string; color: string }
}

export function SearchDialog() {
  const open = useUIStore((s) => s.searchOpen)
  const closeSearch = useUIStore((s) => s.closeSearch)
  const openIssueDrawer = useUIStore((s) => s.openIssueDrawer)
  const { projectId } = useParams()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data } = useQuery({
    queryKey: ['search', projectId, query],
    queryFn: () => api.get<{ data: SearchResult[] }>(`/projects/${projectId}/search?q=${encodeURIComponent(query)}`),
    enabled: open && !!projectId && query.length >= 1,
  })

  const results = data?.data ?? []

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      openIssueDrawer(results[selectedIndex].id)
      closeSearch()
    } else if (e.key === 'Escape') {
      closeSearch()
    }
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" onClick={closeSearch} />
      <div className="fixed inset-x-3 top-[10%] z-50 mx-auto max-w-[560px] rounded-xl border border-[var(--color-border)] bg-white shadow-2xl sm:inset-x-auto sm:left-1/2 sm:top-[20%] sm:-translate-x-1/2">
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
          <svg className="h-5 w-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索 Issue (输入标题或编号)..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--color-text-secondary)]"
          />
          <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-[var(--color-text-secondary)]">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {query.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">
              输入关键词搜索 Issue
              <div className="mt-2 flex items-center justify-center gap-4 text-xs">
                <span><kbd className="rounded bg-gray-100 px-1 py-0.5">/</kbd> 打开搜索</span>
                <span><kbd className="rounded bg-gray-100 px-1 py-0.5">N</kbd> 新建 Issue</span>
                <span><kbd className="rounded bg-gray-100 px-1 py-0.5">Ctrl+K</kbd> 搜索</span>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">
              未找到匹配的 Issue
            </div>
          ) : (
            results.map((result, idx) => (
              <div
                key={result.id}
                className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
                  idx === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => {
                  openIssueDrawer(result.id)
                  closeSearch()
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <span className="text-xs font-medium" style={{ color: ISSUE_TYPE_CONFIG[result.type as IssueType]?.color }}>
                  {ISSUE_TYPE_CONFIG[result.type as IssueType]?.label}
                </span>
                <span className="w-20 text-xs text-[var(--color-text-secondary)]">{result.key}</span>
                <span className="flex-1 truncate text-sm">{result.title}</span>
                <span className="text-xs" style={{ color: PRIORITY_CONFIG[result.priority as Priority]?.color }}>
                  {PRIORITY_CONFIG[result.priority as Priority]?.label}
                </span>
                <span className="rounded px-1.5 py-0.5 text-[10px] text-white" style={{ backgroundColor: result.status.color }}>
                  {result.status.name}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
