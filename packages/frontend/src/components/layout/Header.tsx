import { useProjectStore } from '@/stores/projectStore'
import { useAuthStore } from '@/stores/authStore'

export function Header() {
  const project = useProjectStore((s) => s.currentProject)
  const user = useAuthStore((s) => s.user)

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-white px-6">
      <div className="flex items-center gap-2">
        {project && (
          <>
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
              {project.key}
            </span>
            <h1 className="text-sm font-medium text-[var(--color-text)]">{project.name}</h1>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="h-7 w-7 rounded-full" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-[var(--color-primary)]">
                {user.name[0]}
              </div>
            )}
            <span className="text-sm text-[var(--color-text-secondary)]">{user.name}</span>
          </div>
        )}
      </div>
    </header>
  )
}
