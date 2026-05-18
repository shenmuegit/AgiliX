import { Routes, Route, Navigate } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import { ProjectListPage } from './routes/ProjectListPage'
import { BoardPage } from './routes/BoardPage'
import { BacklogPage } from './routes/BacklogPage'
import { SprintPage } from './routes/SprintPage'
import { ReportsPage } from './routes/ReportsPage'
import { SettingsPage } from './routes/SettingsPage'

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<ProjectListPage />} />
        <Route path="projects/:projectId">
          <Route index element={<Navigate to="board" replace />} />
          <Route path="board" element={<BoardPage />} />
          <Route path="backlog" element={<BacklogPage />} />
          <Route path="sprints" element={<SprintPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
