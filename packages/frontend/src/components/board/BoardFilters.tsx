import { ISSUE_TYPE_CONFIG, PRIORITY_CONFIG, type IssueType, type Priority } from '@agilix/shared'

export interface BoardFilter {
  type: IssueType | ''
  priority: Priority | ''
  search: string
}

interface Props {
  filter: BoardFilter
  onChange: (filter: BoardFilter) => void
}

export function BoardFilters({ filter, onChange }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <input
        type="text"
        value={filter.search}
        onChange={(e) => onChange({ ...filter, search: e.target.value })}
        placeholder="搜索 Issue..."
        className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none w-48"
      />

      <select
        value={filter.type}
        onChange={(e) => onChange({ ...filter, type: e.target.value as IssueType | '' })}
        className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
      >
        <option value="">所有类型</option>
        {Object.entries(ISSUE_TYPE_CONFIG).map(([key, cfg]) => (
          <option key={key} value={key}>{cfg.label}</option>
        ))}
      </select>

      <select
        value={filter.priority}
        onChange={(e) => onChange({ ...filter, priority: e.target.value as Priority | '' })}
        className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
      >
        <option value="">所有优先级</option>
        {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
          <option key={key} value={key}>{cfg.label}</option>
        ))}
      </select>

      {(filter.type || filter.priority || filter.search) && (
        <button
          onClick={() => onChange({ type: '', priority: '', search: '' })}
          className="rounded-lg px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-gray-100"
        >
          清除筛选
        </button>
      )}
    </div>
  )
}
