# AgiliX Real API E2E UI Business Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Playwright e2e UI suite that tests every implemented AgiliX page, every wired function point, and the core business flows through the real local API.

**Architecture:** Playwright must run the real local Hono API server and the real Vite frontend together. Tests may observe browser requests and responses, but must not intercept, stub, fulfill, or replace any `/api` request. Test repeatability comes from a real local-only API reset endpoint that reseeds the in-memory development repository before each e2e test.

**Tech Stack:** Playwright, Vite dev server, Hono local API server on `127.0.0.1:8788`, React 19, TypeScript, existing `seedData`, existing local API route contracts.

**Execution Constraint:** Work only on `main`. Do not create a git worktree or a feature branch.

---

## Non-Negotiable Test Rules

- Do not use `page.route()` in AgiliX e2e tests.
- Do not call `route.fulfill()`.
- Do not add Playwright API interception helpers.
- Do not replace `/api/*` responses inside the browser.
- Use `page.waitForRequest()` and `page.waitForResponse()` only for observation.
- Mutations must be verified by calling the real API after the UI action, normally `GET http://127.0.0.1:8788/api/bootstrap`.
- Each test must reset the real local API state before navigating the UI.
- Run e2e tests with one worker because all tests share the same local in-memory API server.

---

## Feature Coverage Matrix

| Surface | Function points to test through real API |
| --- | --- |
| Shell | all nav links, active page changes, sidebar project context, online facepile, counts |
| 团队工作台 | search/new issue buttons route to Issues, quick actions route to Standup/Issues/Docs, status summaries render |
| 项目总览 | summary metrics, project cards, new project modal open/cancel/create, invalid calendar JSON error, created project persists after refresh |
| 需求 & 缺陷 | search open/fill, issue type filters, project filter all/search/data/api/mobile, export notice, new ticket notice, grouped ledger |
| 看板 | board/table/timeline modes, status filters, search, move issue to done through `PATCH /api/issues/:key/status`, notification route, new issue route |
| 迭代统计 | project chip render, export weekly report notice, metrics/charts/distribution render |
| 文档 | tabs, project filter, directory selection, quick filters, doc row open, comment submit, create modal, markdown/mermaid/diagram/mindmap previews, directory create/rename/delete, issue search/link |
| 成员负载 | summary metrics, all 8 rows, over/tight/ok/light states, assign work button routes to Issues |
| 每日站会 | standup calendar metadata, member rows, blocker display, save/push through `PUT /api/standups/:id` and `POST /api/feishu/notifications` |
| 排期甘特 | zoom segmented controls visible, Feishu sync route, save milestone through `PUT /api/milestones/:id`, gantt rows/milestones |
| 飞书 | sync group config, open console notice, notification triggers, command query calls through `POST /api/feishu/query` |
| Business flows | issue triage from Team to Issues/Board, docs linked to issues, standup to Feishu, gantt to Feishu, project creation then app refresh |

---

## File Structure

- Create: `apps/agilix/e2e/support/agilixRealApi.ts`
  - Owns real API reset, real API state reads, and response helpers.
- Create: `apps/agilix/e2e/support/agilixPage.ts`
  - Owns role-based navigation helpers and page assertions.
- Create: `apps/agilix/e2e/shell-navigation.spec.ts`
  - Verifies shell navigation and page identity for every route.
- Create: `apps/agilix/e2e/page-team-projects.spec.ts`
  - Verifies Team Workbench and Projects page functions.
- Create: `apps/agilix/e2e/page-issues-board.spec.ts`
  - Verifies Issues ledger and Board page functions.
- Create: `apps/agilix/e2e/page-docs.spec.ts`
  - Verifies document management functions and create modal flows.
- Create: `apps/agilix/e2e/page-planning-feishu.spec.ts`
  - Verifies Stats, Workload, Standup, Gantt, and Feishu page functions.
- Create: `apps/agilix/e2e/business-flows.spec.ts`
  - Verifies end-to-end business workflows that cross page boundaries.
- Modify: `apps/agilix-api/src/localDevServer.test.ts`
  - Adds tests for local e2e reset behavior.
- Modify: `apps/agilix-api/src/localDevServer.ts`
  - Adds `POST /api/dev/reset` only when `AGILIX_ENABLE_E2E_RESET=1`.
- Modify: `apps/agilix/playwright.config.ts`
  - Starts both real API and real frontend web servers, sets `workers: 1`.
- Modify: `apps/agilix/e2e/full-flow.spec.ts`
  - Removes existing API interception and uses the real API helper.
- Modify: `apps/agilix/e2e/prototype-visual.audit.ts`
  - Removes existing API interception and uses the real API helper.
- Modify: `apps/agilix/package.json`
  - Adds `"e2e:ui": "playwright test -c playwright.config.ts"`.

---

### Task 1: Real Local API Reset And Playwright Server Wiring

**Files:**
- Modify: `apps/agilix-api/src/localDevServer.test.ts`
- Modify: `apps/agilix-api/src/localDevServer.ts`
- Modify: `apps/agilix/playwright.config.ts`
- Modify: `apps/agilix/package.json`

- [ ] **Step 1: Write the failing local reset API test**

Add this test to `apps/agilix-api/src/localDevServer.test.ts`:

```ts
import { seedData } from '@agilix/app/domain/fixtures'
import { describe, expect, it } from 'vitest'
import { createLocalDevApiFetch } from './localDevServer'

describe('local dev API reset endpoint', () => {
  it('resets the local repository only when e2e reset is explicitly enabled', async () => {
    const fetchApi = createLocalDevApiFetch({ enableE2eReset: true })

    const created = await fetchApi(
      new Request('http://localhost:8788/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          project: {
            id: 'growth',
            name: '增长实验室',
            glyph: '增',
            color: '#6f7f5b',
            activeIterationCode: 'S01',
          },
          iteration: {
            id: 'growth-s01',
            projectId: 'growth',
            code: 'S01',
            title: '增长第一期',
            dateRange: '6.10-6.21',
            progress: 0,
          },
        }),
      }),
    )
    expect(created.status).toBe(201)

    const reset = await fetchApi(new Request('http://localhost:8788/api/dev/reset', { method: 'POST' }))
    expect(reset.status).toBe(204)

    const bootstrap = await fetchApi(new Request('http://localhost:8788/api/bootstrap'))
    const data = (await bootstrap.json()) as typeof seedData
    expect(data.projects.map((project) => project.id)).toEqual(['search', 'data', 'api', 'mobile'])
  })

  it('does not expose reset when e2e reset is disabled', async () => {
    const fetchApi = createLocalDevApiFetch({ enableE2eReset: false })

    const response = await fetchApi(new Request('http://localhost:8788/api/dev/reset', { method: 'POST' }))

    expect(response.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run the failing API test**

Run:

```bash
pnpm --filter @agilix/api test -- src/localDevServer.test.ts
```

Expected: FAIL because `createLocalDevApiFetch` does not accept options and `/api/dev/reset` is not implemented.

- [ ] **Step 3: Implement the real local reset endpoint**

Modify `apps/agilix-api/src/localDevServer.ts`:

```ts
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import { seedData } from '@agilix/app/domain/fixtures'
import { createApp } from './app'
import { createMemoryRepository } from './test/memoryRepository'

const defaultPort = 8788
const defaultHost = '127.0.0.1'

type LocalDevApiOptions = {
  enableE2eReset?: boolean
}

export function createLocalDevApiFetch(options: LocalDevApiOptions = {}) {
  let fetchApi = createApp(createMemoryRepository(seedData)).fetch

  return async (request: Request) => {
    const url = new URL(request.url)
    if (url.pathname === '/api/dev/reset' && request.method === 'POST') {
      if (!options.enableE2eReset) return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 })
      fetchApi = createApp(createMemoryRepository(seedData)).fetch
      return new Response(null, { status: 204 })
    }
    return fetchApi(request)
  }
}

export function createLocalDevApiServer(options: LocalDevApiOptions = {}) {
  const fetchApi = createLocalDevApiFetch(options)

  return createServer(async (incoming, outgoing) => {
    try {
      const request = nodeRequestToWebRequest(incoming)
      const response = await fetchApi(request)
      await writeWebResponse(outgoing, response)
    } catch (error) {
      outgoing.statusCode = 500
      outgoing.setHeader('content-type', 'application/json')
      outgoing.end(JSON.stringify({ message: error instanceof Error ? error.message : 'Unknown error' }))
    }
  })
}

function nodeRequestToWebRequest(incoming: IncomingMessage): Request {
  const host = incoming.headers.host ?? `${defaultHost}:${defaultPort}`
  const url = `http://${host}${incoming.url ?? '/'}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(incoming.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item)
    } else if (value !== undefined) {
      headers.set(key, value)
    }
  }

  if (incoming.method === 'GET' || incoming.method === 'HEAD') {
    return new Request(url, { headers, method: incoming.method })
  }

  return new Request(url, {
    body: Readable.toWeb(incoming) as ReadableStream,
    duplex: 'half',
    headers,
    method: incoming.method,
  } as RequestInit & { duplex: 'half' })
}

async function writeWebResponse(outgoing: ServerResponse, response: Response) {
  outgoing.statusCode = response.status
  response.headers.forEach((value, key) => outgoing.setHeader(key, value))

  if (!response.body) {
    outgoing.end()
    return
  }

  for await (const chunk of response.body) {
    outgoing.write(chunk)
  }
  outgoing.end()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.AGILIX_API_PORT ?? defaultPort)
  const host = process.env.AGILIX_API_HOST ?? defaultHost
  createLocalDevApiServer({ enableE2eReset: process.env.AGILIX_ENABLE_E2E_RESET === '1' }).listen(port, host, () => {
    console.log(`AgiliX API listening on http://${host}:${port}`)
  })
}
```

- [ ] **Step 4: Verify the API test passes**

Run:

```bash
pnpm --filter @agilix/api test -- src/localDevServer.test.ts
```

Expected: PASS.

- [ ] **Step 5: Configure Playwright to run real API and frontend**

Modify `apps/agilix/playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  webServer: [
    {
      command: 'AGILIX_ENABLE_E2E_RESET=1 pnpm --dir ../.. --filter @agilix/api dev',
      url: 'http://127.0.0.1:8788/api/bootstrap',
      reuseExistingServer: true,
    },
    {
      command: 'AGILIX_API_ORIGIN=http://127.0.0.1:8788 pnpm dev --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: true,
    },
  ],
  use: {
    baseURL: 'http://127.0.0.1:5173',
  },
})
```

- [ ] **Step 6: Add the e2e UI script**

Modify `apps/agilix/package.json` scripts:

```json
{
  "e2e": "playwright test",
  "e2e:ui": "playwright test -c playwright.config.ts",
  "visual:audit": "playwright test -c playwright.visual.config.ts"
}
```

- [ ] **Step 7: Verify there is no Playwright API interception in e2e files**

Run:

```bash
rg -n "page\\.route|route\\.fulfill|fulfill\\(|mockAgiliXApi|setupAgiliXApiMock|agilixApiMock" apps/agilix/e2e apps/agilix/playwright.config.ts
```

Expected: FAIL now because existing e2e files still contain interception. Later tasks remove every match.

---

### Task 2: Real API E2E Helpers

**Files:**
- Create: `apps/agilix/e2e/support/agilixRealApi.ts`
- Create: `apps/agilix/e2e/support/agilixPage.ts`
- Test: `apps/agilix/e2e/shell-navigation.spec.ts`

- [ ] **Step 1: Write the first failing navigation test**

Create `apps/agilix/e2e/shell-navigation.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { createAgiliXRealApi } from './support/agilixRealApi'
import { expectPageHeading, gotoAgiliX, openNav } from './support/agilixPage'

test('shell exposes every implemented page and navigates by accessible names', async ({ page, request }) => {
  const api = createAgiliXRealApi(request)
  await api.reset()
  await gotoAgiliX(page)

  for (const label of [
    '团队工作台',
    '项目总览',
    '需求 & 缺陷',
    '看板',
    '迭代统计',
    '文档',
    '成员负载',
    '每日站会',
    '排期甘特',
    '群机器人',
  ]) {
    await expect(page.getByRole('link', { name: label })).toBeVisible()
  }

  await openNav(page, '项目总览')
  await expectPageHeading(page, '项目总览')
})
```

- [ ] **Step 2: Run the failing helper test**

Run:

```bash
pnpm --filter @agilix/app exec playwright test e2e/shell-navigation.spec.ts
```

Expected: FAIL with module resolution errors for `./support/agilixRealApi` and `./support/agilixPage`.

- [ ] **Step 3: Add the real API helper**

Create `apps/agilix/e2e/support/agilixRealApi.ts`:

```ts
import { expect, type APIRequestContext, type Response } from '@playwright/test'
import type { SeedData } from '../../src/domain/types'

const apiOrigin = 'http://127.0.0.1:8788'

export type AgiliXRealApi = {
  reset(): Promise<void>
  loadData(): Promise<SeedData>
  expectOk(response: Response, status: number): Promise<void>
}

export function createAgiliXRealApi(request: APIRequestContext): AgiliXRealApi {
  return {
    async reset() {
      const response = await request.post(`${apiOrigin}/api/dev/reset`)
      expect(response.status()).toBe(204)
    },

    async loadData() {
      const response = await request.get(`${apiOrigin}/api/bootstrap`)
      expect(response.status()).toBe(200)
      return (await response.json()) as SeedData
    },

    async expectOk(response, status) {
      expect(response.status()).toBe(status)
    },
  }
}
```

- [ ] **Step 4: Add page helpers**

Create `apps/agilix/e2e/support/agilixPage.ts`:

```ts
import { expect, type Page } from '@playwright/test'

export async function gotoAgiliX(page: Page) {
  await page.goto('/')
  await expect(page.getByText('研发台账')).toBeVisible()
}

export async function openNav(page: Page, label: string) {
  await page.getByRole('link', { name: label }).click()
}

export async function expectPageHeading(page: Page, heading: string) {
  await expect(page.getByRole('heading', { name: heading })).toBeVisible()
}

export async function chooseProject(page: Page, projectName: string) {
  await page.getByRole('button', { name: /项目筛选/ }).click()
  await page.getByRole('menuitem', { name: projectName }).click()
}

export async function expectStatusText(page: Page, text: string) {
  await expect(page.getByRole('status')).toContainText(text)
}
```

- [ ] **Step 5: Verify the first real API e2e test passes**

Run:

```bash
pnpm --filter @agilix/app exec playwright test e2e/shell-navigation.spec.ts
```

Expected: PASS. Browser requests must hit `http://127.0.0.1:5173/api/*`, which Vite proxies to the real API at `http://127.0.0.1:8788`.

---

### Task 3: Page-Level Real API UI Coverage

**Files:**
- Create: `apps/agilix/e2e/page-team-projects.spec.ts`
- Create: `apps/agilix/e2e/page-issues-board.spec.ts`
- Create: `apps/agilix/e2e/page-docs.spec.ts`
- Create: `apps/agilix/e2e/page-planning-feishu.spec.ts`

- [ ] **Step 1: Add Team Workbench and Projects tests**

Create `apps/agilix/e2e/page-team-projects.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { createAgiliXRealApi } from './support/agilixRealApi'
import { expectPageHeading, gotoAgiliX, openNav } from './support/agilixPage'

test.beforeEach(async ({ request }) => {
  await createAgiliXRealApi(request).reset()
})

test('team workbench routes quick actions through the real app shell', async ({ page }) => {
  await gotoAgiliX(page)
  await expectPageHeading(page, '团队工作台')
  await expect(page.getByText('搜索平台')).toBeVisible()

  await page.getByRole('button', { name: '搜索' }).click()
  await expectPageHeading(page, '需求 & 缺陷')

  await openNav(page, '团队工作台')
  await page.getByRole('button', { name: '查看站会' }).click()
  await expectPageHeading(page, '每日站会')

  await openNav(page, '团队工作台')
  await page.getByRole('button', { name: '沉淀文档' }).click()
  await expectPageHeading(page, '文档')
})

test('projects page creates a project through the real API and persists after refresh', async ({ page, request }) => {
  const api = createAgiliXRealApi(request)
  await gotoAgiliX(page)
  await openNav(page, '项目总览')

  await page.getByRole('button', { name: '新建项目' }).click()
  await page.getByLabel('项目名称').fill('增长实验室')
  await page.getByLabel('项目标识').fill('growth')
  await page.getByLabel('项目字标').fill('增')
  await page.getByLabel('迭代编号').fill('S01')
  await page.getByLabel('迭代标题').fill('增长第一期')
  await page.getByLabel('迭代日期').fill('6.10-6.21')
  await page.getByLabel('日历周点数').fill('[12,14,16,18,20]')

  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/projects') && response.request().method() === 'POST')
  await page.getByRole('button', { name: '创建项目' }).click()
  expect((await responsePromise).status()).toBe(201)

  await expect(page.getByText('增长实验室')).toBeVisible()
  await page.reload()
  await expect(page.getByText('增长实验室')).toBeVisible()

  const data = await api.loadData()
  expect(data.projects.some((project) => project.id === 'growth')).toBe(true)
  expect(data.iterations.some((iteration) => iteration.id === 'growth-s01')).toBe(true)
})
```

- [ ] **Step 2: Add Issues and Board tests**

Create `apps/agilix/e2e/page-issues-board.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { createAgiliXRealApi } from './support/agilixRealApi'
import { chooseProject, gotoAgiliX, openNav } from './support/agilixPage'

test.beforeEach(async ({ request }) => {
  await createAgiliXRealApi(request).reset()
})

test('issues page filters, searches, exports, and opens create notice', async ({ page }) => {
  await gotoAgiliX(page)
  await openNav(page, '需求 & 缺陷')

  await chooseProject(page, '搜索平台')
  await expect(page.getByText('SRCH-186')).toBeVisible()

  await page.getByRole('button', { name: '筛选缺陷' }).click()
  await expect(page.getByText('SRCH-198')).toBeVisible()

  await page.getByRole('button', { name: '搜索' }).click()
  await page.getByPlaceholder('搜索标题、编号或标签').fill('召回')
  await expect(page.getByText('SRCH-198')).toBeVisible()

  await page.getByRole('button', { name: '导出' }).click()
  await expect(page.getByRole('status')).toContainText('导出')

  await page.getByRole('button', { name: '新建工单' }).click()
  await expect(page.getByRole('status')).toContainText('新建工单')
})

test('board modes and status move call the real issue API', async ({ page, request }) => {
  const api = createAgiliXRealApi(request)
  await gotoAgiliX(page)
  await openNav(page, '看板')
  await chooseProject(page, '搜索平台')

  await page.getByRole('button', { name: '表格' }).click()
  await expect(page.getByRole('table')).toBeVisible()

  await page.getByRole('button', { name: '时间线' }).click()
  await expect(page.getByText('时间线')).toBeVisible()

  await page.getByRole('button', { name: '看板' }).click()
  const requestPromise = page.waitForRequest((sent) => sent.url().includes('/api/issues/SRCH-186/status') && sent.method() === 'PATCH')
  const responsePromise = page.waitForResponse((response) => response.url().includes('/api/issues/SRCH-186/status') && response.request().method() === 'PATCH')
  await page.getByRole('button', { name: '完成 SRCH-186' }).click()

  expect((await requestPromise).postDataJSON()).toEqual({ status: 'done' })
  expect((await responsePromise).status()).toBe(204)

  const data = await api.loadData()
  expect(data.issues.find((issue) => issue.key === 'SRCH-186')?.status).toBe('done')
})
```

- [ ] **Step 3: Add Docs tests**

Create `apps/agilix/e2e/page-docs.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { createAgiliXRealApi } from './support/agilixRealApi'
import { chooseProject, gotoAgiliX, openNav } from './support/agilixPage'

test.beforeEach(async ({ request }) => {
  await createAgiliXRealApi(request).reset()
})

test('docs page filters, opens a doc, and submits a comment through the real API', async ({ page, request }) => {
  const api = createAgiliXRealApi(request)
  await gotoAgiliX(page)
  await openNav(page, '文档')
  await chooseProject(page, '搜索平台')

  await page.getByRole('button', { name: '项目文档' }).click()
  await page.getByText('结果卡片重设计方案').click()
  await expect(page.getByRole('heading', { name: '结果卡片重设计方案' })).toBeVisible()

  await page.getByLabel('评论内容').fill('E2E 评论确认真实 API')
  const responsePromise = page.waitForResponse((response) => response.url().includes('/api/docs/doc-result-card/comments') && response.request().method() === 'POST')
  await page.getByRole('button', { name: '发表评论' }).click()
  expect((await responsePromise).status()).toBe(201)

  const data = await api.loadData()
  expect(data.docs.find((doc) => doc.id === 'doc-result-card')?.comments.some((comment) => comment.body === 'E2E 评论确认真实 API')).toBe(true)
})

test('docs create modal creates markdown, mermaid, diagram, and mindmap documents through the real API', async ({ page, request }) => {
  const api = createAgiliXRealApi(request)
  await gotoAgiliX(page)
  await openNav(page, '文档')

  for (const item of [
    { type: 'Markdown', title: 'E2E Markdown 文档', body: '# 标题\\n\\n```mermaid\\ngraph TD\\nA-->B\\n```' },
    { type: '脑图', title: 'E2E 脑图文档', body: '# 根节点\\n## 子节点' },
    { type: 'Diagram', title: 'E2E Diagram 文档', body: 'graph TD\\nStart-->Done' },
  ]) {
    await page.getByRole('button', { name: '新建文档' }).click()
    await page.getByLabel('文档标题').fill(item.title)
    await page.getByLabel('文档类型').selectOption({ label: item.type })
    await page.getByLabel('正文内容').fill(item.body)
    await page.getByRole('button', { name: '创建文档' }).click()
    await expect(page.getByText(item.title)).toBeVisible()
  }

  const data = await api.loadData()
  expect(data.docs.some((doc) => doc.title === 'E2E Markdown 文档')).toBe(true)
  expect(data.docs.some((doc) => doc.title === 'E2E 脑图文档')).toBe(true)
  expect(data.docs.some((doc) => doc.title === 'E2E Diagram 文档')).toBe(true)
})
```

- [ ] **Step 4: Add Planning, Workload, Standup, Gantt, and Feishu tests**

Create `apps/agilix/e2e/page-planning-feishu.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { createAgiliXRealApi } from './support/agilixRealApi'
import { gotoAgiliX, openNav } from './support/agilixPage'

test.beforeEach(async ({ request }) => {
  await createAgiliXRealApi(request).reset()
})

test('stats and workload pages render seeded real API data', async ({ page }) => {
  await gotoAgiliX(page)
  await openNav(page, '迭代统计')
  await expect(page.getByText('近五迭代速度')).toBeVisible()

  await openNav(page, '成员负载')
  for (const member of ['何川', '高远', '周然', '陈牧', '苏晴', '韩序', '林舟', '江月']) {
    await expect(page.getByText(member)).toBeVisible()
  }
  await expect(page.getByText('70')).toBeVisible()
})

test('standup save and push use the real API', async ({ page, request }) => {
  const api = createAgiliXRealApi(request)
  await gotoAgiliX(page)
  await openNav(page, '每日站会')

  const saveResponse = page.waitForResponse((response) => response.url().includes('/api/standups/standup-search-today') && response.request().method() === 'PUT')
  await page.getByRole('button', { name: '保存站会' }).click()
  expect((await saveResponse).status()).toBe(204)

  const pushResponse = page.waitForResponse((response) => response.url().endsWith('/api/feishu/notifications') && response.request().method() === 'POST')
  await page.getByRole('button', { name: '推送纪要到群' }).click()
  expect((await pushResponse).status()).toBe(201)

  const data = await api.loadData()
  expect(data.standups.find((standup) => standup.id === 'standup-search-today')).toBeTruthy()
})

test('gantt save and feishu sync use the real API', async ({ page }) => {
  await gotoAgiliX(page)
  await openNav(page, '排期甘特')

  await page.getByRole('button', { name: '月' }).click()
  await page.getByRole('button', { name: '周' }).click()

  const saveResponse = page.waitForResponse((response) => response.url().includes('/api/milestones/ms-beta') && response.request().method() === 'PUT')
  await page.getByRole('button', { name: '保存里程碑' }).click()
  expect((await saveResponse).status()).toBe(204)

  const notifyResponse = page.waitForResponse((response) => response.url().endsWith('/api/feishu/notifications') && response.request().method() === 'POST')
  await page.getByRole('button', { name: '同步飞书' }).click()
  expect((await notifyResponse).status()).toBe(201)
})

test('feishu page sends query commands to the real API', async ({ page }) => {
  await gotoAgiliX(page)
  await openNav(page, '群机器人')

  for (const command of ['团队状态', '阻塞列表', '文档查询']) {
    const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/feishu/query') && response.request().method() === 'POST')
    await page.getByRole('button', { name: command }).click()
    expect((await responsePromise).status()).toBe(200)
  }
})
```

- [ ] **Step 5: Run page-level tests and repair UI selectors or missing behavior**

Run:

```bash
pnpm --filter @agilix/app exec playwright test e2e/page-team-projects.spec.ts e2e/page-issues-board.spec.ts e2e/page-docs.spec.ts e2e/page-planning-feishu.spec.ts
```

Expected before repairs: FAIL only where the current UI lacks an accessible label, button behavior, preview rendering, or real API mutation. For each failure, modify the corresponding app route or component so the exact test passes through the real API.

---

### Task 4: Cross-Page Business Flows Through Real API

**Files:**
- Create: `apps/agilix/e2e/business-flows.spec.ts`

- [ ] **Step 1: Add cross-page business flow tests**

Create `apps/agilix/e2e/business-flows.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { createAgiliXRealApi } from './support/agilixRealApi'
import { gotoAgiliX, openNav } from './support/agilixPage'

test.beforeEach(async ({ request }) => {
  await createAgiliXRealApi(request).reset()
})

test('team issue triage flows from workbench to board completion and persists in real API', async ({ page, request }) => {
  const api = createAgiliXRealApi(request)
  await gotoAgiliX(page)

  await page.getByRole('button', { name: '搜索' }).click()
  await expect(page.getByText('SRCH-186')).toBeVisible()

  await openNav(page, '看板')
  const responsePromise = page.waitForResponse((response) => response.url().includes('/api/issues/SRCH-186/status') && response.request().method() === 'PATCH')
  await page.getByRole('button', { name: '完成 SRCH-186' }).click()
  expect((await responsePromise).status()).toBe(204)

  const data = await api.loadData()
  expect(data.issues.find((issue) => issue.key === 'SRCH-186')?.status).toBe('done')
})

test('project creation appears in shell context after refresh', async ({ page, request }) => {
  const api = createAgiliXRealApi(request)
  await gotoAgiliX(page)
  await openNav(page, '项目总览')

  await page.getByRole('button', { name: '新建项目' }).click()
  await page.getByLabel('项目名称').fill('设计系统')
  await page.getByLabel('项目标识').fill('design')
  await page.getByLabel('项目字标').fill('设')
  await page.getByLabel('迭代编号').fill('S01')
  await page.getByLabel('迭代标题').fill('设计系统第一期')
  await page.getByLabel('迭代日期').fill('6.10-6.21')
  await page.getByLabel('日历周点数').fill('[8,10,12]')
  await page.getByRole('button', { name: '创建项目' }).click()

  await page.reload()
  await expect(page.getByText('设计系统')).toBeVisible()

  const data = await api.loadData()
  expect(data.projects.some((project) => project.id === 'design')).toBe(true)
})

test('docs comment and standup push create real API side effects in one workflow', async ({ page, request }) => {
  const api = createAgiliXRealApi(request)
  await gotoAgiliX(page)

  await openNav(page, '文档')
  await page.getByText('结果卡片重设计方案').click()
  await page.getByLabel('评论内容').fill('业务流评论')
  await page.getByRole('button', { name: '发表评论' }).click()

  await openNav(page, '每日站会')
  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/feishu/notifications') && response.request().method() === 'POST')
  await page.getByRole('button', { name: '推送纪要到群' }).click()
  expect((await responsePromise).status()).toBe(201)

  const data = await api.loadData()
  expect(data.docs.find((doc) => doc.id === 'doc-result-card')?.comments.some((comment) => comment.body === '业务流评论')).toBe(true)
})
```

- [ ] **Step 2: Run the business flow tests**

Run:

```bash
pnpm --filter @agilix/app exec playwright test e2e/business-flows.spec.ts
```

Expected: PASS after Task 3 repairs are complete.

---

### Task 5: Remove Existing API Interception From Old E2E Files

**Files:**
- Modify: `apps/agilix/e2e/full-flow.spec.ts`
- Modify: `apps/agilix/e2e/prototype-visual.audit.ts`

- [ ] **Step 1: Replace old interception setup in `full-flow.spec.ts`**

Remove the `mockAgiliXApi` function and `page.route()` calls from `apps/agilix/e2e/full-flow.spec.ts`. Add this import and reset call:

```ts
import { createAgiliXRealApi } from './support/agilixRealApi'

test.beforeEach(async ({ request }) => {
  await createAgiliXRealApi(request).reset()
})
```

Keep existing `page.waitForRequest()` assertions because they observe real requests without replacing the API response.

- [ ] **Step 2: Replace old interception setup in `prototype-visual.audit.ts`**

Remove the `mockAgiliXApi` function and `page.route()` calls from `apps/agilix/e2e/prototype-visual.audit.ts`. Add this import and reset call:

```ts
import { createAgiliXRealApi } from './support/agilixRealApi'

test.beforeEach(async ({ request }) => {
  await createAgiliXRealApi(request).reset()
})
```

- [ ] **Step 3: Verify no e2e API interception remains**

Run:

```bash
rg -n "page\\.route|route\\.fulfill|fulfill\\(|mockAgiliXApi|setupAgiliXApiMock|agilixApiMock" apps/agilix/e2e apps/agilix/playwright.config.ts
```

Expected: no output and exit code `1`.

---

### Task 6: Full Verification Gates

**Files:**
- All files changed by Tasks 1-5.

- [ ] **Step 1: Run the complete real API e2e UI suite**

Run:

```bash
pnpm --filter @agilix/app e2e:ui
```

Expected: PASS for:
- `shell-navigation.spec.ts`
- `page-team-projects.spec.ts`
- `page-issues-board.spec.ts`
- `page-docs.spec.ts`
- `page-planning-feishu.spec.ts`
- `business-flows.spec.ts`
- `full-flow.spec.ts`

- [ ] **Step 2: Run visual audit against the real API**

Run:

```bash
pnpm --filter @agilix/app visual:audit
```

Expected: PASS. The visual audit must also satisfy the no-interception grep from Task 5.

- [ ] **Step 3: Run focused component and API tests**

Run:

```bash
pnpm --filter @agilix/api test -- src/localDevServer.test.ts
pnpm --filter @agilix/app test -- src/routes/planning-views.test.tsx src/routes/prototype-parity.test.tsx src/routes/data-driven-routes.test.tsx src/routes/docs.test.tsx src/routes/issues-board.test.tsx src/routes/feishu.test.tsx src/routes/workbench-projects.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Run production builds**

Run:

```bash
pnpm --filter @agilix/api build
pnpm --filter @agilix/app build
```

Expected: PASS.

- [ ] **Step 5: Commit only after all gates pass**

Run:

```bash
git status --short
git add apps/agilix-api/src/localDevServer.test.ts apps/agilix-api/src/localDevServer.ts apps/agilix/playwright.config.ts apps/agilix/package.json apps/agilix/e2e
git commit -m "test: cover agilix e2e ui flows with real api"
```

Expected: commit succeeds on `main`.

---

## Self-Review

**Spec coverage:** The plan covers every implemented page in the nav shell and every wired function point listed in the current React routes: navigation, buttons, filters, search inputs, modals, previews, request payload observation, real API mutations, and cross-page business flows.

**Real API compliance:** The plan starts a real Hono API server and a real Vite frontend. Tests reset state through `POST /api/dev/reset`, read state through `GET /api/bootstrap`, and verify mutations through real API responses and persisted API state.

**No interception policy:** The plan explicitly forbids `page.route()`, `route.fulfill()`, `mockAgiliXApi`, `setupAgiliXApiMock`, and `agilixApiMock`. Task 5 adds a grep gate that must produce no matches.

**Placeholder scan:** Each task names exact files, commands, and assertions. No task is left as deferred or unspecified work.

**Type consistency:** Helper names are consistent across tasks: `createAgiliXRealApi`, `reset`, `loadData`, `gotoAgiliX`, `openNav`, `expectPageHeading`, `chooseProject`, and `expectStatusText`.
