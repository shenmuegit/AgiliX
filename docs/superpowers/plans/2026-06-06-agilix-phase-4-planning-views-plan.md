# AgiliX Phase 4 Planning Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build AgiliX planning and reporting views: iteration statistics, member workload, daily standup, and schedule gantt.

**Architecture:** Views are pure React routes that receive `SeedData`, project filters, and save callbacks as props. They reuse Phase 1 domain calculations and defer API persistence wiring to Phase 6.

**Tech Stack:** TypeScript, React, Vitest, Testing Library, user-event.

---

## Scope

- Build `迭代统计`, `成员负载`, `每日站会`, and `排期甘特`.
- Reuse pure domain modules from Phase 1.
- Keep Feishu calendar and notification behavior as displayed context only.
- Exclude API client wiring and actual Feishu delivery from this phase.

## Files

- Create `apps/agilix/src/routes/StatsPage.tsx`: iteration statistics.
- Create `apps/agilix/src/routes/WorkloadPage.tsx`: member workload.
- Create `apps/agilix/src/routes/StandupPage.tsx`: daily standup.
- Create `apps/agilix/src/routes/GanttPage.tsx`: schedule gantt.
- Create `apps/agilix/src/routes/planning-views.test.tsx`: route tests.

### Task 1: Build Statistics and Workload Views

**Files:**
- Create: `apps/agilix/src/routes/StatsPage.tsx`
- Create: `apps/agilix/src/routes/WorkloadPage.tsx`
- Test: `apps/agilix/src/routes/planning-views.test.tsx`

- [ ] **Step 1: Write the failing statistics and workload tests**

Create `apps/agilix/src/routes/planning-views.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { seedData } from '../domain/fixtures'
import { StatsPage } from './StatsPage'
import { WorkloadPage } from './WorkloadPage'

describe('planning statistics and workload routes', () => {
  it('renders iteration statistics from shared data', () => {
    render(<StatsPage data={seedData} projectId="search" iterationCode="S24" />)

    expect(screen.getByRole('heading', { name: '迭代统计' })).toBeInTheDocument()
    expect(screen.getByText('搜索体验重构')).toBeInTheDocument()
    expect(screen.getByText('完成 21%')).toBeInTheDocument()
    expect(screen.getByText('近五迭代速度')).toBeInTheDocument()
  })

  it('renders member workload and current assignments', () => {
    render(<WorkloadPage data={seedData} />)

    expect(screen.getByRole('heading', { name: '成员负载' })).toBeInTheDocument()
    expect(screen.getByText('整体负载')).toBeInTheDocument()
    expect(screen.getByText('高远')).toBeInTheDocument()
    expect(screen.getByText('SRCH-198')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run RED**

Run:

```bash
pnpm --filter @agilix/app test -- src/routes/planning-views.test.tsx
```

Expected: FAIL because `StatsPage.tsx` and `WorkloadPage.tsx` do not exist.

- [ ] **Step 3: Add statistics view code**

Create `apps/agilix/src/routes/StatsPage.tsx`:

```tsx
import { buildIterationStats } from '../domain/iterations'
import type { ProjectId, SeedData } from '../domain/types'

export function StatsPage({ data, projectId, iterationCode }: { data: SeedData; projectId: ProjectId; iterationCode: string }) {
  const stats = buildIterationStats(data, projectId, iterationCode)

  return (
    <main>
      <h1>迭代统计</h1>
      <section>
        <h2>{stats.iteration.name}</h2>
        <p>完成 {stats.completionPercent}%</p>
        <p>总点数 {stats.totalPoints}</p>
        <p>已完成 {stats.donePoints}</p>
        <p>阻塞 {stats.blockedCount}</p>
      </section>
      <section>
        <h2>近五迭代速度</h2>
        <p>{stats.velocity} pt / 迭代</p>
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Add workload view code**

Create `apps/agilix/src/routes/WorkloadPage.tsx`:

```tsx
import { buildWorkloadRows } from '../domain/workload'
import type { SeedData } from '../domain/types'

export function WorkloadPage({ data }: { data: SeedData }) {
  const rows = buildWorkloadRows(data)
  const averageLoad = Math.round(rows.reduce((sum, row) => sum + row.loadPercent, 0) / rows.length)

  return (
    <main>
      <h1>成员负载</h1>
      <p>整体负载 {averageLoad}%</p>
      <section>
        {rows.map((row) => (
          <article key={row.memberId}>
            <h2>{row.name}</h2>
            <p>{row.loadPercent}%</p>
            {row.activeIssueKeys.map((key) => (
              <span key={key}>{key}</span>
            ))}
          </article>
        ))}
      </section>
    </main>
  )
}
```

- [ ] **Step 5: Run GREEN**

Run:

```bash
pnpm --filter @agilix/app test -- src/routes/planning-views.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/agilix/src/routes/StatsPage.tsx apps/agilix/src/routes/WorkloadPage.tsx apps/agilix/src/routes/planning-views.test.tsx
git commit -m "feat: add statistics and workload routes"
```

### Task 2: Build Standup and Gantt Views

**Files:**
- Modify: `apps/agilix/src/routes/planning-views.test.tsx`
- Create: `apps/agilix/src/routes/StandupPage.tsx`
- Create: `apps/agilix/src/routes/GanttPage.tsx`

- [ ] **Step 1: Extend the failing planning tests**

Modify `apps/agilix/src/routes/planning-views.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { seedData } from '../domain/fixtures'
import { GanttPage } from './GanttPage'
import { StandupPage } from './StandupPage'
import { StatsPage } from './StatsPage'
import { WorkloadPage } from './WorkloadPage'

describe('planning statistics and workload routes', () => {
  it('renders iteration statistics from shared data', () => {
    render(<StatsPage data={seedData} projectId="search" iterationCode="S24" />)

    expect(screen.getByRole('heading', { name: '迭代统计' })).toBeInTheDocument()
    expect(screen.getByText('搜索体验重构')).toBeInTheDocument()
    expect(screen.getByText('完成 21%')).toBeInTheDocument()
    expect(screen.getByText('近五迭代速度')).toBeInTheDocument()
  })

  it('renders member workload and current assignments', () => {
    render(<WorkloadPage data={seedData} />)

    expect(screen.getByRole('heading', { name: '成员负载' })).toBeInTheDocument()
    expect(screen.getByText('整体负载')).toBeInTheDocument()
    expect(screen.getByText('高远')).toBeInTheDocument()
    expect(screen.getByText('SRCH-198')).toBeInTheDocument()
  })

  it('renders daily standup content and exposes a save callback', async () => {
    const onSaveStandup = vi.fn()
    render(<StandupPage data={seedData} projectId="search" onSaveStandup={onSaveStandup} />)

    expect(screen.getByRole('heading', { name: '每日站会' })).toBeInTheDocument()
    expect(screen.getByText('关联飞书日历 · 每日 10:00')).toBeInTheDocument()
    expect(screen.getByText('昨日')).toBeInTheDocument()
    expect(screen.getByText('今日')).toBeInTheDocument()
    expect(screen.getByText('阻塞')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '保存站会' }))
    expect(onSaveStandup).toHaveBeenCalledWith(seedData.standups[0])
  })

  it('renders schedule gantt milestones and exposes a save callback', async () => {
    const onSaveMilestone = vi.fn()
    render(<GanttPage data={seedData} projectId="search" onSaveMilestone={onSaveMilestone} />)

    expect(screen.getByRole('heading', { name: '排期甘特' })).toBeInTheDocument()
    expect(screen.getByText('里程碑')).toBeInTheDocument()
    expect(screen.getByText('Beta 开关接入')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '保存 Beta 开关接入' }))
    expect(onSaveMilestone).toHaveBeenCalledWith(seedData.milestones[1])
  })
})
```

- [ ] **Step 2: Run RED**

Run:

```bash
pnpm --filter @agilix/app test -- src/routes/planning-views.test.tsx
```

Expected: FAIL because `StandupPage.tsx` and `GanttPage.tsx` do not exist.

- [ ] **Step 3: Add standup view code**

Create `apps/agilix/src/routes/StandupPage.tsx`:

```tsx
import { buildStandupSummary } from '../domain/standup'
import type { ProjectId, SeedData, Standup } from '../domain/types'

export function StandupPage({
  data,
  projectId,
  onSaveStandup,
}: {
  data: SeedData
  projectId: ProjectId
  onSaveStandup: (standup: Standup) => void
}) {
  const standup = data.standups.find((item) => item.projectId === projectId)
  const summary = buildStandupSummary(data, projectId)

  if (!standup) throw new Error(`Standup not found: ${projectId}`)

  return (
    <main>
      <h1>每日站会</h1>
      <p>关联飞书日历 · 每日 10:00</p>
      <p>{summary.dateLabel} · {summary.timeLabel}</p>
      <section>
        <h2>昨日</h2>
        <p>{summary.yesterdayCount} 项</p>
      </section>
      <section>
        <h2>今日</h2>
        <p>{summary.todayCount} 项</p>
      </section>
      <section>
        <h2>阻塞</h2>
        {summary.blockers.map((key) => (
          <span key={key}>{key}</span>
        ))}
      </section>
      <button onClick={() => onSaveStandup(standup)}>保存站会</button>
    </main>
  )
}
```

- [ ] **Step 4: Add gantt view code**

Create `apps/agilix/src/routes/GanttPage.tsx`:

```tsx
import { buildGanttRows } from '../domain/gantt'
import type { Milestone, ProjectId, SeedData } from '../domain/types'

export function GanttPage({
  data,
  projectId,
  onSaveMilestone,
}: {
  data: SeedData
  projectId: ProjectId
  onSaveMilestone: (milestone: Milestone) => void
}) {
  const rows = buildGanttRows(data, projectId)

  return (
    <main>
      <h1>排期甘特</h1>
      <section>
        <h2>里程碑</h2>
        {rows.map((row) => {
          const milestone = data.milestones.find((item) => item.id === row.id)!

          return (
            <article key={row.id}>
              <h3>{row.title}</h3>
              <p>第 {row.startDay} - {row.endDay} 天</p>
              <p>{row.status}</p>
              <button onClick={() => onSaveMilestone(milestone)}>保存 {row.title}</button>
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
pnpm --filter @agilix/app test -- src/routes/planning-views.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Run affected route tests**

Run:

```bash
pnpm --filter @agilix/app test -- src/routes/workbench-projects.test.tsx src/routes/issues-board.test.tsx src/routes/planning-views.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/agilix/src/routes/StandupPage.tsx apps/agilix/src/routes/GanttPage.tsx apps/agilix/src/routes/planning-views.test.tsx
git commit -m "feat: add standup and gantt routes"
```

## Self-Review

- Spec coverage: Phase 4 covers iteration statistics, member workload, daily standup, and gantt schedule.
- Scope check: Persistence wiring and browser QA remain in later phase plans.
- TDD check: Each task starts with a failing test and RED command before production code.
- Type consistency: `SeedData`, `ProjectId`, `Standup`, and `Milestone` callback signatures match tests and code snippets.
- Placeholder scan: No unresolved placeholder markers or unfilled sections remain.
