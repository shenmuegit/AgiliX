import { Outlet } from 'react-router'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { IssueDetailDrawer } from '@/components/issue/IssueDetailDrawer'
import { SearchDialog } from '@/components/common/SearchDialog'
import { QuickCreateDialog } from '@/components/common/QuickCreateDialog'
import { useUIStore } from '@/stores/uiStore'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

export function AppShell() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  useKeyboardShortcuts()

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <Sidebar />
      <div
        className="flex flex-1 flex-col overflow-hidden transition-all duration-200 ml-0 md:ml-[240px]"
        style={{ marginLeft: undefined }}
      >
        <style>{`
          @media (min-width: 768px) {
            .main-content-area { margin-left: ${sidebarCollapsed ? 64 : 240}px !important; }
          }
        `}</style>
        <div className="main-content-area flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-3 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
      <IssueDetailDrawer />
      <SearchDialog />
      <QuickCreateDialog />
    </div>
  )
}
