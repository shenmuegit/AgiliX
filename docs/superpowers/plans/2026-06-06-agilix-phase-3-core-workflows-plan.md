# AgiliX Phase 3 Core Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the daily core AgiliX workflows: team workbench, project overview, Issues ledger, and Kanban board.

**Architecture:** Routes remain data-driven React components in this phase. They receive `SeedData`, selected filters, and mutation callbacks as props; API client wiring is handled later in Phase 6. This keeps UI behavior testable without persistence concerns.

**Tech Stack:** TypeScript, React, Vitest, Testing Library, user-event.

---

## Scope

- Build `团队工作台`, `项目总览`, `Issues`, and `看板`.
- Add a shared `ProjectFilter` used inside feature pages.
- Keep project selection as a filter inside views, not as a separate workspace.
- Exclude API wiring, persistence wiring, detailed reporting views, documents, and Feishu UI from this phase.

## Files

- Create `apps/agilix/src/components/ProjectFilter.tsx`: project filter control.
- Create `apps/agilix/src/components/ProjectFilter.test.tsx`: filter tests.
- Create `apps/agilix/src/routes/TeamPage.tsx`: team workbench.
- Create `apps/agilix/src/routes/ProjectsPage.tsx`: project overview.
- Create `apps/agilix/src/routes/workbench-projects.test.tsx`: workbench/project tests.
- Create `apps/agilix/src/routes/IssuesPage.tsx`: work item ledger.
- Create `apps/agilix/src/routes/BoardPage.tsx`: Kanban board.
- Create `apps/agilix/src/routes/issues-board.test.tsx`: issue/board tests.

### Task 1: Add Project Filter Component

**Files:**
- Create: `apps/agilix/src/components/ProjectFilter.tsx`
- Test: `apps/agilix/src/components/ProjectFilter.test.tsx`

- [ ] **Step 1: Write the failing project filter test**

Create `apps/agilix/src/components/ProjectFilter.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { seedData } from '../domain/fixtures'
import { ProjectFilter } from './ProjectFilter'

describe('ProjectFilter', () => {
  it('keeps project choice inside feature pages', async () => {
    const onChange = vi.fn()

    render(<ProjectFilter projects={seedData.projects} value="all" onChange={onChange} />)

    expect(screen.getByRole('combobox', { name: '项目' })).toHaveValue('all')
    expect(screen.getByRole('option', { name: '全部' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '搜索平台' })).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: '项目' }), 'search')
    expect(onChange).toHaveBeenCalledWith('search')
  })
})
```

- [ ] **Step 2: Run RED**

Run:

```bash
pnpm --filter @agilix/app test -- src/components/ProjectFilter.test.tsx
```

Expected: FAIL because `ProjectFilter.tsx` does not exist.

- [ ] **Step 3: Add the project filter code**

Create `apps/agilix/src/components/ProjectFilter.tsx`:

```tsx
import type { Project, ProjectId } from '../domain/types'

export type ProjectFilterValue = ProjectId | 'all'

export function ProjectFilter({
  projects,
  value,
  onChange,
}: {
  projects: Project[]
  value: ProjectFilterValue
  onChange: (value: ProjectFilterValue) => void
}) {
  return (
    <label>
      项目
      <select aria-label="项目" value={value} onChange={(event) => onChange(event.currentTarget.value as ProjectFilterValue)}>
        <option value="all">全部</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </label>
  )
}
```

- [ ] **Step 4: Run GREEN**

Run:

```bash
pnpm --filter @agilix/app test -- src/components/ProjectFilter.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/agilix/src/components/ProjectFilter.tsx apps/agilix/src/components/ProjectFilter.test.tsx
git commit -m "feat: add project filter component"
```

### Task 2: Build Team Workbench and Project Overview

**Files:**
- Create: `apps/agilix/src/routes/TeamPage.tsx`
- Create: `apps/agilix/src/routes/ProjectsPage.tsx`
- Test: `apps/agilix/src/routes/workbench-projects.test.tsx`

- [ ] **Step 1: Write the failing workbench and project overview tests**

Create `apps/agilix/src/routes/workbench-projects.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { seedData } from '../domain/fixtures'
import { ProjectsPage } from './ProjectsPage'
import { TeamPage } from './TeamPage'

describe('workbench and project overview routes', () => {
  it('shows team attention, completion, pending issues, recent docs, and Feishu visibility', () => {
    render(<TeamPage data={seedData} />)

    expect(screen.getByRole('heading', { name: '团队工作台' })).toBeInTheDocument()
    expect(screen.getByText('今天要盯住 3 件事')).toBeInTheDocument()
    expect(screen.getByText('迭代完成 21%')).toBeInTheDocument()
    expect(screen.getByText('SRCH-198')).toBeInTheDocument()
    expect(screen.getByText('结果卡片重设计方案')).toBeInTheDocument()
    expect(screen.getByText('飞书只做通知和查询')).toBeInTheDocument()
  })

  it('shows projects as a portfolio view without creating project workspaces', () => {
    render(<ProjectsPage data={seedData} />)

    expect(screen.getByRole('heading', { name: '项目总览' })).toBeInTheDocument()
    expect(screen.getByText('搜索平台')).toBeInTheDocument()
    expect(screen.getByText('移动端 App')).toBeInTheDocument()
    expect(screen.getByText('共 8 名成员协作')).toBeInTheDocument()
    expect(screen.queryByText('审批流')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run RED**

Run:

```bash
pnpm --filter @agilix/app test -- src/routes/workbench-projects.test.tsx
```

Expected: FAIL because route files do not exist.

- [ ] **Step 3: Add `TeamPage` code**

Create `apps/agilix/src/routes/TeamPage.tsx`:

```tsx
import { buildWorkbenchSnapshot } from '../domain/workbench'
import type { SeedData } from '../domain/types'

export function TeamPage({ data }: { data: SeedData }) {
  const snapshot = buildWorkbenchSnapshot(data)

  return (
    <main>
      <header>
        <h1>团队工作台</h1>
        <p>飞书只做通知和查询</p>
      </header>
      <section>
        <h2>今天要盯住 3 件事</h2>
        <p>迭代完成 {snapshot.completionPercent}%</p>
      </section>
      <section aria-label="待处理 Issue">
        <h2>待处理 Issue</h2>
        {snapshot.attentionIssueKeys.map((key) => (
          <article key={key}>{key}</article>
        ))}
      </section>
      <section>
        <h2>最近文档</h2>
        {snapshot.recentDocTitles.slice(0, 4).map((title) => (
          <article key={title}>{title}</article>
        ))}
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Add `ProjectsPage` code**

Create `apps/agilix/src/routes/ProjectsPage.tsx`:

```tsx
import type { SeedData } from '../domain/types'
import { buildIterationStats } from '../domain/iterations'

export function ProjectsPage({ data }: { data: SeedData }) {
  return (
    <main>
      <header>
        <h1>项目总览</h1>
        <p>共 {data.members.length} 名成员协作</p>
      </header>
      <section>
        {data.projects.map((project) => {
          const stats = buildIterationStats(data, project.id, project.activeIterationCode)

          return (
            <article key={project.id}>
              <h2>{project.name}</h2>
              <p>{project.activeIterationCode} · {stats.iteration.name}</p>
              <p>迭代进度 {stats.completionPercent}%</p>
              <p>Issue {data.issues.filter((issue) => issue.projectId === project.id).length}</p>
            </article>
          )
        })}
      </section>
    </main>
  )
}
```

- [ ] **Step 5: Run GREEN**

Run:

```bash
pnpm --filter @agilix/app test -- src/routes/workbench-projects.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/agilix/src/routes/TeamPage.tsx apps/agilix/src/routes/ProjectsPage.tsx apps/agilix/src/routes/workbench-projects.test.tsx
git commit -m "feat: add workbench and project overview routes"
```

### Task 3: Build Issues Ledger and Kanban Board

**Files:**
- Create: `apps/agilix/src/routes/IssuesPage.tsx`
- Create: `apps/agilix/src/routes/BoardPage.tsx`
- Test: `apps/agilix/src/routes/issues-board.test.tsx`

- [ ] **Step 1: Write the failing Issues and board tests**

Create `apps/agilix/src/routes/issues-board.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { seedData } from '../domain/fixtures'
import { BoardPage } from './BoardPage'
import { IssuesPage } from './IssuesPage'

describe('issues ledger and board routes', () => {
  it('shows the work item ledger with project filtering', () => {
    render(<IssuesPage data={seedData} projectId="search" onProjectChange={() => undefined} />)

    expect(screen.getByRole('heading', { name: 'Issues' })).toBeInTheDocument()
    expect(screen.getByText('需求 & 缺陷')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '项目' })).toHaveValue('search')
    expect(screen.getByText('SRCH-198')).toBeInTheDocument()
    expect(screen.queryByText('DATA-42')).not.toBeInTheDocument()
  })

  it('moves a board card through the mutation callback', async () => {
    const onMoveIssue = vi.fn()

    render(<BoardPage data={seedData} projectId="search" onMoveIssue={onMoveIssue} />)

    expect(screen.getByRole('heading', { name: '看板' })).toBeInTheDocument()
    expect(screen.getByText('阻塞')).toBeInTheDocument()
    expect(screen.getByText('Review')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'SRCH-186 完成' }))
    expect(onMoveIssue).toHaveBeenCalledWith('SRCH-186', 'done')
  })
})
```

- [ ] **Step 2: Run RED**

Run:

```bash
pnpm --filter @agilix/app test -- src/routes/issues-board.test.tsx
```

Expected: FAIL because `IssuesPage.tsx` and `BoardPage.tsx` do not exist.

- [ ] **Step 3: Add `IssuesPage` code**

Create `apps/agilix/src/routes/IssuesPage.tsx`:

```tsx
import { ProjectFilter, type ProjectFilterValue } from '../components/ProjectFilter'
import { filterIssues } from '../domain/issues'
import type { SeedData } from '../domain/types'

export function IssuesPage({
  data,
  projectId,
  onProjectChange,
}: {
  data: SeedData
  projectId: ProjectFilterValue
  onProjectChange: (projectId: ProjectFilterValue) => void
}) {
  const issues = filterIssues(data.issues, { projectId, status: 'all', assigneeId: 'all', keyword: '' })

  return (
    <main>
      <header>
        <h1>Issues</h1>
        <p>需求 & 缺陷</p>
      </header>
      <ProjectFilter projects={data.projects} value={projectId} onChange={onProjectChange} />
      <section>
        {issues.map((issue) => (
          <article key={issue.key}>
            <span>{issue.key}</span>
            <strong>{issue.title}</strong>
            <span>{issue.status}</span>
          </article>
        ))}
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Add `BoardPage` code**

Create `apps/agilix/src/routes/BoardPage.tsx`:

```tsx
import { filterIssues, groupIssuesByStatus } from '../domain/issues'
import type { IssueStatus, ProjectId, SeedData } from '../domain/types'

const columnLabels: Record<IssueStatus, string> = {
  todo: '待办',
  doing: '进行中',
  review: 'Review',
  blocked: '阻塞',
  done: '完成',
}

export function BoardPage({
  data,
  projectId,
  onMoveIssue,
}: {
  data: SeedData
  projectId: ProjectId | 'all'
  onMoveIssue: (issueKey: string, status: IssueStatus) => void
}) {
  const grouped = groupIssuesByStatus(filterIssues(data.issues, { projectId, status: 'all', assigneeId: 'all', keyword: '' }))

  return (
    <main>
      <h1>看板</h1>
      <section>
        {(['todo', 'doing', 'review', 'blocked', 'done'] as const).map((status) => (
          <div key={status}>
            <h2>{columnLabels[status]}</h2>
            {grouped[status].map((issue) => (
              <article key={issue.key}>
                <span>{issue.key}</span>
                <strong>{issue.title}</strong>
                {status === 'review' ? <button onClick={() => onMoveIssue(issue.key, 'done')}>{issue.key} 完成</button> : null}
              </article>
            ))}
          </div>
        ))}
      </section>
    </main>
  )
}
```

- [ ] **Step 5: Run GREEN**

Run:

```bash
pnpm --filter @agilix/app test -- src/routes/issues-board.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Run affected tests**

Run:

```bash
pnpm --filter @agilix/app test -- src/components/ProjectFilter.test.tsx src/routes/workbench-projects.test.tsx src/routes/issues-board.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/agilix/src/routes/IssuesPage.tsx apps/agilix/src/routes/BoardPage.tsx apps/agilix/src/routes/issues-board.test.tsx
git commit -m "feat: add issues ledger and board routes"
```

## Self-Review

- Spec coverage: Phase 3 covers team workbench, project overview, Issues ledger, Kanban board, and project filtering.
- Scope check: API wiring, persistence wiring, reporting views, document management, and Feishu UI remain in later phase plans.
- TDD check: Each task starts with a failing test and RED command before production code.
- Type consistency: `ProjectFilterValue`, `SeedData`, `IssueStatus`, and route callback signatures match tests and code snippets.
- Placeholder scan: No unresolved placeholder markers or unfilled sections remain.
