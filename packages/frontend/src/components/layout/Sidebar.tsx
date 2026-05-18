import { NavLink, useParams } from 'react-router'
import { useUIStore } from '@/stores/uiStore'
import { NAV_ITEMS } from '@/lib/constants'

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const { projectId } = useParams()

  return (
    <aside
      className="fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-[var(--color-border)] bg-white transition-all duration-200"
      style={{ width: collapsed ? 64 : 240 }}
    >
      <div className="flex h-14 items-center justify-between px-4">
        {!collapsed && <span className="text-lg font-bold text-[var(--color-primary)]">AgiliX</span>}
        <button
          onClick={toggleSidebar}
          className="rounded p-1.5 text-[var(--color-text-secondary)] hover:bg-gray-100"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-blue-50 text-[var(--color-primary)] font-medium'
                : 'text-[var(--color-text-secondary)] hover:bg-gray-50'
            }`
          }
        >
          {!collapsed && '项目列表'}
        </NavLink>

        {projectId && (
          <>
            <div className="my-3 border-t border-[var(--color-border)]" />
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={`/projects/${projectId}/${item.path}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-[var(--color-primary)] font-medium'
                      : 'text-[var(--color-text-secondary)] hover:bg-gray-50'
                  }`
                }
              >
                {!collapsed && item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>
    </aside>
  )
}
