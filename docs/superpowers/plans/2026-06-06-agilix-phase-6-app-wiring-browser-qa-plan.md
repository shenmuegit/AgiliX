# AgiliX Phase 6 App Wiring and Browser QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the full AgiliX React app to the API client and verify the complete product in browser workflows.

**Architecture:** `App` owns navigation, selected project, loaded `SeedData`, and mutation refreshes. Routes remain presentational and receive data plus callbacks. Browser tests cover all top-level modules and core flows after app wiring is complete.

**Tech Stack:** TypeScript, React, Vitest, Testing Library, user-event, Playwright.

---

## Scope

- Add typed browser API client.
- Add in-memory client for app wiring tests.
- Wire all route components into `App`.
- Refresh state after Issue moves, document creation, document comments, standup saves, and milestone saves; record Feishu notifications and queries through the API client.
- Add Playwright coverage for full navigation and core workflows.

## Files

- Create `apps/agilix/src/api/client.ts`: typed API client.
- Create `apps/agilix/src/api/client.test.ts`: client tests.
- Create `apps/agilix/src/test/createInMemoryClient.ts`: app wiring test client.
- Modify `apps/agilix/src/App.tsx`: full route wiring.
- Modify `apps/agilix/src/routes/DocsPage.tsx`: narrow document creation callback to `CreateDocInput`.
- Create `apps/agilix/src/App.persistence.test.tsx`: app persistence wiring tests.
- Create `apps/agilix/playwright.config.ts`: browser test config.
- Create `apps/agilix/e2e/full-flow.spec.ts`: browser workflow tests.
- Modify `apps/agilix/package.json`: add response validation, `e2e` script, and Playwright dependency.

## Task 1: Add Typed API Client

**Files:**
- Create: `apps/agilix/src/api/client.ts`
- Test: `apps/agilix/src/api/client.test.ts`
- Modify: `apps/agilix/package.json`

- [ ] **Step 1: Write the failing API client test**

Create `apps/agilix/src/api/client.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { seedData } from '../domain/fixtures'
import { createAgiliXClient } from './client'

describe('AgiliX API client', () => {
  it('loads bootstrap data and sends core mutations with JSON headers', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/bootstrap') return new Response(JSON.stringify(seedData), { status: 200 })
      if (String(input) === '/api/issues/SRCH-186/status') return new Response(null, { status: 204 })
      if (String(input) === '/api/docs/doc-result-card/comments') return new Response(JSON.stringify(seedData.docs[0].comments[0]), { status: 201 })
      if (String(input) === '/api/docs') return new Response(JSON.stringify(seedData.docs[0]), { status: 201 })
      if (String(input) === `/api/standups/${seedData.standups[0].id}`) return new Response(null, { status: 204 })
      if (String(input) === `/api/milestones/${seedData.milestones[1].id}`) return new Response(null, { status: 204 })
      if (String(input) === '/api/feishu/notifications') return new Response(JSON.stringify({
        id: 'notification-client',
        trigger: '站会摘要',
        targetGroup: 'AgiliX 团队群',
        payload: { standupId: 'standup-search-today' },
        status: 'queued',
        createdAt: '2026-06-06T10:00:00.000Z',
      }), { status: 201 })
      if (String(input) === '/api/feishu/query') return new Response(JSON.stringify({ title: '团队状态', lines: ['Issue 7'] }), { status: 200 })
      throw new Error(`Unexpected path: ${String(input)}`)
    })
    const client = createAgiliXClient(fetcher)

    expect((await client.loadData()).projects.map((project) => project.name)).toContain('搜索平台')

    await client.moveIssue('SRCH-186', 'done')
    await client.addDocComment('doc-result-card', {
      id: 'comment-client',
      docId: 'doc-result-card',
      authorId: 'zhou',
      body: 'Client comment',
      resolved: false,
      createdAtLabel: '刚刚',
    })
    const createdDoc = {
      id: 'doc-client-created',
      scope: 'global' as const,
      title: 'Client 创建文档',
      directory: '全局文档/待整理',
      body: '通过客户端创建的文档',
      linkedIssueKeys: [],
      comments: [],
      updatedAtLabel: '刚刚',
    }
    await client.createDoc(createdDoc)
    const standup = seedData.standups[0]
    const milestone = seedData.milestones[1]
    await client.saveStandup(standup)
    await client.saveMilestone(milestone)
    await client.recordFeishuNotification({
      id: 'notification-client',
      trigger: '站会摘要',
      targetGroup: 'AgiliX 团队群',
      payload: { standupId: 'standup-search-today' },
      status: 'queued',
      createdAt: '2026-06-06T10:00:00.000Z',
    })
    await client.queryFeishu({ type: 'team' })

    expect(fetcher).toHaveBeenCalledWith('/api/issues/SRCH-186/status', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })
    expect(fetcher).toHaveBeenCalledWith('/api/docs/doc-result-card/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'comment-client',
        docId: 'doc-result-card',
        authorId: 'zhou',
        body: 'Client comment',
        resolved: false,
        createdAtLabel: '刚刚',
      }),
    })
    expect(fetcher).toHaveBeenCalledWith('/api/docs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(createdDoc),
    })
    expect(fetcher).toHaveBeenCalledWith(`/api/standups/${standup.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(standup),
    })
    expect(fetcher).toHaveBeenCalledWith(`/api/milestones/${milestone.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(milestone),
    })
    expect(fetcher).toHaveBeenCalledWith('/api/feishu/notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'notification-client',
        trigger: '站会摘要',
        targetGroup: 'AgiliX 团队群',
        payload: { standupId: 'standup-search-today' },
        status: 'queued',
        createdAt: '2026-06-06T10:00:00.000Z',
      }),
    })
    expect(fetcher).toHaveBeenCalledWith('/api/feishu/query', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ command: { type: 'team' } }),
    })
  })

  it('rejects invalid document create inputs before sending requests', async () => {
    const fetcher = vi.fn()
    const client = createAgiliXClient(fetcher)

    await expect(client.createDoc({
      id: 'doc-duplicate-linked-issue',
      scope: 'project',
      projectId: 'search',
      title: 'Duplicate linked issue doc',
      directory: '项目文档/搜索平台/结果页',
      body: 'Linked issue keys must be unique.',
      linkedIssueKeys: ['SRCH-186', 'SRCH-186'],
      comments: [],
      updatedAtLabel: '刚刚',
    })).rejects.toThrow('Duplicate linked issue')

    await expect(client.createDoc({
      id: 'doc-create-with-comment',
      scope: 'project',
      projectId: 'search',
      title: 'Create doc with comment',
      directory: '项目文档/搜索平台/结果页',
      body: 'Comments must use addDocComment.',
      linkedIssueKeys: [],
      // @ts-expect-error createDoc only accepts an empty comments array
      comments: [{
        id: 'comment-create-doc',
        docId: 'doc-create-with-comment',
        authorId: 'zhou',
        body: 'Comment must use the comment endpoint.',
        resolved: false,
        createdAtLabel: '刚刚',
      }],
      updatedAtLabel: '刚刚',
    })).rejects.toThrow('Document comments must be empty on create')

    await expect(client.queryFeishu({
      type: 'docs',
      // @ts-expect-error invalid query text validates protocol rejection
      query: ' 结果卡片',
    })).rejects.toThrow('docs query must not include leading or trailing whitespace')

    expect(fetcher).not.toHaveBeenCalled()
  })

  it('rejects malformed response payloads and unexpected mutation status codes', async () => {
    await expect(createAgiliXClient(vi.fn(async () =>
      new Response(JSON.stringify({ projects: [] }), { status: 200 }),
    )).loadData()).rejects.toThrow('AgiliX API response validation failed')

    await expect(createAgiliXClient(vi.fn(async () =>
      new Response(JSON.stringify({ title: '团队状态', lines: [7] }), { status: 200 }),
    )).queryFeishu({ type: 'team' })).rejects.toThrow('AgiliX API response validation failed')

    await expect(createAgiliXClient(vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )).moveIssue('SRCH-186', 'done')).rejects.toThrow('AgiliX API request failed')
  })
})
```

- [ ] **Step 2: Run RED**

Run:

```bash
pnpm --filter @agilix/app test -- src/api/client.test.ts
```

Expected: FAIL because `client.ts` does not exist.

- [ ] **Step 3: Add client code**

Modify `apps/agilix/package.json`:

```json
{
  "dependencies": {
    "zod": "^3.24.0"
  }
}
```

Create `apps/agilix/src/api/client.ts`:

```ts
import { z } from 'zod'
import { createDocQueryCommand } from '../domain/feishu'
import type { Doc, DocComment, FeishuNotificationPayload, FeishuQueryCommand, IssueStatus, Milestone, SeedData, Standup } from '../domain/types'

export interface FeishuReply {
  title: string
  lines: string[]
}

export type FeishuNotificationInput = {
  id: string
  targetGroup: 'AgiliX 团队群'
  status: 'queued' | 'sent' | 'failed'
  createdAt: string
} & FeishuNotificationPayload

export type CreateDocInput = Omit<Doc, 'comments'> & { comments: never[] }

export interface AgiliXClient {
  loadData(): Promise<SeedData>
  moveIssue(issueKey: string, status: IssueStatus): Promise<void>
  addDocComment(docId: string, comment: DocComment): Promise<void>
  createDoc(doc: CreateDocInput): Promise<void>
  saveStandup(standup: Standup): Promise<void>
  saveMilestone(milestone: Milestone): Promise<void>
  recordFeishuNotification(input: FeishuNotificationInput): Promise<void>
  queryFeishu(command: FeishuQueryCommand): Promise<FeishuReply>
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const projectIdSchema = z.enum(['search', 'data', 'api', 'mobile'])
const memberIdSchema = z.enum(['lin', 'chen', 'gao', 'su', 'han', 'he', 'jiang', 'zhou'])
const issueStatusSchema = z.enum(['todo', 'doing', 'review', 'blocked', 'done'])
const issueTypeSchema = z.enum(['story', 'bug', 'task', 'tech'])
const prioritySchema = z.enum(['high', 'medium', 'low'])
const milestoneStatusSchema = z.enum(['done', 'doing', 'risk', 'planned'])
const feishuNotificationTriggerSchema = z.enum(['站会摘要', '阻塞提醒', '文档评论'])

const feishuDocsQuerySchema = z.string()
  .min(1)
  .refine((query) => query === query.trim(), 'docs query must not include leading or trailing whitespace')

const feishuCommandSchema: z.ZodType<FeishuQueryCommand> = z.union([
  z.object({ type: z.literal('team') }).strict(),
  z.object({ type: z.literal('blockers') }).strict(),
  z.object({ type: z.literal('docs'), query: feishuDocsQuerySchema }).strict().transform((command) => createDocQueryCommand(command.query)),
])

const docCommentSchema = z.object({
  id: z.string().min(1),
  docId: z.string().min(1),
  authorId: memberIdSchema,
  body: z.string().min(1),
  resolved: z.boolean(),
  createdAtLabel: z.string().min(1),
}).strict()

const docBaseSchema = {
  id: z.string().min(1),
  title: z.string().min(1),
  directory: z.string().min(1),
  body: z.string().min(1),
  linkedIssueKeys: z.array(z.string().min(1)).refine((keys) => new Set(keys).size === keys.length, 'linkedIssueKeys must be unique'),
  comments: z.array(docCommentSchema),
  updatedAtLabel: z.string().min(1),
}

const docSchema: z.ZodType<Doc> = z.discriminatedUnion('scope', [
  z.object({ ...docBaseSchema, scope: z.literal('global'), projectId: z.undefined().optional() }).strict(),
  z.object({ ...docBaseSchema, scope: z.literal('project'), projectId: projectIdSchema }).strict(),
])

const createDocInputBaseSchema = {
  ...docBaseSchema,
  comments: z.array(z.never()).length(0),
}

const createDocInputSchema: z.ZodType<CreateDocInput> = z.discriminatedUnion('scope', [
  z.object({ ...createDocInputBaseSchema, scope: z.literal('global'), projectId: z.undefined().optional() }).strict(),
  z.object({ ...createDocInputBaseSchema, scope: z.literal('project'), projectId: projectIdSchema }).strict(),
])

function validateCreateDocInput(doc: CreateDocInput): CreateDocInput {
  if (doc.comments.length > 0) throw new Error('Document comments must be empty on create')
  if (new Set(doc.linkedIssueKeys).size !== doc.linkedIssueKeys.length) throw new Error('Duplicate linked issue')
  return createDocInputSchema.parse(doc)
}

const projectSchema = z.object({
  id: projectIdSchema,
  name: z.string().min(1),
  glyph: z.string().min(1),
  color: z.string().min(1),
  activeIterationCode: z.string().min(1),
}).strict()

const memberSchema = z.object({
  id: memberIdSchema,
  name: z.string().min(1),
  role: z.string().min(1),
  capacity: z.number().int(),
}).strict()

const iterationSchema = z.object({
  id: z.string().min(1),
  projectId: projectIdSchema,
  code: z.string().min(1),
  name: z.string().min(1),
  day: z.number().int(),
  totalDays: z.number().int(),
  goal: z.string().min(1),
  velocity: z.number().int(),
}).strict()

const issueSchema = z.object({
  key: z.string().min(1),
  projectId: projectIdSchema,
  iterationId: z.string().min(1),
  type: issueTypeSchema,
  title: z.string().min(1),
  status: issueStatusSchema,
  priority: prioritySchema,
  assigneeId: memberIdSchema,
  storyPoints: z.number().int(),
  blockerReason: z.string().min(1).optional(),
  linkedDocIds: z.array(z.string().min(1)),
}).strict()

const standupItemSchema = z.object({
  memberId: memberIdSchema,
  yesterday: z.array(z.string()),
  today: z.array(z.string()),
  blockers: z.array(z.string()),
}).strict()

const standupSchema = z.object({
  id: z.string().min(1),
  projectId: projectIdSchema,
  dateLabel: z.string().min(1),
  timeLabel: z.string().min(1),
  items: z.array(standupItemSchema),
}).strict()

const milestoneSchema = z.object({
  id: z.string().min(1),
  projectId: projectIdSchema,
  iterationId: z.string().min(1),
  title: z.string().min(1),
  startDay: z.number().int(),
  endDay: z.number().int(),
  status: milestoneStatusSchema,
  ownerId: memberIdSchema,
}).strict()

const feishuNotificationSchema: z.ZodType<FeishuNotificationInput> = z.discriminatedUnion('trigger', [
  z.object({ id: z.string().min(1), targetGroup: z.literal('AgiliX 团队群'), status: z.enum(['queued', 'sent', 'failed']), createdAt: z.string().min(1), trigger: z.literal('站会摘要'), payload: z.object({ standupId: z.string().min(1) }).strict() }).strict(),
  z.object({ id: z.string().min(1), targetGroup: z.literal('AgiliX 团队群'), status: z.enum(['queued', 'sent', 'failed']), createdAt: z.string().min(1), trigger: z.literal('阻塞提醒'), payload: z.object({ issueKeys: z.array(z.string().min(1)).min(1) }).strict() }).strict(),
  z.object({ id: z.string().min(1), targetGroup: z.literal('AgiliX 团队群'), status: z.enum(['queued', 'sent', 'failed']), createdAt: z.string().min(1), trigger: z.literal('文档评论'), payload: z.object({ docId: z.string().min(1), commentId: z.string().min(1) }).strict() }).strict(),
])

const seedDataSchema: z.ZodType<SeedData> = z.object({
  navItems: z.array(z.string().min(1)),
  projects: z.array(projectSchema),
  members: z.array(memberSchema),
  iterations: z.array(iterationSchema),
  issues: z.array(issueSchema),
  docs: z.array(docSchema),
  standups: z.array(standupSchema),
  milestones: z.array(milestoneSchema),
  feishu: z.object({
    groups: z.array(z.literal('AgiliX 团队群')),
    queryCommands: z.array(feishuCommandSchema),
    notificationTriggers: z.array(feishuNotificationTriggerSchema),
  }).strict(),
}).strict()

const feishuReplySchema: z.ZodType<FeishuReply> = z.object({
  title: z.string().min(1),
  lines: z.array(z.string()),
}).strict()

async function send(fetcher: Fetcher, path: string, init: RequestInit = {}): Promise<Response> {
  return fetcher(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init.headers,
    },
  })
}

async function requestJson<T>(fetcher: Fetcher, path: string, expectedStatus: number, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
  const response = await send(fetcher, path, init)
  if (response.status !== expectedStatus) throw new Error(`AgiliX API request failed: expected ${expectedStatus}, received ${response.status}`)
  const parsed = schema.safeParse(await response.json())
  if (!parsed.success) throw new Error(`AgiliX API response validation failed: ${path}`)
  return parsed.data
}

async function requestNoContent(fetcher: Fetcher, path: string, init: RequestInit = {}): Promise<void> {
  const response = await send(fetcher, path, init)
  if (response.status !== 204) throw new Error(`AgiliX API request failed: expected 204, received ${response.status}`)
}

export function createAgiliXClient(fetcher: Fetcher = fetch): AgiliXClient {
  return {
    loadData() {
      return requestJson(fetcher, '/api/bootstrap', 200, seedDataSchema)
    },
    moveIssue(issueKey, status) {
      return requestNoContent(fetcher, `/api/issues/${issueKey}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
    },
    addDocComment(docId, comment) {
      return requestJson(fetcher, `/api/docs/${docId}/comments`, 201, docCommentSchema, {
        method: 'POST',
        body: JSON.stringify(comment),
      }).then(() => undefined)
    },
    createDoc(doc) {
      const input = validateCreateDocInput(doc)
      return requestJson(fetcher, '/api/docs', 201, docSchema, {
        method: 'POST',
        body: JSON.stringify(input),
      }).then(() => undefined)
    },
    saveStandup(standup) {
      return requestNoContent(fetcher, `/api/standups/${standup.id}`, {
        method: 'PUT',
        body: JSON.stringify(standup),
      })
    },
    saveMilestone(milestone) {
      return requestNoContent(fetcher, `/api/milestones/${milestone.id}`, {
        method: 'PUT',
        body: JSON.stringify(milestone),
      })
    },
    recordFeishuNotification(input) {
      return requestJson(fetcher, '/api/feishu/notifications', 201, feishuNotificationSchema, {
        method: 'POST',
        body: JSON.stringify(input),
      }).then(() => undefined)
    },
    queryFeishu(command) {
      const input = feishuCommandSchema.parse(command)
      return requestJson(fetcher, '/api/feishu/query', 200, feishuReplySchema, {
        method: 'POST',
        body: JSON.stringify({ command: input }),
      })
    },
  }
}
```

- [ ] **Step 4: Run GREEN**

Run:

```bash
pnpm --filter @agilix/app test -- src/api/client.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/agilix/package.json apps/agilix/src/api/client.ts apps/agilix/src/api/client.test.ts
git commit -m "feat: add AgiliX API client"
```

## Task 2: Wire App State to Route Callbacks

**Files:**
- Create: `apps/agilix/src/test/createInMemoryClient.ts`
- Modify: `apps/agilix/src/App.tsx`
- Test: `apps/agilix/src/App.persistence.test.tsx`

- [ ] **Step 1: Write the failing app wiring test**

Create `apps/agilix/src/App.persistence.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import { seedData } from './domain/fixtures'
import { createInMemoryClient } from './test/createInMemoryClient'

describe('App API wiring', () => {
  it('loads data and persists core route mutations through the client', async () => {
    const client = createInMemoryClient()

    render(<App client={client} />)

    expect(await screen.findByText('SRCH-198')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: '看板' }))
    await userEvent.click(await screen.findByRole('button', { name: 'SRCH-186 完成' }))
    expect((await client.loadData()).issues.find((issue) => issue.key === 'SRCH-186')?.status).toBe('done')

    await userEvent.click(screen.getByRole('link', { name: '文档' }))
    await userEvent.click(await screen.findByRole('button', { name: '新增评论' }))
    expect((await client.loadData()).docs.find((doc) => doc.id === 'doc-result-card')?.comments.length).toBeGreaterThan(2)
    await userEvent.click(await screen.findByRole('button', { name: '新建文档' }))
    await waitFor(async () => expect((await client.loadData()).docs.find((doc) => doc.id === 'doc-global-created')?.title).toBe('新建全局文档'))

    await userEvent.click(screen.getByRole('link', { name: '每日站会' }))
    const standupLoadCount = client.loadCount()
    await userEvent.click(await screen.findByRole('button', { name: '保存站会' }))
    expect(client.recordedStandupSaves()).toContain('standup-search-today')
    await waitFor(() => expect(client.loadCount()).toBeGreaterThan(standupLoadCount))

    await userEvent.click(screen.getByRole('link', { name: '排期甘特' }))
    const milestoneLoadCount = client.loadCount()
    await userEvent.click(await screen.findByRole('button', { name: '保存 Beta 开关接入' }))
    expect(client.recordedMilestoneSaves()).toContain('ms-beta')
    await waitFor(() => expect(client.loadCount()).toBeGreaterThan(milestoneLoadCount))

    await userEvent.click(screen.getByRole('link', { name: '飞书' }))
    await userEvent.click(await screen.findByRole('button', { name: '记录 站会摘要' }))
    expect(client.recordedFeishuNotifications()).toContain('站会摘要')

    await userEvent.click(await screen.findByRole('button', { name: '查询 /team' }))
    expect(client.recordedFeishuQueries()).toContain('/team')
  })

  it('rejects missing mutation targets and invalid document references in the in-memory client', async () => {
    const client = createInMemoryClient()

    await expect(client.moveIssue('MISSING-1', 'done')).rejects.toThrow('Issue not found')
    await expect(client.addDocComment('missing-doc', {
      id: 'comment-missing',
      docId: 'missing-doc',
      authorId: 'zhou',
      body: 'Missing doc comment',
      resolved: false,
      createdAtLabel: '刚刚',
    })).rejects.toThrow('Document not found')
    await expect(client.addDocComment('doc-result-card', {
      id: 'comment-mismatch',
      docId: 'other-doc',
      authorId: 'zhou',
      body: 'Mismatched doc id comment',
      resolved: false,
      createdAtLabel: '刚刚',
    })).rejects.toThrow('Comment docId must match document id')
    await expect(client.createDoc({ ...seedData.docs[0], comments: [] })).rejects.toThrow('Document already exists')
    await expect(client.createDoc({
      id: 'doc-invalid-linked-issue',
      scope: 'project',
      projectId: 'search',
      title: 'Invalid linked issue doc',
      directory: '项目文档/搜索平台/结果页',
      body: 'Linked issue must exist.',
      linkedIssueKeys: ['MISSING-1'],
      comments: [],
      updatedAtLabel: '刚刚',
    })).rejects.toThrow('Linked issue not found')
    await expect(client.createDoc({
      id: 'doc-duplicate-linked-issue',
      scope: 'project',
      projectId: 'search',
      title: 'Duplicate linked issue doc',
      directory: '项目文档/搜索平台/结果页',
      body: 'Linked issue keys must be unique.',
      linkedIssueKeys: ['SRCH-186', 'SRCH-186'],
      comments: [],
      updatedAtLabel: '刚刚',
    })).rejects.toThrow('Duplicate linked issue')
    await expect(client.createDoc({
      id: 'doc-create-with-comment',
      scope: 'project',
      projectId: 'search',
      title: 'Create doc with comment',
      directory: '项目文档/搜索平台/结果页',
      body: 'Comments must use addDocComment.',
      linkedIssueKeys: [],
      // @ts-expect-error createDoc only accepts an empty comments array
      comments: [{
        id: 'comment-create-doc',
        docId: 'doc-create-with-comment',
        authorId: 'zhou',
        body: 'Comment must use the comment endpoint.',
        resolved: false,
        createdAtLabel: '刚刚',
      }],
      updatedAtLabel: '刚刚',
    })).rejects.toThrow('Document comments must be empty on create')
    await expect(client.saveStandup({ ...seedData.standups[0], id: 'missing-standup' })).rejects.toThrow('Standup not found')
    await expect(client.saveMilestone({ ...seedData.milestones[1], id: 'missing-milestone' })).rejects.toThrow('Milestone not found')
  })
})
```

- [ ] **Step 2: Run RED**

Run:

```bash
pnpm --filter @agilix/app test -- src/App.persistence.test.tsx
```

Expected: FAIL because `App` does not accept a client and `createInMemoryClient.ts` does not exist.

- [ ] **Step 3: Add in-memory client for tests**

Create `apps/agilix/src/test/createInMemoryClient.ts`:

```ts
import { buildFeishuReply, formatFeishuCommand } from '../domain/feishu'
import { seedData } from '../domain/fixtures'
import { moveIssue } from '../domain/issues'
import type { AgiliXClient, CreateDocInput, FeishuNotificationInput, FeishuReply } from '../api/client'
import type { DocComment, FeishuQueryCommand, IssueStatus, Milestone, SeedData, Standup } from '../domain/types'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function createInMemoryClient() {
  let data: SeedData = clone(seedData)
  let loadDataCalls = 0
  const standupSaves: string[] = []
  const milestoneSaves: string[] = []
  const feishuNotifications: FeishuNotificationInput[] = []
  const feishuQueries: string[] = []

  const client: AgiliXClient & {
    loadCount(): number
    recordedStandupSaves(): string[]
    recordedMilestoneSaves(): string[]
    recordedFeishuNotifications(): string[]
    recordedFeishuQueries(): string[]
  } = {
    async loadData() {
      loadDataCalls += 1
      return clone(data)
    },
    async moveIssue(issueKey: string, status: IssueStatus) {
      if (!data.issues.some((issue) => issue.key === issueKey)) throw new Error(`Issue not found: ${issueKey}`)
      data = { ...data, issues: moveIssue(data.issues, issueKey, status) }
    },
    async addDocComment(docId: string, comment: DocComment) {
      if (comment.docId !== docId) throw new Error(`Comment docId must match document id: ${docId}`)
      if (!data.docs.some((doc) => doc.id === docId)) throw new Error(`Document not found: ${docId}`)
      data = {
        ...data,
        docs: data.docs.map((doc) => (doc.id === docId ? { ...doc, comments: [...doc.comments, comment] } : doc)),
      }
    },
    async createDoc(doc: CreateDocInput) {
      if (data.docs.some((item) => item.id === doc.id)) throw new Error(`Document already exists: ${doc.id}`)
      if (doc.comments.length > 0) throw new Error('Document comments must be empty on create')
      if (new Set(doc.linkedIssueKeys).size !== doc.linkedIssueKeys.length) throw new Error('Duplicate linked issue')
      const missingIssueKey = doc.linkedIssueKeys.find((issueKey) => !data.issues.some((issue) => issue.key === issueKey))
      if (missingIssueKey) throw new Error(`Linked issue not found: ${missingIssueKey}`)
      data = { ...data, docs: [...data.docs, clone(doc)] }
    },
    async saveStandup(standup: Standup) {
      if (!data.standups.some((item) => item.id === standup.id)) throw new Error(`Standup not found: ${standup.id}`)
      standupSaves.push(standup.id)
      data = { ...data, standups: [...data.standups.filter((item) => item.id !== standup.id), standup] }
    },
    async saveMilestone(milestone: Milestone) {
      if (!data.milestones.some((item) => item.id === milestone.id)) throw new Error(`Milestone not found: ${milestone.id}`)
      milestoneSaves.push(milestone.id)
      data = { ...data, milestones: [...data.milestones.filter((item) => item.id !== milestone.id), milestone] }
    },
    async recordFeishuNotification(input: FeishuNotificationInput) {
      feishuNotifications.push(clone(input))
    },
    async queryFeishu(command: FeishuQueryCommand): Promise<FeishuReply> {
      feishuQueries.push(formatFeishuCommand(command))
      return buildFeishuReply(command, data)
    },
    loadCount() {
      return loadDataCalls
    },
    recordedFeishuNotifications() {
      return feishuNotifications.map((notification) => notification.trigger)
    },
    recordedStandupSaves() {
      return [...standupSaves]
    },
    recordedMilestoneSaves() {
      return [...milestoneSaves]
    },
    recordedFeishuQueries() {
      return [...feishuQueries]
    },
  }

  return client
}
```

- [ ] **Step 4: Wire `App` to all routes**

Modify `apps/agilix/src/routes/DocsPage.tsx`:

```ts
import type { CreateDocInput } from '../api/client'
import type { DocComment, ProjectId, SeedData } from '../domain/types'

type DocsPageProps = {
  data: SeedData
  projectId: ProjectId | 'all'
  onAddComment: (docId: string, comment: DocComment) => void | Promise<void>
  onCreateDoc: (doc: CreateDocInput) => void | Promise<void>
}
```

Modify `apps/agilix/src/App.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { createAgiliXClient, type AgiliXClient, type CreateDocInput, type FeishuNotificationInput } from './api/client'
import { Shell, type NavItem } from './components/Shell'
import { BoardPage } from './routes/BoardPage'
import { DocsPage } from './routes/DocsPage'
import { FeishuPage } from './routes/FeishuPage'
import { GanttPage } from './routes/GanttPage'
import { IssuesPage } from './routes/IssuesPage'
import { ProjectsPage } from './routes/ProjectsPage'
import { StandupPage } from './routes/StandupPage'
import { StatsPage } from './routes/StatsPage'
import { TeamPage } from './routes/TeamPage'
import { WorkloadPage } from './routes/WorkloadPage'
import type { DocComment, FeishuNotificationTrigger, IssueStatus, Milestone, SeedData, Standup } from './domain/types'
import type { ProjectFilterValue } from './components/ProjectFilter'

export function App({ client = createAgiliXClient() }: { client?: AgiliXClient }) {
  const [active, setActive] = useState<NavItem>('团队工作台')
  const [projectId, setProjectId] = useState<ProjectFilterValue>('search')
  const [data, setData] = useState<SeedData | null>(null)

  async function refresh() {
    setData(await client.loadData())
  }

  useEffect(() => {
    void refresh()
  }, [client])

  async function moveAndRefresh(issueKey: string, status: IssueStatus) {
    await client.moveIssue(issueKey, status)
    await refresh()
  }

  async function commentAndRefresh(docId: string, comment: DocComment) {
    await client.addDocComment(docId, comment)
    await refresh()
  }

  async function createDocAndRefresh(doc: CreateDocInput) {
    await client.createDoc(doc)
    await refresh()
  }

  async function saveStandupAndRefresh(standup: Standup) {
    await client.saveStandup(standup)
    await refresh()
  }

  async function saveMilestoneAndRefresh(milestone: Milestone) {
    await client.saveMilestone(milestone)
    await refresh()
  }

  if (!data) {
    return (
      <Shell active={active} onNavigate={setActive}>
        <main>
          <h1>团队工作台</h1>
          <p>加载中</p>
        </main>
      </Shell>
    )
  }

  async function recordFeishuNotification(trigger: FeishuNotificationTrigger) {
    const base = {
      id: crypto.randomUUID(),
      targetGroup: 'AgiliX 团队群' as const,
      status: 'queued' as const,
      createdAt: new Date().toISOString(),
    }

    let input: FeishuNotificationInput
    switch (trigger) {
      case '站会摘要':
        input = { ...base, trigger, payload: { standupId: 'standup-search-today' } }
        break
      case '阻塞提醒':
        input = { ...base, trigger, payload: { issueKeys: data.issues.filter((issue) => issue.status === 'blocked').map((issue) => issue.key) } }
        break
      case '文档评论':
        input = { ...base, trigger, payload: { docId: 'doc-result-card', commentId: 'comment-a' } }
        break
    }

    await client.recordFeishuNotification(input)
  }

  const selectedProject = projectId === 'all' ? null : data.projects.find((project) => project.id === projectId)
  if (projectId !== 'all' && !selectedProject) throw new Error(`Project not found: ${projectId}`)

  function projectRequiredPage(title: string) {
    return (
      <main>
        <h1>{title}</h1>
        <p>请选择具体项目</p>
      </main>
    )
  }

  const page = {
    团队工作台: <TeamPage data={data} />,
    项目总览: <ProjectsPage data={data} />,
    Issues: <IssuesPage data={data} projectId={projectId} onProjectChange={setProjectId} />,
    看板: <BoardPage data={data} projectId={projectId} onMoveIssue={moveAndRefresh} />,
    迭代统计: selectedProject ? <StatsPage data={data} projectId={selectedProject.id} iterationCode={selectedProject.activeIterationCode} /> : projectRequiredPage('迭代统计'),
    文档: <DocsPage data={data} projectId={projectId} onAddComment={commentAndRefresh} onCreateDoc={createDocAndRefresh} />,
    成员负载: <WorkloadPage data={data} />,
    每日站会: selectedProject ? <StandupPage data={data} projectId={selectedProject.id} onSaveStandup={saveStandupAndRefresh} /> : projectRequiredPage('每日站会'),
    排期甘特: selectedProject ? <GanttPage data={data} projectId={selectedProject.id} onSaveMilestone={saveMilestoneAndRefresh} /> : projectRequiredPage('排期甘特'),
    飞书: <FeishuPage data={data} onNotify={recordFeishuNotification} onQuery={(command) => client.queryFeishu(command)} />,
  }[active]

  return (
    <Shell active={active} onNavigate={setActive}>
      {page}
    </Shell>
  )
}
```

- [ ] **Step 5: Run GREEN**

Run:

```bash
pnpm --filter @agilix/app test -- src/App.persistence.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Run app tests**

Run:

```bash
pnpm --filter @agilix/app test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/agilix/src/App.tsx apps/agilix/src/test/createInMemoryClient.ts apps/agilix/src/App.persistence.test.tsx
git commit -m "feat: wire AgiliX app to API client"
```

## Task 3: Add Browser Workflow Coverage

**Files:**
- Modify: `apps/agilix/package.json`
- Create: `apps/agilix/playwright.config.ts`
- Create: `apps/agilix/e2e/full-flow.spec.ts`

- [ ] **Step 1: Write the failing browser workflow test**

Create `apps/agilix/e2e/full-flow.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { seedData } from '../src/domain/fixtures'

test('full AgiliX product navigation and core workflows', async ({ page }) => {
  await page.route('**/api/bootstrap', async (route) => {
    await route.fulfill({ json: seedData })
  })
  await page.route('**/api/feishu/query', async (route) => {
    await route.fulfill({ json: { title: '团队状态', lines: ['Issue 7', '文档 3'] } })
  })
  await page.route('**/api/feishu/notifications', async (route) => {
    await route.fulfill({ status: 201, json: { id: 'notification-e2e', trigger: '站会摘要' } })
  })

  await page.goto('/')

  for (const label of ['团队工作台', '项目总览', 'Issues', '看板', '迭代统计', '文档', '成员负载', '每日站会', '排期甘特', '飞书']) {
    await expect(page.getByRole('link', { name: label })).toBeVisible()
  }

  await page.getByRole('link', { name: '文档' }).click()
  await expect(page.getByRole('heading', { name: '文档' })).toBeVisible()
  await expect(page.getByText('全局文档')).toBeVisible()

  await page.getByRole('link', { name: '看板' }).click()
  await expect(page.getByText('SRCH-198')).toBeVisible()

  await page.getByRole('link', { name: '每日站会' }).click()
  await expect(page.getByText('关联飞书日历 · 每日 10:00')).toBeVisible()

  await page.getByRole('link', { name: '飞书' }).click()
  await expect(page.getByText('/team')).toBeVisible()
  const notificationRequest = page.waitForRequest((request) => request.url().includes('/api/feishu/notifications') && request.method() === 'POST')
  await page.getByRole('button', { name: '记录 站会摘要' }).click()
  expect((await notificationRequest).postDataJSON()).toMatchObject({ trigger: '站会摘要', targetGroup: 'AgiliX 团队群', payload: { standupId: 'standup-search-today' } })
  await page.getByRole('button', { name: '查询 /team' }).click()
  await expect(page.getByText('团队状态')).toBeVisible()
  await expect(page.getByText('审批流')).toHaveCount(0)
})
```

- [ ] **Step 2: Run RED**

Run:

```bash
pnpm --filter @agilix/app e2e
```

Expected: FAIL because the `e2e` script and Playwright config do not exist. The test itself already mocks API calls, so no separate API server is required for browser UI coverage.

- [ ] **Step 3: Add Playwright dependency and script**

Modify `apps/agilix/package.json`:

```json
{
  "scripts": {
    "e2e": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0"
  }
}
```

- [ ] **Step 4: Add Playwright config**

Create `apps/agilix/playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'pnpm dev --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://127.0.0.1:5173',
  },
})
```

- [ ] **Step 5: Run GREEN**

Run:

```bash
pnpm --filter @agilix/app e2e
```

Expected: PASS.

- [ ] **Step 6: Run full verification**

Run:

```bash
pnpm --filter @agilix/api test
pnpm --filter @agilix/app test
pnpm --filter @agilix/app build
pnpm --filter @agilix/app e2e
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/agilix/package.json apps/agilix/playwright.config.ts apps/agilix/e2e/full-flow.spec.ts
git commit -m "test: add full AgiliX browser workflow coverage"
```

## Self-Review

- Spec coverage: Phase 6 covers API client, app state wiring, mutation refreshes, and browser workflow coverage.
- Scope check: This phase completes the app integration layer and does not add excluded permissions, approvals, multi-group Feishu, or Feishu-side editing.
- TDD check: Each task starts with a failing test and RED command before production code.
- Type consistency: `AgiliXClient`, route callback signatures, `SeedData`, and browser expectations match earlier phase plans.
- Placeholder scan: No unresolved placeholder markers or unfilled sections remain.
