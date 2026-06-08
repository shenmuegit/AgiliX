import { Routes, Route, Navigate } from 'react-router'
import { useAutoLogin } from './hooks/useAutoLogin'
import { AppShell } from './components/layout/AppShell'
import { ProjectListPage } from './routes/ProjectListPage'
import { BoardPage } from './routes/BoardPage'
import { MilestonePage } from './routes/MilestonePage'
import { SprintPage } from './routes/SprintPage'
import { ReportsPage } from './routes/ReportsPage'
import { SettingsPage } from './routes/SettingsPage'
import { CommitsPage } from './routes/CommitsPage'

export function App() {
  const { showLogin, errorMsg, loginUrl } = useAutoLogin()

  if (showLogin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <h1 className="mb-2 text-xl font-bold text-[var(--color-text)]">AgiliX</h1>
          <p className="mb-4 text-sm text-[var(--color-text-secondary)]">登录失败，请重试</p>
          {errorMsg && (
            <p className="mb-4 rounded bg-red-50 px-3 py-2 text-xs text-red-600 break-all">{errorMsg}</p>
          )}
          <a
            href={loginUrl}
            className="inline-block rounded-lg bg-[var(--color-primary)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            飞书登录
          </a>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<ProjectListPage />} />
        <Route path="projects/:projectId">
          <Route index element={<Navigate to="board" replace />} />
          <Route path="board" element={<BoardPage />} />
          <Route path="milestones" element={<MilestonePage />} />
          <Route path="sprints" element={<SprintPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="commits" element={<CommitsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
