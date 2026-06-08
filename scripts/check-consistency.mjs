import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function read(path) {
  return readFileSync(resolve(root, path), 'utf8')
}

function contains(path, snippet) {
  assert.match(
    read(path),
    snippet instanceof RegExp ? snippet : new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `${path} should contain ${snippet}`,
  )
}

contains('packages/backend/src/db/schema.ts', /export const sprints = sqliteTable\('sprints'/)
contains('packages/backend/src/db/schema.ts', /export const sprintSnapshots = sqliteTable\('sprint_snapshots'/)
contains('packages/backend/src/db/schema.ts', /sprintId: text\('sprint_id'\)/)
contains('packages/backend/src/index.ts', "import { sprintRoutes } from './routes/sprint.routes'")
contains('packages/backend/src/index.ts', "app.route('/api', sprintRoutes)")

contains('packages/shared/src/types/sprint.ts', /export interface Sprint\b/)
contains('packages/shared/src/types/sprint.ts', /export interface SprintSnapshot\b/)
contains('packages/shared/src/schemas/sprint.schema.ts', /export const createSprintSchema = z\.object/)
contains('packages/shared/src/schemas/sprint.schema.ts', /export const updateSprintSchema = z\.object/)

contains('packages/frontend/src/App.tsx', "import { SprintPage } from './routes/SprintPage'")
contains('packages/frontend/src/App.tsx', "import { ReportsPage } from './routes/ReportsPage'")
contains('packages/frontend/src/App.tsx', 'path="sprints" element={<SprintPage />}')
contains('packages/frontend/src/App.tsx', 'path="reports" element={<ReportsPage />}')
contains('packages/frontend/src/lib/constants.ts', "path: 'sprints'")
contains('packages/frontend/src/lib/constants.ts', "path: 'reports'")

contains('package.json', '"db:migrate:remote": "pnpm --filter @agilix/backend db:migrate:remote"')
contains('DEPLOY.md', 'packages/backend/wrangler.toml')
contains('package.json', /"packageManager": "pnpm@9\./)
contains('package.json', '"lint": "eslint \\"packages/**/*.{ts,tsx}\\""')
contains('package.json', '"test": "pnpm check:consistency && pnpm -r test"')
contains('eslint.config.js', "@typescript-eslint/parser")
contains('packages/frontend/package.json', '"test": "vitest run --passWithNoTests"')
contains('packages/backend/package.json', '"test": "vitest run --passWithNoTests"')
contains('packages/shared/package.json', '"test": "vitest run --passWithNoTests"')
