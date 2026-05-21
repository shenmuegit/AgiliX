import { NavLink, useParams } from 'react-router'
import { useUIStore } from '@/stores/uiStore'
import { NAV_ITEMS } from '@/lib/constants'

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const mobileSidebarOpen = useUIStore((s) => s.mobileSidebarOpen)
  const setMobileSidebar = useUIStore((s) => s.setMobileSidebar)
  const { projectId } = useParams()

  const navContent = (
    <>
      <NavLink
        to="/"
        end
        onClick={() => setMobileSidebar(false)}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
            isActive
              ? 'bg-blue-50 text-[var(--color-primary)] font-medium'
              : 'text-[var(--color-text-secondary)] hover:bg-gray-50'
          }`
        }
      >
        项目列表
      </NavLink>

      {projectId && (
        <>
          <div className="my-3 border-t border-[var(--color-border)]" />
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={`/projects/${projectId}/${item.path}`}
              onClick={() => setMobileSidebar(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-[var(--color-primary)] font-medium'
                    : 'text-[var(--color-text-secondary)] hover:bg-gray-50'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </>
      )}
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="fixed left-0 top-0 z-30 hidden h-screen flex-col border-r border-[var(--color-border)] bg-white transition-all duration-200 md:flex"
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
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
          {!collapsed ? navContent : (
            <>
              <NavLink to="/" end className={({ isActive }) => `flex items-center justify-center rounded-lg p-2 text-sm transition-colors ${isActive ? 'bg-blue-50 text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-gray-50'}`}>
                <span className="text-base">📋</span>
              </NavLink>
              {projectId && NAV_ITEMS.map((item) => (
                <NavLink key={item.path} to={`/projects/${projectId}/${item.path}`} className={({ isActive }) => `flex items-center justify-center rounded-lg p-2 text-sm transition-colors ${isActive ? 'bg-blue-50 text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-gray-50'}`}>
                  <span className="text-base">{item.label[0]}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileSidebar(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <aside
            className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-4">
              <span className="text-lg font-bold text-[var(--color-primary)]">AgiliX</span>
              <button
                onClick={() => setMobileSidebar(false)}
                className="rounded p-1.5 text-[var(--color-text-secondary)] hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <nav className="space-y-1 px-2 py-4">
              {navContent}
            </nav>
          </aside>
        </div>
      )}
    </>
  )
}
