import { useProjectStore } from '@/stores/projectStore'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'

export function Header() {
  const project = useProjectStore((s) => s.currentProject)
  const user = useAuthStore((s) => s.user)
  const openSearch = useUIStore((s) => s.openSearch)
  const openQuickCreate = useUIStore((s) => s.openQuickCreate)
  const setMobileSidebar = useUIStore((s) => s.setMobileSidebar)

  return (
    <header className="flex h-12 md:h-14 items-center justify-between border-b border-[var(--color-border)] bg-white px-3 md:px-6">
      <div className="flex items-center gap-2">
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileSidebar(true)}
          className="rounded p-1.5 text-[var(--color-text-secondary)] hover:bg-gray-100 md:hidden"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {project && (
          <>
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
              {project.key}
            </span>
            <h1 className="hidden text-sm font-medium text-[var(--color-text)] sm:block">{project.name}</h1>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <button
          onClick={openSearch}
          className="flex items-center gap-1 md:gap-2 rounded-lg border border-[var(--color-border)] px-2 md:px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-text)] transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span className="hidden sm:inline">搜索</span>
          <kbd className="hidden rounded bg-gray-100 px-1 py-0.5 text-[10px] sm:inline">/</kbd>
        </button>

        <button
          onClick={openQuickCreate}
          className="flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-2 md:px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          <span className="text-base leading-none">+</span>
          <span className="hidden sm:inline">新建</span>
        </button>

        {user && (
          <div className="hidden items-center gap-2 sm:flex">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="h-7 w-7 rounded-full" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-[var(--color-primary)]">
                {user.name[0]}
              </div>
            )}
            <span className="hidden text-sm text-[var(--color-text-secondary)] md:block">{user.name}</span>
          </div>
        )}
      </div>
    </header>
  )
}
