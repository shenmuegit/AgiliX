# AgiliX Phase 1 Foundation and Domain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the new full AgiliX app foundation with typed prototype data, pure domain behavior, and a flat shell ready for later API and route work.

**Architecture:** This phase creates only the frontend package `apps/agilix` and pure TypeScript domain modules. No persistence, API server, or real page workflows are built here; later phases consume these stable types and fixtures. Tests drive every behavior before production code.

**Tech Stack:** pnpm workspace, TypeScript, React, Vite, Vitest, Testing Library, plain CSS.

---

## Scope

- Include the full product navigation: `团队工作台`, `项目总览`, `Issues`, `看板`, `迭代统计`, `文档`, `成员负载`, `每日站会`, `排期甘特`, `飞书`.
- Include seed data for all prototype modules.
- Keep projects as filters and reporting dimensions.
- Exclude permissions, approval flow, multiple Feishu groups, API routes, and persistence from this phase.

## Files

- Modify `pnpm-workspace.yaml`: include `apps/*`.
- Modify `package.json`: make lint/format include `apps`.
- Create `apps/agilix/package.json`: app package.
- Create `apps/agilix/tsconfig.json`: app TypeScript config.
- Create `apps/agilix/vite.config.ts`: Vite and Vitest config.
- Create `apps/agilix/index.html`: Vite entry.
- Create `apps/agilix/src/main.tsx`: React bootstrap.
- Create `apps/agilix/src/styles/agilix.css`: prototype visual system baseline.
- Create `apps/agilix/src/App.tsx`: minimal app shell.
- Create `apps/agilix/src/App.test.tsx`: app shell test.
- Create `apps/agilix/src/test/setup.ts`: Testing Library setup.
- Create `apps/agilix/src/domain/types.ts`: shared domain types.
- Create `apps/agilix/src/domain/fixtures.ts`: deterministic prototype seed data.
- Create `apps/agilix/src/domain/fixtures.test.ts`: fixture coverage tests.
- Create `apps/agilix/src/domain/issues.ts`: issue filtering and grouping.
- Create `apps/agilix/src/domain/docs.ts`: docs tree and search.
- Create `apps/agilix/src/domain/workbench.ts`: team attention summary.
- Create `apps/agilix/src/domain/iterations.ts`: iteration stats.
- Create `apps/agilix/src/domain/workload.ts`: member load rows.
- Create `apps/agilix/src/domain/standup.ts`: daily standup summary.
- Create `apps/agilix/src/domain/gantt.ts`: schedule rows.
- Create `apps/agilix/src/domain/feishu.ts`: query parser and replies.
- Create `apps/agilix/src/domain/full-domain.test.ts`: pure domain behavior tests.
- Create `apps/agilix/src/components/Shell.tsx`: flat navigation layout.
- Create `apps/agilix/src/components/Shell.test.tsx`: shell tests.

## Task 1: Scaffold the Full App Package

**Files:**
- Modify: `pnpm-workspace.yaml`
- Modify: `package.json`
- Create: `apps/agilix/package.json`
- Create: `apps/agilix/tsconfig.json`
- Create: `apps/agilix/vite.config.ts`
- Create: `apps/agilix/index.html`
- Create: `apps/agilix/src/styles/agilix.css`
- Create: `apps/agilix/src/App.test.tsx`
- Create: `apps/agilix/src/App.tsx`
- Create: `apps/agilix/src/main.tsx`
- Create: `apps/agilix/src/test/setup.ts`

- [ ] **Step 1: Write the failing app shell test**

Create `apps/agilix/src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('AgiliX app shell', () => {
  it('starts at the team workbench and exposes every full product module', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: '团队工作台' })).toBeInTheDocument()
    for (const label of ['团队工作台', '项目总览', 'Issues', '看板', '迭代统计', '文档', '成员负载', '每日站会', '排期甘特', '飞书']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
    expect(screen.getByText('AgiliX 主工作台')).toBeInTheDocument()
    expect(screen.queryByText('审批流')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run RED**

Run:

```bash
pnpm --filter @agilix/app test -- src/App.test.tsx
```

Expected: FAIL because `@agilix/app` does not exist.

- [ ] **Step 3: Add workspace and root script coverage**

Modify `pnpm-workspace.yaml`:

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

Modify only these scripts in root `package.json`:

```json
{
  "scripts": {
    "lint": "eslint \"{packages,apps}/**/*.{ts,tsx}\"",
    "format": "prettier --write \"{packages,apps}/**/*.{ts,tsx,json,css}\""
  }
}
```

- [ ] **Step 4: Add the app package**

Create `apps/agilix/package.json`:

```json
{
  "name": "@agilix/app",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    "./domain/docs": "./src/domain/docs.ts",
    "./domain/feishu": "./src/domain/feishu.ts",
    "./domain/fixtures": "./src/domain/fixtures.ts",
    "./domain/gantt": "./src/domain/gantt.ts",
    "./domain/issues": "./src/domain/issues.ts",
    "./domain/iterations": "./src/domain/iterations.ts",
    "./domain/standup": "./src/domain/standup.ts",
    "./domain/types": "./src/domain/types.ts",
    "./domain/workbench": "./src/domain/workbench.ts",
    "./domain/workload": "./src/domain/workload.ts"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

Create `apps/agilix/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "vite.config.ts"]
}
```

Create `apps/agilix/vite.config.ts`:

```ts
/// <reference types="vitest" />

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

Create `apps/agilix/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

Create `apps/agilix/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AgiliX</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `apps/agilix/src/styles/agilix.css`:

```css
:root {
  color: #1f2528;
  background: #f7f8f9;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background: #f7f8f9;
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
select {
  font: inherit;
}

.agilix-shell {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  min-height: 100vh;
}

.agilix-shell aside {
  border-right: 1px solid #d8dee2;
  background: #ffffff;
  padding: 20px;
}

.agilix-shell nav {
  display: grid;
  gap: 6px;
  margin-top: 20px;
}

.agilix-shell nav a {
  border-radius: 8px;
  padding: 9px 10px;
}

.agilix-shell nav a[aria-current="page"] {
  background: #243b3f;
  color: #ffffff;
}

.agilix-shell > section {
  min-width: 0;
  padding: 28px;
}

main {
  max-width: 1180px;
}

article,
section,
aside {
  min-width: 0;
}

@media (max-width: 760px) {
  .agilix-shell {
    grid-template-columns: 1fr;
  }

  .agilix-shell aside {
    border-right: 0;
    border-bottom: 1px solid #d8dee2;
  }
}
```

- [ ] **Step 5: Add minimal app shell**

Create `apps/agilix/src/App.tsx`:

```tsx
const navItems = ['团队工作台', '项目总览', 'Issues', '看板', '迭代统计', '文档', '成员负载', '每日站会', '排期甘特', '飞书']

export function App() {
  return (
    <div>
      <nav aria-label="主导航">
        {navItems.map((item) => (
          <a key={item} href={`#${item}`}>
            {item}
          </a>
        ))}
      </nav>
      <main>
        <h1>团队工作台</h1>
        <p>AgiliX 主工作台</p>
      </main>
    </div>
  )
}
```

Create `apps/agilix/src/main.tsx`:

```tsx
import { createRoot } from 'react-dom/client'
import './styles/agilix.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(<App />)
```

- [ ] **Step 6: Run GREEN**

Run:

```bash
pnpm --filter @agilix/app test -- src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-workspace.yaml apps/agilix
git commit -m "feat: scaffold full AgiliX app"
```

## Task 2: Add Full Prototype Types and Fixtures

**Files:**
- Create: `apps/agilix/src/domain/types.ts`
- Create: `apps/agilix/src/domain/fixtures.ts`
- Test: `apps/agilix/src/domain/fixtures.test.ts`

- [ ] **Step 1: Write the failing fixture coverage test**

Create `apps/agilix/src/domain/fixtures.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { seedData } from './fixtures'

describe('seedData', () => {
  it('covers every prototype-backed product module', () => {
    expect(seedData.projects.map((project) => project.name)).toEqual(['搜索平台', '数据看板', '开放平台', '移动端 App'])
    expect(seedData.members).toHaveLength(8)
    expect(seedData.iterations.some((iteration) => iteration.code === 'S24')).toBe(true)
    expect(seedData.issues.some((issue) => issue.key === 'SRCH-198' && issue.status === 'blocked')).toBe(true)
    expect(seedData.docs.some((doc) => doc.scope === 'global')).toBe(true)
    expect(seedData.standups).toHaveLength(1)
    expect(seedData.milestones.filter((milestone) => milestone.projectId === 'search')).toHaveLength(3)
  })

  it('keeps the small-team product constraints explicit', () => {
    expect(seedData.navItems).toEqual(['团队工作台', '项目总览', 'Issues', '看板', '迭代统计', '文档', '成员负载', '每日站会', '排期甘特', '飞书'])
    expect(seedData.navItems).not.toContain('审批流')
    expect(seedData.feishu.groups).toEqual(['AgiliX 团队群'])
  })
})
```

- [ ] **Step 2: Run RED**

Run:

```bash
pnpm --filter @agilix/app test -- src/domain/fixtures.test.ts
```

Expected: FAIL because `fixtures.ts` does not exist.

- [ ] **Step 3: Add domain types**

Create `apps/agilix/src/domain/types.ts`:

```ts
export type ProjectId = 'search' | 'data' | 'api' | 'mobile'
export type MemberId = 'lin' | 'chen' | 'gao' | 'su' | 'han' | 'he' | 'jiang' | 'zhou'
export type IssueStatus = 'todo' | 'doing' | 'review' | 'blocked' | 'done'
export type IssueType = 'story' | 'bug' | 'task' | 'tech'
export type Priority = 'high' | 'medium' | 'low'
export type DocScope = 'global' | 'project'
export type MilestoneStatus = 'done' | 'doing' | 'risk' | 'planned'
export type DocQueryText = string & { readonly __brand: 'DocQueryText' }
export type FeishuQueryCommand = { type: 'team' } | { type: 'blockers' } | { type: 'docs'; query: DocQueryText }
export type FeishuNotificationTrigger = '站会摘要' | '阻塞提醒' | '文档评论'
export type FeishuNotificationPayload =
  | { trigger: '站会摘要'; payload: { standupId: string } }
  | { trigger: '阻塞提醒'; payload: { issueKeys: string[] } }
  | { trigger: '文档评论'; payload: { docId: string; commentId: string } }

export interface Project {
  id: ProjectId
  name: string
  glyph: string
  color: string
  activeIterationCode: string
}

export interface Member {
  id: MemberId
  name: string
  role: string
  capacity: number
}

export interface Iteration {
  id: string
  projectId: ProjectId
  code: string
  name: string
  day: number
  totalDays: number
  goal: string
  velocity: number
}

export interface Issue {
  key: string
  projectId: ProjectId
  iterationId: string
  type: IssueType
  title: string
  status: IssueStatus
  priority: Priority
  assigneeId: MemberId
  storyPoints: number
  blockerReason?: string
  linkedDocIds: string[]
}

export interface DocComment {
  id: string
  docId: string
  authorId: MemberId
  body: string
  resolved: boolean
  createdAtLabel: string
}

export interface Doc {
  id: string
  scope: DocScope
  projectId?: ProjectId
  title: string
  directory: string
  body: string
  linkedIssueKeys: string[]
  comments: DocComment[]
  updatedAtLabel: string
}

export interface StandupItem {
  memberId: MemberId
  yesterday: string[]
  today: string[]
  blockers: string[]
}

export interface Standup {
  id: string
  projectId: ProjectId
  dateLabel: string
  timeLabel: string
  items: StandupItem[]
}

export interface Milestone {
  id: string
  projectId: ProjectId
  iterationId: string
  title: string
  startDay: number
  endDay: number
  status: MilestoneStatus
  ownerId: MemberId
}

export interface FeishuConfig {
  groups: string[]
  queryCommands: FeishuQueryCommand[]
  notificationTriggers: FeishuNotificationTrigger[]
}

export interface SeedData {
  navItems: string[]
  projects: Project[]
  members: Member[]
  iterations: Iteration[]
  issues: Issue[]
  docs: Doc[]
  standups: Standup[]
  milestones: Milestone[]
  feishu: FeishuConfig
}
```

- [ ] **Step 4: Add deterministic prototype fixtures**

Create `apps/agilix/src/domain/fixtures.ts`:

```ts
import { createDocQueryCommand } from './feishu'
import type { SeedData } from './types'

export const seedData: SeedData = {
  navItems: ['团队工作台', '项目总览', 'Issues', '看板', '迭代统计', '文档', '成员负载', '每日站会', '排期甘特', '飞书'],
  projects: [
    { id: 'search', name: '搜索平台', glyph: '搜', color: '#9f5f3f', activeIterationCode: 'S24' },
    { id: 'data', name: '数据看板', glyph: '数', color: '#3f6f6a', activeIterationCode: 'S12' },
    { id: 'api', name: '开放平台', glyph: '开', color: '#7d6a8f', activeIterationCode: 'S07' },
    { id: 'mobile', name: '移动端 App', glyph: '移', color: '#9a6a4a', activeIterationCode: 'S19' },
  ],
  members: [
    { id: 'lin', name: '林舟', role: 'Tech Lead', capacity: 10 },
    { id: 'chen', name: '陈牧', role: 'Frontend', capacity: 10 },
    { id: 'gao', name: '高远', role: 'Backend', capacity: 10 },
    { id: 'su', name: '苏晴', role: 'QA', capacity: 8 },
    { id: 'han', name: '韩序', role: 'Product', capacity: 8 },
    { id: 'he', name: '何川', role: 'Data', capacity: 8 },
    { id: 'jiang', name: '江月', role: 'Design', capacity: 8 },
    { id: 'zhou', name: '周然', role: 'Frontend', capacity: 8 },
  ],
  iterations: [
    { id: 'search-s24', projectId: 'search', code: 'S24', name: '搜索体验重构', day: 7, totalDays: 10, goal: '提升搜索结果理解与召回体验', velocity: 46 },
    { id: 'data-s12', projectId: 'data', code: 'S12', name: '指标自助配置', day: 4, totalDays: 10, goal: '让业务方自助搭建指标卡片', velocity: 34 },
    { id: 'api-s07', projectId: 'api', code: 'S07', name: '鉴权重构', day: 6, totalDays: 10, goal: '统一开放平台鉴权链路', velocity: 29 },
    { id: 'mobile-s19', projectId: 'mobile', code: 'S19', name: '离线缓存', day: 3, totalDays: 10, goal: '改善弱网下核心任务连续性', velocity: 31 },
  ],
  issues: [
    { key: 'SRCH-198', projectId: 'search', iterationId: 'search-s24', type: 'story', title: '向量召回 beta 开关接入', status: 'blocked', priority: 'high', assigneeId: 'gao', storyPoints: 8, blockerReason: '等待检索资源审批替代方案', linkedDocIds: ['doc-result-card'] },
    { key: 'SRCH-186', projectId: 'search', iterationId: 'search-s24', type: 'story', title: '搜索历史与收藏打通', status: 'review', priority: 'medium', assigneeId: 'zhou', storyPoints: 5, linkedDocIds: ['doc-result-card'] },
    { key: 'SRCH-209', projectId: 'search', iterationId: 'search-s24', type: 'bug', title: '空格 query 命中率骤降', status: 'doing', priority: 'high', assigneeId: 'su', storyPoints: 3, linkedDocIds: [] },
    { key: 'SRCH-201', projectId: 'search', iterationId: 'search-s24', type: 'tech', title: '检索日志接入留存分析', status: 'review', priority: 'medium', assigneeId: 'he', storyPoints: 3, linkedDocIds: [] },
    { key: 'SRCH-170', projectId: 'search', iterationId: 'search-s24', type: 'tech', title: '检索指标看板上线', status: 'done', priority: 'high', assigneeId: 'he', storyPoints: 5, linkedDocIds: ['doc-release-checklist'] },
    { key: 'DATA-42', projectId: 'data', iterationId: 'data-s12', type: 'story', title: '指标卡片字段配置', status: 'doing', priority: 'medium', assigneeId: 'chen', storyPoints: 5, linkedDocIds: [] },
    { key: 'MOB-77', projectId: 'mobile', iterationId: 'mobile-s19', type: 'task', title: '离线草稿恢复验证', status: 'todo', priority: 'low', assigneeId: 'han', storyPoints: 2, linkedDocIds: [] },
  ],
  docs: [
    {
      id: 'doc-result-card',
      scope: 'project',
      projectId: 'search',
      title: '结果卡片重设计方案',
      directory: '项目文档/搜索平台/方案',
      body: '摘要高亮、来源标、结果卡片信息结构。',
      linkedIssueKeys: ['SRCH-198', 'SRCH-186'],
      comments: [
        { id: 'comment-a', docId: 'doc-result-card', authorId: 'jiang', body: '高亮样式需要补图。', resolved: false, createdAtLabel: '12 分钟前' },
        { id: 'comment-b', docId: 'doc-result-card', authorId: 'gao', body: '补充灰度指标。', resolved: false, createdAtLabel: '8 分钟前' },
      ],
      updatedAtLabel: '12 分钟前',
    },
    {
      id: 'doc-release-checklist',
      scope: 'global',
      title: '灰度发布检查清单',
      directory: '全局文档/发布清单',
      body: '发布前检查、回滚步骤、通知模板。',
      linkedIssueKeys: ['SRCH-170'],
      comments: [],
      updatedAtLabel: '昨天',
    },
    {
      id: 'doc-issue-standard',
      scope: 'global',
      title: 'Issue 标题与验收标准规范',
      directory: '全局文档/规范',
      body: '创建 Issue 时引用，统一标题、验收标准和关联文档。',
      linkedIssueKeys: [],
      comments: [],
      updatedAtLabel: '2 天前',
    },
  ],
  standups: [
    {
      id: 'standup-search-today',
      projectId: 'search',
      dateLabel: '星期五',
      timeLabel: '10:00-10:15',
      items: [
        { memberId: 'gao', yesterday: ['推进 SRCH-198 beta 开关接入'], today: ['解除检索资源阻塞'], blockers: ['SRCH-198'] },
        { memberId: 'zhou', yesterday: ['完成 SRCH-186 联调'], today: ['处理 Review 意见'], blockers: [] },
        { memberId: 'su', yesterday: ['复现空格 query 问题'], today: ['补充回归用例'], blockers: [] },
      ],
    },
  ],
  milestones: [
    { id: 'ms-design', projectId: 'search', iterationId: 'search-s24', title: '方案冻结', startDay: 1, endDay: 2, status: 'done', ownerId: 'jiang' },
    { id: 'ms-beta', projectId: 'search', iterationId: 'search-s24', title: 'Beta 开关接入', startDay: 3, endDay: 7, status: 'risk', ownerId: 'gao' },
    { id: 'ms-release', projectId: 'search', iterationId: 'search-s24', title: '灰度发布', startDay: 8, endDay: 10, status: 'planned', ownerId: 'lin' },
  ],
  feishu: {
    groups: ['AgiliX 团队群'],
    queryCommands: [{ type: 'team' }, { type: 'blockers' }, createDocQueryCommand('结果卡片')],
    notificationTriggers: ['站会摘要', '阻塞提醒', '文档评论'],
  },
}
```

- [ ] **Step 5: Run GREEN**

Run:

```bash
pnpm --filter @agilix/app test -- src/domain/fixtures.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/agilix/src/domain/types.ts apps/agilix/src/domain/fixtures.ts apps/agilix/src/domain/fixtures.test.ts
git commit -m "feat: add full AgiliX domain fixtures"
```

## Task 3: Add Pure Domain Behavior

**Files:**
- Create: `apps/agilix/src/domain/full-domain.test.ts`
- Create: `apps/agilix/src/domain/issues.ts`
- Create: `apps/agilix/src/domain/docs.ts`
- Create: `apps/agilix/src/domain/workbench.ts`
- Create: `apps/agilix/src/domain/iterations.ts`
- Create: `apps/agilix/src/domain/workload.ts`
- Create: `apps/agilix/src/domain/standup.ts`
- Create: `apps/agilix/src/domain/gantt.ts`
- Create: `apps/agilix/src/domain/feishu.ts`

- [ ] **Step 1: Write the failing domain behavior test**

Create `apps/agilix/src/domain/full-domain.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { seedData } from './fixtures'
import { buildDocDirectoryTree, searchDocs } from './docs'
import { buildFeishuReply, createDocQueryCommand, parseFeishuCommand } from './feishu'
import { buildGanttRows } from './gantt'
import { buildIterationStats } from './iterations'
import { filterIssues, groupIssuesByStatus, moveIssue } from './issues'
import { buildStandupSummary } from './standup'
import { buildWorkbenchSnapshot } from './workbench'
import { buildWorkloadRows } from './workload'

describe('full AgiliX domain behavior', () => {
  it('builds every product view from shared prototype data', () => {
    expect(filterIssues(seedData.issues, { projectId: 'search', status: 'all', assigneeId: 'all', keyword: '' }).every((issue) => issue.projectId === 'search')).toBe(true)
    expect(filterIssues(seedData.issues, { projectId: 'all', status: 'all', assigneeId: 'all', keyword: 'SRCH-198' }).map((issue) => issue.key)).toEqual(['SRCH-198'])
    expect(groupIssuesByStatus(seedData.issues).blocked.map((issue) => issue.key)).toEqual(['SRCH-198'])
    expect(moveIssue(seedData.issues, 'SRCH-186', 'done').find((issue) => issue.key === 'SRCH-186')?.status).toBe('done')
    expect(buildDocDirectoryTree(seedData.docs).map((node) => node.name)).toEqual(['全局文档', '项目文档'])
    expect(searchDocs(seedData.docs, '结果卡片').map((doc) => doc.id)).toEqual(['doc-result-card'])
    expect(searchDocs(seedData.docs, ' 结果卡片')).toEqual([])
    expect(buildWorkbenchSnapshot(seedData).attentionIssueKeys).toEqual(['SRCH-198', 'SRCH-186', 'SRCH-201'])
    expect(buildIterationStats(seedData, 'search', 'S24').completionPercent).toBe(21)
    expect(buildWorkloadRows(seedData).find((row) => row.memberId === 'gao')?.loadPercent).toBe(80)
    expect(buildStandupSummary(seedData, 'search').blockers).toEqual(['SRCH-198'])
    expect(buildGanttRows(seedData, 'search').map((row) => row.title)).toEqual(['方案冻结', 'Beta 开关接入', '灰度发布'])
    expect(buildFeishuReply(createDocQueryCommand('结果卡片'), seedData).title).toBe('文档查询')
    expect(() => createDocQueryCommand('   ')).toThrow('Document query must not be empty')
    expect(() => createDocQueryCommand(' 结果卡片')).toThrow('Document query must not include leading or trailing whitespace')
    expect(() => parseFeishuCommand(' /team')).toThrow('Unsupported Feishu command')
    expect(() => parseFeishuCommand('/unknown')).toThrow('Unsupported Feishu command')
  })
})
```

- [ ] **Step 2: Run RED**

Run:

```bash
pnpm --filter @agilix/app test -- src/domain/full-domain.test.ts
```

Expected: FAIL because the domain modules do not exist.

- [ ] **Step 3: Add issue behavior**

Create `apps/agilix/src/domain/issues.ts`:

```ts
import type { Issue, IssueStatus, MemberId, ProjectId } from './types'

interface IssueFilters {
  projectId: ProjectId | 'all'
  status: IssueStatus | 'all'
  assigneeId: MemberId | 'all'
  keyword: string
}

export function filterIssues(issues: Issue[], filters: IssueFilters): Issue[] {
  const keyword = filters.keyword.toLowerCase()

  return issues.filter((issue) => {
    if (filters.projectId !== 'all' && issue.projectId !== filters.projectId) return false
    if (filters.status !== 'all' && issue.status !== filters.status) return false
    if (filters.assigneeId !== 'all' && issue.assigneeId !== filters.assigneeId) return false
    if (keyword && !`${issue.key} ${issue.title}`.toLowerCase().includes(keyword)) return false
    return true
  })
}

export function groupIssuesByStatus(issues: Issue[]): Record<IssueStatus, Issue[]> {
  return {
    todo: issues.filter((issue) => issue.status === 'todo'),
    doing: issues.filter((issue) => issue.status === 'doing'),
    review: issues.filter((issue) => issue.status === 'review'),
    blocked: issues.filter((issue) => issue.status === 'blocked'),
    done: issues.filter((issue) => issue.status === 'done'),
  }
}

export function moveIssue(issues: Issue[], issueKey: string, status: IssueStatus): Issue[] {
  return issues.map((issue) => (issue.key === issueKey ? { ...issue, status } : issue))
}
```

- [ ] **Step 4: Add document behavior**

Create `apps/agilix/src/domain/docs.ts`:

```ts
import type { Doc, ProjectId } from './types'

export interface DirectoryNode {
  name: string
  count: number
}

export function buildDocDirectoryTree(docs: Doc[]): DirectoryNode[] {
  return [
    { name: '全局文档', count: docs.filter((doc) => doc.scope === 'global').length },
    { name: '项目文档', count: docs.filter((doc) => doc.scope === 'project').length },
  ]
}

export function filterDocs(docs: Doc[], projectId: ProjectId | 'all'): Doc[] {
  if (projectId === 'all') return docs
  return docs.filter((doc) => doc.scope === 'global' || doc.projectId === projectId)
}

export function searchDocs(docs: Doc[], keyword: string): Doc[] {
  const normalized = keyword.toLowerCase()
  return docs.filter((doc) => `${doc.title} ${doc.body} ${doc.comments.map((comment) => comment.body).join(' ')}`.toLowerCase().includes(normalized))
}
```

- [ ] **Step 5: Add workbench, iteration, workload, standup, gantt, and Feishu behavior**

Create `apps/agilix/src/domain/workbench.ts`:

```ts
import type { SeedData } from './types'

export function buildWorkbenchSnapshot(data: SeedData) {
  const attentionIssueKeys = data.issues.filter((issue) => issue.status === 'blocked' || issue.status === 'review').map((issue) => issue.key)
  const donePoints = data.issues.filter((issue) => issue.status === 'done').reduce((sum, issue) => sum + issue.storyPoints, 0)
  const totalPoints = data.issues.reduce((sum, issue) => sum + issue.storyPoints, 0)

  return {
    attentionIssueKeys,
    completionPercent: Math.round((donePoints / totalPoints) * 100),
    recentDocTitles: data.docs.map((doc) => doc.title),
    feishuMode: '通知 / 查询',
  }
}
```

Create `apps/agilix/src/domain/iterations.ts`:

```ts
import type { ProjectId, SeedData } from './types'

export function buildIterationStats(data: SeedData, projectId: ProjectId, iterationCode: string) {
  const iteration = data.iterations.find((item) => item.projectId === projectId && item.code === iterationCode)
  if (!iteration) throw new Error(`Iteration not found: ${projectId}/${iterationCode}`)

  const issues = data.issues.filter((issue) => issue.projectId === projectId && issue.iterationId === iteration.id)
  const totalPoints = issues.reduce((sum, issue) => sum + issue.storyPoints, 0)
  const donePoints = issues.filter((issue) => issue.status === 'done').reduce((sum, issue) => sum + issue.storyPoints, 0)

  return {
    iteration,
    totalPoints,
    donePoints,
    completionPercent: Math.round((donePoints / totalPoints) * 100),
    blockedCount: issues.filter((issue) => issue.status === 'blocked').length,
    velocity: iteration.velocity,
  }
}
```

Create `apps/agilix/src/domain/workload.ts`:

```ts
import type { SeedData } from './types'

export function buildWorkloadRows(data: SeedData) {
  return data.members.map((member) => {
    const activeIssues = data.issues.filter((issue) => issue.assigneeId === member.id && issue.status !== 'done')
    const assignedPoints = activeIssues.reduce((sum, issue) => sum + issue.storyPoints, 0)

    return {
      memberId: member.id,
      name: member.name,
      activeIssueKeys: activeIssues.map((issue) => issue.key),
      assignedPoints,
      loadPercent: Math.round((assignedPoints / member.capacity) * 100),
    }
  })
}
```

Create `apps/agilix/src/domain/standup.ts`:

```ts
import type { ProjectId, SeedData } from './types'

export function buildStandupSummary(data: SeedData, projectId: ProjectId) {
  const standup = data.standups.find((item) => item.projectId === projectId)
  if (!standup) throw new Error(`Standup not found: ${projectId}`)

  return {
    dateLabel: standup.dateLabel,
    timeLabel: standup.timeLabel,
    yesterdayCount: standup.items.reduce((sum, item) => sum + item.yesterday.length, 0),
    todayCount: standup.items.reduce((sum, item) => sum + item.today.length, 0),
    blockers: standup.items.flatMap((item) => item.blockers),
  }
}
```

Create `apps/agilix/src/domain/gantt.ts`:

```ts
import type { ProjectId, SeedData } from './types'

export function buildGanttRows(data: SeedData, projectId: ProjectId) {
  return data.milestones
    .filter((milestone) => milestone.projectId === projectId)
    .sort((left, right) => left.startDay - right.startDay)
    .map((milestone) => ({
      id: milestone.id,
      title: milestone.title,
      startDay: milestone.startDay,
      endDay: milestone.endDay,
      status: milestone.status,
      ownerId: milestone.ownerId,
    }))
}
```

Create `apps/agilix/src/domain/feishu.ts`:

```ts
import type { DocQueryText, FeishuQueryCommand, SeedData } from './types'
import { searchDocs } from './docs'

function createDocQueryText(value: string): DocQueryText {
  if (value.trim().length === 0) throw new Error('Document query must not be empty')
  if (value !== value.trim()) throw new Error('Document query must not include leading or trailing whitespace')
  return value as DocQueryText
}

export function createDocQueryCommand(query: string): FeishuQueryCommand {
  return { type: 'docs', query: createDocQueryText(query) }
}

export function parseFeishuCommand(input: string): FeishuQueryCommand {
  if (input !== input.trim()) throw new Error(`Unsupported Feishu command: ${input}`)
  if (input === '/team') return { type: 'team' }
  if (input === '/blockers') return { type: 'blockers' }
  if (/^\/docs \S.*$/.test(input)) return createDocQueryCommand(input.slice('/docs '.length))
  throw new Error(`Unsupported Feishu command: ${input}`)
}

export function formatFeishuCommand(command: FeishuQueryCommand): string {
  if (command.type === 'team') return '/team'
  if (command.type === 'blockers') return '/blockers'
  return `/docs ${command.query}`
}

export function buildFeishuReply(command: FeishuQueryCommand, data: SeedData): { title: string; lines: string[] } {
  if (command.type === 'team') {
    return { title: '团队状态', lines: [`Issue ${data.issues.length}`, `文档 ${data.docs.length}`, `飞书群 ${data.feishu.groups[0]}`] }
  }

  if (command.type === 'blockers') {
    return { title: '阻塞列表', lines: data.issues.filter((issue) => issue.status === 'blocked').map((issue) => `${issue.key} ${issue.title}`) }
  }

  return { title: '文档查询', lines: searchDocs(data.docs, command.query).map((doc) => `${doc.title} · 未解决评论 ${doc.comments.filter((comment) => !comment.resolved).length}`) }
}
```

- [ ] **Step 6: Run GREEN**

Run:

```bash
pnpm --filter @agilix/app test -- src/domain/full-domain.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run all app tests**

Run:

```bash
pnpm --filter @agilix/app test
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/agilix/src/domain
git commit -m "feat: add full AgiliX domain behavior"
```

## Task 4: Extract the Flat Shell Component

**Files:**
- Create: `apps/agilix/src/components/Shell.tsx`
- Create: `apps/agilix/src/components/Shell.test.tsx`
- Modify: `apps/agilix/src/App.tsx`

- [ ] **Step 1: Write the failing shell component test**

Create `apps/agilix/src/components/Shell.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Shell } from './Shell'

describe('Shell', () => {
  it('renders flat navigation and sends navigation changes upward', async () => {
    const onNavigate = vi.fn()

    render(
      <Shell active="文档" onNavigate={onNavigate}>
        <h1>文档</h1>
      </Shell>,
    )

    expect(screen.getByRole('link', { name: '文档' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByText('搜索平台 · S24')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: '看板' }))
    expect(onNavigate).toHaveBeenCalledWith('看板')
  })
})
```

- [ ] **Step 2: Run RED**

Run:

```bash
pnpm --filter @agilix/app test -- src/components/Shell.test.tsx
```

Expected: FAIL because `Shell.tsx` does not exist.

- [ ] **Step 3: Add shell component**

Create `apps/agilix/src/components/Shell.tsx`:

```tsx
import type { ReactNode } from 'react'

export const navItems = ['团队工作台', '项目总览', 'Issues', '看板', '迭代统计', '文档', '成员负载', '每日站会', '排期甘特', '飞书'] as const

export type NavItem = (typeof navItems)[number]

export function Shell({ active, children, onNavigate }: { active: NavItem; children: ReactNode; onNavigate: (item: NavItem) => void }) {
  return (
    <div className="agilix-shell">
      <aside>
        <strong>AgiliX</strong>
        <nav aria-label="主导航">
          {navItems.map((item) => (
            <a
              key={item}
              href={`#${item}`}
              aria-current={item === active ? 'page' : undefined}
              onClick={(event) => {
                event.preventDefault()
                onNavigate(item)
              }}
            >
              {item}
            </a>
          ))}
        </nav>
      </aside>
      <section>{children}</section>
    </div>
  )
}
```

- [ ] **Step 4: Wire `App` to `Shell`**

Modify `apps/agilix/src/App.tsx`:

```tsx
import { useState } from 'react'
import { Shell, type NavItem } from './components/Shell'

const pageTitles: Record<NavItem, string> = {
  团队工作台: '团队工作台',
  项目总览: '项目总览',
  Issues: 'Issues',
  看板: '看板',
  迭代统计: '迭代统计',
  文档: '文档',
  成员负载: '成员负载',
  每日站会: '每日站会',
  排期甘特: '排期甘特',
  飞书: '飞书',
}

export function App() {
  const [active, setActive] = useState<NavItem>('团队工作台')

  return (
    <Shell active={active} onNavigate={setActive}>
      <main>
        <h1>{pageTitles[active]}</h1>
        {active === '团队工作台' ? <p>AgiliX 主工作台</p> : null}
      </main>
    </Shell>
  )
}
```

- [ ] **Step 5: Run GREEN**

Run:

```bash
pnpm --filter @agilix/app test -- src/components/Shell.test.tsx src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Run package build**

Run:

```bash
pnpm --filter @agilix/app build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/agilix/src/App.tsx apps/agilix/src/components
git commit -m "feat: add AgiliX flat shell"
```

## Self-Review

- Spec coverage: Phase 1 covers app scaffold, full product navigation, prototype fixtures, pure domain behavior, and flat shell.
- Scope check: API, persistence, detailed route UI, browser workflows, and Feishu integration are intentionally deferred to later phase plans.
- TDD check: Each task starts with a failing test and a RED command before production code.
- Type consistency: `ProjectId`, `MemberId`, `IssueStatus`, `SeedData`, and module function signatures match across tests and implementation snippets.
- Placeholder scan: No unresolved placeholder markers or unfilled sections remain.
