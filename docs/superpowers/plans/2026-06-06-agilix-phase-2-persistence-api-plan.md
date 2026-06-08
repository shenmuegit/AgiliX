# AgiliX Phase 2 Persistence and API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the full AgiliX API package with Drizzle/D1 relational persistence, seed import, repository contracts, and validated Hono routes.

**Architecture:** Phase 2 creates `apps/agilix-api` and consumes Phase 1 domain types and fixtures from `@agilix/app`. The API exposes module-level routes, validates writes with Zod, and persists through a repository interface backed by Drizzle on SQLite/D1. Tests use an in-memory repository for route behavior and a repository conformance test for persistence behavior.

Repository implementations must use an explicit atomic write capability for multi-table mutations. Do not pass a Drizzle client into `createDrizzleRepository` unless it can commit or roll back the whole `seed()` or `saveStandup()` mutation as one unit.

**Tech Stack:** pnpm workspace, TypeScript, Hono, Zod, Drizzle ORM, SQLite/D1, Vitest.

---

## Scope

- Add persistence and API only.
- Do not build React pages in this phase.
- Do not add permissions, approval flow, multiple Feishu groups, or Feishu-side editing.
- Persist the full data model: projects, members, iterations, issues, issue events, docs, doc links, doc comments, standups, standup items, milestones, Feishu notifications, Feishu queries.

## Files

- Modify `package.json`: allow `better-sqlite3` test dependency build.
- Create `apps/agilix-api/package.json`: API scripts and dependencies.
- Create `apps/agilix-api/tsconfig.json`: API TypeScript config.
- Create `apps/agilix-api/vitest.config.ts`: Vitest config.
- Create `apps/agilix-api/drizzle.config.ts`: Drizzle migration config.
- Create `apps/agilix-api/src/db/schema.ts`: Drizzle schema.
- Create `apps/agilix-api/src/db/transaction.ts`: explicit transaction-capable database port.
- Create `apps/agilix-api/src/db/client.ts`: D1 Drizzle client factory.
- Create `apps/agilix-api/src/repository.ts`: repository contract.
- Create `apps/agilix-api/src/test/memoryRepository.ts`: route test repository.
- Create `apps/agilix-api/src/test/repositoryConformance.ts`: shared repository behavior tests.
- Create `apps/agilix-api/src/drizzleRepository.ts`: Drizzle repository implementation.
- Create `apps/agilix-api/src/seed.ts`: seed import.
- Create `apps/agilix-api/src/schema.ts`: Zod request schemas.
- Create `apps/agilix-api/src/app.ts`: Hono app factory.
- Create `apps/agilix-api/src/app.test.ts`: route tests.

### Task 1: Scaffold the API Package

**Files:**
- Modify: `package.json`
- Create: `apps/agilix-api/package.json`
- Create: `apps/agilix-api/tsconfig.json`
- Create: `apps/agilix-api/vitest.config.ts`
- Create: `apps/agilix-api/src/app.test.ts`

- [ ] **Step 1: Write the failing API smoke test**

Create `apps/agilix-api/src/app.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createApp } from './app'
import { createMemoryRepository } from './test/memoryRepository'
import { seedData } from '@agilix/app/domain/fixtures'

describe('AgiliX API app', () => {
  it('serves project data through the API package', async () => {
    const app = createApp(createMemoryRepository(seedData))

    const response = await app.request('/api/projects')
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.map((project: { name: string }) => project.name)).toContain('搜索平台')
  })
})
```

- [ ] **Step 2: Run RED**

Run:

```bash
pnpm --filter @agilix/api test -- src/app.test.ts
```

Expected: FAIL because `@agilix/api` does not exist.

- [ ] **Step 3: Add the API package files**

Modify the root `package.json` pnpm build allowlist:

```json
{
  "pnpm": {
    "onlyBuiltDependencies": [
      "better-sqlite3",
      "esbuild",
      "sharp",
      "workerd"
    ]
  }
}
```

Create `apps/agilix-api/package.json`:

```json
{
  "name": "@agilix/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -b",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate"
  },
  "dependencies": {
    "@agilix/app": "workspace:*",
    "drizzle-orm": "^0.38.0",
    "hono": "^4.6.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250101.0",
    "@types/better-sqlite3": "^7.6.0",
    "better-sqlite3": "^11.8.0",
    "drizzle-kit": "^0.30.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

Create `apps/agilix-api/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types", "vitest/globals"]
  },
  "include": ["src", "drizzle.config.ts", "vitest.config.ts"]
}
```

Create `apps/agilix-api/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 4: Run RED again**

Run:

```bash
pnpm --filter @agilix/api test -- src/app.test.ts
```

Expected: FAIL because `app.ts` and `test/memoryRepository.ts` do not exist.

- [ ] **Step 5: Commit**

```bash
git add package.json apps/agilix-api/package.json apps/agilix-api/tsconfig.json apps/agilix-api/vitest.config.ts apps/agilix-api/src/app.test.ts
git commit -m "test: start AgiliX API package"
```

### Task 2: Add Drizzle Schema and Repository Contract

**Files:**
- Create: `apps/agilix-api/drizzle.config.ts`
- Create: `apps/agilix-api/src/db/schema.ts`
- Create: `apps/agilix-api/src/db/transaction.ts`
- Create: `apps/agilix-api/src/db/client.ts`
- Create: `apps/agilix-api/src/repository.ts`
- Test: `apps/agilix-api/src/db/schema.test.ts`

- [ ] **Step 1: Write the failing schema coverage test**

Create `apps/agilix-api/src/db/schema.test.ts`:

```ts
import { describe, expect, expectTypeOf, it } from 'vitest'
import * as schema from './schema'
import { createDbClient } from './client'
import type { TransactionDatabase } from './transaction'

describe('AgiliX relational schema', () => {
  it('defines every table needed by the full product', () => {
    expect(Object.keys(schema).sort()).toEqual([
      'docComments',
      'docIssueLinks',
      'documents',
      'feishuNotifications',
      'feishuQueries',
      'issueEvents',
      'issues',
      'iterations',
      'members',
      'milestones',
      'projects',
      'standupItems',
      'standups',
    ])
  })

  it('exposes an explicit transaction-capable database port', () => {
    type Client = ReturnType<typeof createDbClient>

    expectTypeOf<Client>().toEqualTypeOf<TransactionDatabase>()
  })
})
```

- [ ] **Step 2: Run RED**

Run:

```bash
pnpm --filter @agilix/api test -- src/db/schema.test.ts
```

Expected: FAIL because `src/db/schema.ts`, `src/db/client.ts`, and `src/db/transaction.ts` do not exist.

- [ ] **Step 3: Add Drizzle config and schema**

Create `apps/agilix-api/drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
})
```

Create `apps/agilix-api/src/db/schema.ts`:

```ts
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  glyph: text('glyph').notNull(),
  color: text('color').notNull(),
  activeIterationCode: text('active_iteration_code').notNull(),
})

export const members = sqliteTable('members', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  capacity: integer('capacity').notNull(),
})

export const iterations = sqliteTable('iterations', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  name: text('name').notNull(),
  day: integer('day').notNull(),
  totalDays: integer('total_days').notNull(),
  goal: text('goal').notNull(),
  velocity: integer('velocity').notNull(),
}, (table) => [uniqueIndex('iterations_project_code').on(table.projectId, table.code)])

export const issues = sqliteTable('issues', {
  key: text('key').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  iterationId: text('iteration_id').notNull().references(() => iterations.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['story', 'bug', 'task', 'tech'] }).notNull(),
  title: text('title').notNull(),
  status: text('status', { enum: ['todo', 'doing', 'review', 'blocked', 'done'] }).notNull(),
  priority: text('priority', { enum: ['high', 'medium', 'low'] }).notNull(),
  assigneeId: text('assignee_id').notNull().references(() => members.id),
  storyPoints: integer('story_points').notNull(),
  blockerReason: text('blocker_reason'),
}, (table) => [index('issues_project_status').on(table.projectId, table.status), index('issues_assignee').on(table.assigneeId)])

export const issueEvents = sqliteTable('issue_events', {
  id: text('id').primaryKey(),
  issueKey: text('issue_key').notNull().references(() => issues.key, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  actorId: text('actor_id').references(() => members.id),
  message: text('message').notNull(),
  createdAt: text('created_at').notNull(),
})

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  scope: text('scope', { enum: ['global', 'project'] }).notNull(),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  directory: text('directory').notNull(),
  body: text('body').notNull(),
  updatedAtLabel: text('updated_at_label').notNull(),
}, (table) => [index('documents_project').on(table.projectId)])

export const docIssueLinks = sqliteTable('doc_issue_links', {
  docId: text('doc_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  issueKey: text('issue_key').notNull().references(() => issues.key, { onDelete: 'cascade' }),
}, (table) => [uniqueIndex('doc_issue_links_unique').on(table.docId, table.issueKey)])

export const docComments = sqliteTable('doc_comments', {
  id: text('id').primaryKey(),
  docId: text('doc_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  authorId: text('author_id').notNull().references(() => members.id),
  body: text('body').notNull(),
  resolved: integer('resolved', { mode: 'boolean' }).notNull(),
  createdAtLabel: text('created_at_label').notNull(),
})

export const standups = sqliteTable('standups', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  dateLabel: text('date_label').notNull(),
  timeLabel: text('time_label').notNull(),
})

export const standupItems = sqliteTable('standup_items', {
  id: text('id').primaryKey(),
  standupId: text('standup_id').notNull().references(() => standups.id, { onDelete: 'cascade' }),
  memberId: text('member_id').notNull().references(() => members.id),
  yesterdayJson: text('yesterday_json').notNull(),
  todayJson: text('today_json').notNull(),
  blockersJson: text('blockers_json').notNull(),
})

export const milestones = sqliteTable('milestones', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  iterationId: text('iteration_id').notNull().references(() => iterations.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  startDay: integer('start_day').notNull(),
  endDay: integer('end_day').notNull(),
  status: text('status', { enum: ['done', 'doing', 'risk', 'planned'] }).notNull(),
  ownerId: text('owner_id').notNull().references(() => members.id),
})

export const feishuNotifications = sqliteTable('feishu_notifications', {
  id: text('id').primaryKey(),
  trigger: text('trigger').notNull(),
  targetGroup: text('target_group').notNull(),
  payloadJson: text('payload_json').notNull(),
  status: text('status', { enum: ['queued', 'sent', 'failed'] }).notNull(),
  createdAt: text('created_at').notNull(),
})

export const feishuQueries = sqliteTable('feishu_queries', {
  id: text('id').primaryKey(),
  command: text('command').notNull(),
  responseTitle: text('response_title').notNull(),
  responseBodyJson: text('response_body_json').notNull(),
  createdAt: text('created_at').notNull(),
})
```

Create `apps/agilix-api/src/db/transaction.ts`:

```ts
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import * as schema from './schema'

export type RepositoryTx = Pick<DrizzleD1Database<typeof schema>, 'select' | 'insert' | 'update' | 'delete'>

export type TransactionDatabase = RepositoryTx & {
  batch<T extends readonly unknown[]>(queries: T): Promise<unknown[]> | unknown[]
}

export function createTransactionDatabase(db: TransactionDatabase): TransactionDatabase {
  return db
}
```

Create `apps/agilix-api/src/db/client.ts`:

```ts
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'
import { createTransactionDatabase } from './transaction'

export function createDbClient(db: D1Database) {
  return createTransactionDatabase(drizzle(db, { schema }))
}
```

- [ ] **Step 4: Add repository contract**

Create `apps/agilix-api/src/repository.ts`:

```ts
import type { Doc, DocComment, FeishuNotificationPayload, FeishuQueryCommand, Issue, IssueStatus, MemberId, Milestone, Project, ProjectId, SeedData, Standup } from '@agilix/app/domain/types'

export interface IssueFilters {
  projectId: ProjectId | 'all'
  status: IssueStatus | 'all'
  assigneeId: MemberId | 'all'
  keyword: string
}

export interface DocFilters {
  projectId: ProjectId | 'all'
  query: string
}

export interface FeishuReply {
  title: string
  lines: string[]
}

export type FeishuNotificationRecord = {
  id: string
  targetGroup: 'AgiliX 团队群'
  status: 'queued' | 'sent' | 'failed'
  createdAt: string
} & FeishuNotificationPayload

export interface FeishuQueryRecord {
  id: string
  command: FeishuQueryCommand
  reply: FeishuReply
  createdAt: string
}

type CreateDocInputFor<T extends Doc> = Omit<T, 'comments'> & { comments: never[] }
export type CreateDocInput = Doc extends infer D ? D extends Doc ? CreateDocInputFor<D> : never : never
export type CreateDocResult = 'created' | 'duplicate-document' | 'duplicate-linked-issue' | 'linked-issue-not-found' | 'document-comments-not-empty'
export type AddDocCommentResult = 'created' | 'document-not-found' | 'comment-doc-id-mismatch'
export type SaveMilestoneResult = 'saved' | 'milestone-not-found' | 'project-not-found' | 'iteration-not-found' | 'owner-not-found'
export type SaveFeishuNotificationResult = 'saved' | 'standup-not-found' | 'issue-not-found' | 'document-not-found' | 'comment-not-found'

export interface AgiliXRepository {
  seed(data: SeedData): Promise<void>
  listProjects(): Promise<Project[]>
  listIssues(filters: IssueFilters): Promise<Issue[]>
  moveIssue(issueKey: string, status: IssueStatus): Promise<boolean>
  listDocs(filters: DocFilters): Promise<Doc[]>
  getDoc(docId: string): Promise<Doc | undefined>
  createDoc(doc: CreateDocInput): Promise<CreateDocResult>
  addDocComment(docId: string, comment: DocComment): Promise<AddDocCommentResult>
  listStandups(filters: { projectId: ProjectId | 'all' }): Promise<Standup[]>
  saveStandup(standup: Standup): Promise<boolean>
  listMilestones(filters: { projectId: ProjectId | 'all' }): Promise<Milestone[]>
  saveMilestone(milestone: Milestone): Promise<SaveMilestoneResult>
  saveFeishuNotification(input: FeishuNotificationRecord): Promise<SaveFeishuNotificationResult>
  listFeishuNotifications(): Promise<FeishuNotificationRecord[]>
  saveFeishuQuery(input: FeishuQueryRecord): Promise<void>
  listFeishuQueries(): Promise<FeishuQueryRecord[]>
  loadData(): Promise<SeedData>
}
```

- [ ] **Step 5: Run GREEN**

Run:

```bash
pnpm --filter @agilix/api test -- src/db/schema.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/agilix-api/drizzle.config.ts apps/agilix-api/src/db apps/agilix-api/src/repository.ts apps/agilix-api/src/db/schema.test.ts
git commit -m "feat: add AgiliX relational schema"
```

### Task 3: Add Memory Repository and Validated API Routes

**Files:**
- Create: `apps/agilix-api/src/test/memoryRepository.ts`
- Create: `apps/agilix-api/src/schema.ts`
- Create: `apps/agilix-api/src/app.ts`
- Modify: `apps/agilix-api/src/app.test.ts`

- [ ] **Step 1: Replace the smoke test with full route behavior tests**

Modify `apps/agilix-api/src/app.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { seedData } from '@agilix/app/domain/fixtures'
import { createApp } from './app'
import { createMemoryRepository } from './test/memoryRepository'

describe('AgiliX API app', () => {
  it('serves every full product module', async () => {
    const app = createApp(createMemoryRepository(seedData))

    expect((await app.request('/api/bootstrap')).status).toBe(200)
    expect((await app.request('/api/projects')).status).toBe(200)
    expect((await app.request('/api/issues?projectId=search&status=all&assigneeId=all&keyword=')).status).toBe(200)
    expect((await app.request('/api/docs?projectId=all&query=%E7%BB%93%E6%9E%9C%E5%8D%A1%E7%89%87')).status).toBe(200)
    expect((await app.request('/api/standups?projectId=search')).status).toBe(200)
    expect((await app.request('/api/milestones?projectId=search')).status).toBe(200)
  })

  it('persists issue moves, document creation and comments, standup edits, milestones, and Feishu records through the repository', async () => {
    const repository = createMemoryRepository(seedData)
    const app = createApp(repository)

    expect((await app.request('/api/issues/SRCH-186/status', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })).status).toBe(204)
    expect((await repository.listIssues({ projectId: 'search', status: 'all', assigneeId: 'all', keyword: '' })).find((issue) => issue.key === 'SRCH-186')?.status).toBe('done')

    expect((await app.request('/api/docs/doc-result-card/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'comment-api',
        docId: 'doc-result-card',
        authorId: 'zhou',
        body: 'API 新增评论',
        resolved: false,
        createdAtLabel: '刚刚',
      }),
    })).status).toBe(201)
    expect((await repository.getDoc('doc-result-card'))?.comments.map((comment) => comment.body)).toContain('API 新增评论')

    const createdDoc = {
      id: 'doc-api-created',
      scope: 'global' as const,
      title: 'API 创建文档',
      directory: '全局文档/待整理',
      body: '通过 API 创建的明确文档结构',
      linkedIssueKeys: [],
      comments: [],
      updatedAtLabel: '刚刚',
    }
    expect((await app.request('/api/docs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(createdDoc),
    })).status).toBe(201)
    expect((await repository.getDoc('doc-api-created'))?.title).toBe('API 创建文档')

    const editedStandup = {
      ...seedData.standups[0],
      items: seedData.standups[0].items.map((item) =>
        item.memberId === 'gao' ? { ...item, today: ['更新后的站会计划'], blockers: [] } : item,
      ),
    }

    expect((await app.request('/api/standups/standup-search-today', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(editedStandup),
    })).status).toBe(204)
    expect((await repository.listStandups({ projectId: 'search' }))[0].items.find((item) => item.memberId === 'gao')?.today).toEqual(['更新后的站会计划'])

    expect((await app.request('/api/milestones/ms-beta', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...seedData.milestones[1], status: 'doing' }),
    })).status).toBe(204)
    expect((await repository.listMilestones({ projectId: 'search' })).find((milestone) => milestone.id === 'ms-beta')?.status).toBe('doing')

    const queryResponse = await app.request('/api/feishu/query', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ command: { type: 'team' } }),
    })
    expect(queryResponse.status).toBe(200)
    expect((await queryResponse.json()).title).toBe('团队状态')
    expect((await repository.listFeishuQueries()).map((query) => query.command)).toEqual([{ type: 'team' }])

    expect((await app.request('/api/feishu/notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'notification-standup',
        trigger: '站会摘要',
        targetGroup: 'AgiliX 团队群',
        payload: { standupId: 'standup-search-today' },
        status: 'queued',
        createdAt: '2026-06-06T10:00:00.000Z',
      }),
    })).status).toBe(201)
    expect((await repository.listFeishuNotifications()).map((notification) => notification.trigger)).toEqual(['站会摘要'])
  })

  it('rejects invalid mutation payloads, id mismatches, missing documents, and invalid document references', async () => {
    const app = createApp(createMemoryRepository(seedData))

    expect((await app.request('/api/issues/SRCH-186/status', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done', extra: true }),
    })).status).toBe(400)

    expect((await app.request('/api/issues/SRCH-186/status', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'invalid' }),
    })).status).toBe(400)

    expect((await app.request('/api/issues/SRCH-186/status', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: '{"status":',
    })).status).toBe(400)

    expect((await app.request('/api/issues/MISSING-1/status', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })).status).toBe(404)

    expect((await app.request('/api/issues?projectId=missing&status=all&assigneeId=all&keyword=')).status).toBe(400)
    expect((await app.request('/api/issues?projectId=search&status=invalid&assigneeId=all&keyword=')).status).toBe(400)
    expect((await app.request('/api/issues?projectId=search&status=all&assigneeId=all')).status).toBe(400)
    expect((await app.request('/api/issues?projectId=search&status=all&assigneeId=all&keyword=&extra=1')).status).toBe(400)
    expect((await app.request('/api/docs?projectId=missing&query=')).status).toBe(400)
    expect((await app.request('/api/docs?projectId=all')).status).toBe(400)
    expect((await app.request('/api/standups?projectId=missing')).status).toBe(400)
    expect((await app.request('/api/standups?projectId=search&extra=1')).status).toBe(400)
    expect((await app.request('/api/milestones?projectId=missing')).status).toBe(400)

    expect((await app.request('/api/docs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'doc-result-card',
        scope: 'project',
        projectId: 'search',
        title: '重复文档',
        directory: '项目文档/搜索平台/结果页',
        body: '重复 ID 不允许创建。',
        linkedIssueKeys: [],
        comments: [],
        updatedAtLabel: '刚刚',
      }),
    })).status).toBe(409)

    expect((await app.request('/api/docs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'doc-invalid-linked-issue',
        scope: 'project',
        projectId: 'search',
        title: '无效关联 Issue',
        directory: '项目文档/搜索平台/结果页',
        body: '关联的 issue 必须已经存在。',
        linkedIssueKeys: ['MISSING-1'],
        comments: [],
        updatedAtLabel: '刚刚',
      }),
    })).status).toBe(400)

    expect((await app.request('/api/docs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'doc-duplicate-linked-issue',
        scope: 'project',
        projectId: 'search',
        title: '重复关联 Issue',
        directory: '项目文档/搜索平台/结果页',
        body: '同一文档不能重复关联同一个 issue。',
        linkedIssueKeys: ['SRCH-186', 'SRCH-186'],
        comments: [],
        updatedAtLabel: '刚刚',
      }),
    })).status).toBe(400)

    expect((await app.request('/api/docs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'doc-create-with-comment',
        scope: 'project',
        projectId: 'search',
        title: '创建时携带评论',
        directory: '项目文档/搜索平台/结果页',
        body: '文档创建时不能携带评论。',
        linkedIssueKeys: [],
        comments: [{
          id: 'comment-create-doc',
          docId: 'doc-create-with-comment',
          authorId: 'zhou',
          body: 'Comment must use the comment endpoint.',
          resolved: false,
          createdAtLabel: '刚刚',
        }],
        updatedAtLabel: '刚刚',
      }),
    })).status).toBe(400)

    expect((await app.request('/api/docs/other-doc/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'comment-api',
        docId: 'doc-result-card',
        authorId: 'zhou',
        body: 'API 新增评论',
        resolved: false,
        createdAtLabel: '刚刚',
      }),
    })).status).toBe(400)

    expect((await app.request('/api/docs/missing-doc/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'comment-missing',
        docId: 'missing-doc',
        authorId: 'zhou',
        body: 'Missing doc comment',
        resolved: false,
        createdAtLabel: '刚刚',
      }),
    })).status).toBe(404)

    expect((await app.request('/api/standups/wrong-standup', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(seedData.standups[0]),
    })).status).toBe(400)

    expect((await app.request('/api/standups/missing-standup', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...seedData.standups[0], id: 'missing-standup' }),
    })).status).toBe(404)

    expect((await app.request('/api/milestones/wrong-milestone', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(seedData.milestones[1]),
    })).status).toBe(400)

    expect((await app.request('/api/milestones/missing-milestone', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...seedData.milestones[1], id: 'missing-milestone' }),
    })).status).toBe(404)

    expect((await app.request('/api/milestones/ms-beta', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...seedData.milestones[1], iterationId: 'missing-iteration' }),
    })).status).toBe(400)

    expect((await app.request('/api/feishu/query', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ command: { type: 'unknown' } }),
    })).status).toBe(400)

    expect((await app.request('/api/feishu/query', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ command: { type: 'docs', query: '   ' } }),
    })).status).toBe(400)

    expect((await app.request('/api/feishu/query', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ command: { type: 'docs', query: ' 结果卡片' } }),
    })).status).toBe(400)

    expect((await app.request('/api/feishu/query', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ command: { type: 'team' }, extra: true }),
    })).status).toBe(400)

    expect((await app.request('/api/feishu/notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'notification-invalid',
        trigger: '站会摘要',
        targetGroup: 'AgiliX 团队群',
        payload: { trigger: '站会摘要' },
        status: 'queued',
        createdAt: '2026-06-06T10:00:00.000Z',
      }),
    })).status).toBe(400)

    expect((await app.request('/api/feishu/notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'notification-extra',
        trigger: '站会摘要',
        targetGroup: 'AgiliX 团队群',
        payload: { standupId: 'standup-search-today' },
        status: 'queued',
        createdAt: '2026-06-06T10:00:00.000Z',
        extra: true,
      }),
    })).status).toBe(400)

    expect((await app.request('/api/feishu/notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'notification-missing-standup',
        trigger: '站会摘要',
        targetGroup: 'AgiliX 团队群',
        payload: { standupId: 'missing-standup' },
        status: 'queued',
        createdAt: '2026-06-06T10:00:00.000Z',
      }),
    })).status).toBe(400)

    expect((await app.request('/api/feishu/notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'notification-empty-blockers',
        trigger: '阻塞提醒',
        targetGroup: 'AgiliX 团队群',
        payload: { issueKeys: [] },
        status: 'queued',
        createdAt: '2026-06-06T10:00:00.000Z',
      }),
    })).status).toBe(400)

    expect((await app.request('/api/feishu/notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'notification-missing-issue',
        trigger: '阻塞提醒',
        targetGroup: 'AgiliX 团队群',
        payload: { issueKeys: ['MISSING-1'] },
        status: 'queued',
        createdAt: '2026-06-06T10:00:00.000Z',
      }),
    })).status).toBe(400)

    expect((await app.request('/api/feishu/notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'notification-missing-comment',
        trigger: '文档评论',
        targetGroup: 'AgiliX 团队群',
        payload: { docId: 'doc-result-card', commentId: 'missing-comment' },
        status: 'queued',
        createdAt: '2026-06-06T10:00:00.000Z',
      }),
    })).status).toBe(400)
  })
})
```

- [ ] **Step 2: Run RED**

Run:

```bash
pnpm --filter @agilix/api test -- src/app.test.ts
```

Expected: FAIL because route schemas, app factory, and memory repository do not exist.

- [ ] **Step 3: Add memory repository**

Create `apps/agilix-api/src/test/memoryRepository.ts`:

```ts
import { filterDocs, searchDocs } from '@agilix/app/domain/docs'
import { filterIssues, moveIssue } from '@agilix/app/domain/issues'
import type { Doc, DocComment, IssueStatus, Milestone, SeedData, Standup } from '@agilix/app/domain/types'
import type { AgiliXRepository, CreateDocInput, DocFilters, FeishuNotificationRecord, FeishuQueryRecord, IssueFilters, SaveFeishuNotificationResult, SaveMilestoneResult } from '../repository'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function assertUnique(values: string[], label: string) {
  const seen = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Duplicate seed ${label}: ${value}`)
    seen.add(value)
  }
}

function assertReference(values: Set<string>, value: string, message: string) {
  if (!values.has(value)) throw new Error(message)
}

function assertStandupMembers(memberIds: Set<string>, standup: Standup) {
  for (const item of standup.items) {
    assertReference(memberIds, item.memberId, `Standup member not found: ${item.memberId}`)
  }
}

function assertSeedData(data: SeedData) {
  assertUnique(data.projects.map((project) => project.id), 'project id')
  assertUnique(data.members.map((member) => member.id), 'member id')
  assertUnique(data.iterations.map((iteration) => iteration.id), 'iteration id')
  assertUnique(data.iterations.map((iteration) => `${iteration.projectId}:${iteration.code}`), 'iteration project code')
  assertUnique(data.issues.map((issue) => issue.key), 'issue key')
  assertUnique(data.docs.map((doc) => doc.id), 'document id')
  assertUnique(data.docs.flatMap((doc) => doc.linkedIssueKeys.map((issueKey) => `${doc.id}:${issueKey}`)), 'document issue link')
  assertUnique(data.docs.flatMap((doc) => doc.comments.map((comment) => comment.id)), 'document comment id')
  assertUnique(data.standups.map((standup) => standup.id), 'standup id')
  assertUnique(data.milestones.map((milestone) => milestone.id), 'milestone id')

  const projectIds = new Set(data.projects.map((project) => project.id))
  const memberIds = new Set(data.members.map((member) => member.id))
  const iterationIds = new Set(data.iterations.map((iteration) => iteration.id))
  const issueKeys = new Set(data.issues.map((issue) => issue.key))
  const docIds = new Set(data.docs.map((doc) => doc.id))

  for (const iteration of data.iterations) {
    assertReference(projectIds, iteration.projectId, `Seed project not found: ${iteration.projectId}`)
  }
  for (const issue of data.issues) {
    assertReference(projectIds, issue.projectId, `Seed project not found: ${issue.projectId}`)
    assertReference(iterationIds, issue.iterationId, `Seed iteration not found: ${issue.iterationId}`)
    assertReference(memberIds, issue.assigneeId, `Seed member not found: ${issue.assigneeId}`)
    for (const docId of issue.linkedDocIds) {
      assertReference(docIds, docId, `Seed linked document not found: ${docId}`)
    }
  }
  for (const doc of data.docs) {
    if (doc.scope === 'project') assertReference(projectIds, doc.projectId, `Seed project not found: ${doc.projectId}`)
    for (const issueKey of doc.linkedIssueKeys) {
      assertReference(issueKeys, issueKey, `Seed linked issue not found: ${issueKey}`)
    }
    for (const comment of doc.comments) {
      if (comment.docId !== doc.id) throw new Error(`Seed comment document mismatch: ${comment.id}`)
      assertReference(docIds, comment.docId, `Seed comment document not found: ${comment.docId}`)
      assertReference(memberIds, comment.authorId, `Seed comment author not found: ${comment.authorId}`)
    }
  }
  for (const standup of data.standups) {
    assertReference(projectIds, standup.projectId, `Seed project not found: ${standup.projectId}`)
    assertStandupMembers(memberIds, standup)
  }
  for (const milestone of data.milestones) {
    assertReference(projectIds, milestone.projectId, `Seed project not found: ${milestone.projectId}`)
    assertReference(iterationIds, milestone.iterationId, `Seed iteration not found: ${milestone.iterationId}`)
    assertReference(memberIds, milestone.ownerId, `Seed milestone owner not found: ${milestone.ownerId}`)
  }
}

export function createMemoryRepository(seed: SeedData): AgiliXRepository {
  assertSeedData(seed)
  const data = clone(seed)
  let seeded = seed.projects.length > 0 || seed.members.length > 0 || seed.iterations.length > 0 || seed.issues.length > 0 || seed.docs.length > 0 || seed.standups.length > 0 || seed.milestones.length > 0
  const feishuNotifications: FeishuNotificationRecord[] = []
  const feishuQueries: FeishuQueryRecord[] = []

  function validateMilestoneReferences(milestone: Milestone): SaveMilestoneResult {
    if (!data.milestones.some((item) => item.id === milestone.id)) return 'milestone-not-found'
    if (!data.projects.some((project) => project.id === milestone.projectId)) return 'project-not-found'
    if (!data.iterations.some((iteration) => iteration.id === milestone.iterationId && iteration.projectId === milestone.projectId)) return 'iteration-not-found'
    if (!data.members.some((member) => member.id === milestone.ownerId)) return 'owner-not-found'
    return 'saved'
  }

  function validateFeishuNotificationReferences(input: FeishuNotificationRecord): SaveFeishuNotificationResult {
    switch (input.trigger) {
      case '站会摘要':
        return data.standups.some((standup) => standup.id === input.payload.standupId) ? 'saved' : 'standup-not-found'
      case '阻塞提醒': {
        const issueKeys = new Set(data.issues.map((issue) => issue.key))
        return input.payload.issueKeys.every((issueKey) => issueKeys.has(issueKey)) ? 'saved' : 'issue-not-found'
      }
      case '文档评论': {
        const doc = data.docs.find((item) => item.id === input.payload.docId)
        if (!doc) return 'document-not-found'
        return doc.comments.some((comment) => comment.id === input.payload.commentId) ? 'saved' : 'comment-not-found'
      }
    }
  }

  return {
    async seed(nextData) {
      if (seeded) throw new Error('Repository already seeded')
      assertSeedData(nextData)
      Object.assign(data, clone(nextData))
      seeded = true
    },
    async listProjects() {
      return clone(data.projects)
    },
    async listIssues(filters: IssueFilters) {
      return clone(filterIssues(data.issues, filters))
    },
    async moveIssue(issueKey: string, status: IssueStatus) {
      if (!data.issues.some((issue) => issue.key === issueKey)) return false
      data.issues = moveIssue(data.issues, issueKey, status)
      return true
    },
    async listDocs(filters: DocFilters) {
      const docs = filterDocs(data.docs, filters.projectId)
      return clone(filters.query === '' ? docs : searchDocs(docs, filters.query))
    },
    async getDoc(docId: string) {
      return clone(data.docs.find((doc) => doc.id === docId))
    },
    async createDoc(doc: CreateDocInput) {
      if (data.docs.some((item) => item.id === doc.id)) return 'duplicate-document'
      if (doc.comments.length > 0) return 'document-comments-not-empty'
      if (new Set(doc.linkedIssueKeys).size !== doc.linkedIssueKeys.length) return 'duplicate-linked-issue'
      if (!doc.linkedIssueKeys.every((issueKey) => data.issues.some((issue) => issue.key === issueKey))) return 'linked-issue-not-found'
      data.docs = [...data.docs, clone(doc)]
      return 'created'
    },
    async addDocComment(docId: string, comment: DocComment) {
      if (comment.docId !== docId) return 'comment-doc-id-mismatch'
      if (!data.docs.some((doc) => doc.id === docId)) return 'document-not-found'
      data.docs = data.docs.map((doc): Doc => (doc.id === docId ? { ...doc, comments: [...doc.comments, comment] } : doc))
      return 'created'
    },
    async listStandups(filters) {
      return clone(filters.projectId === 'all' ? data.standups : data.standups.filter((standup) => standup.projectId === filters.projectId))
    },
    async saveStandup(standup: Standup) {
      if (!data.standups.some((item) => item.id === standup.id)) return false
      assertStandupMembers(new Set(data.members.map((member) => member.id)), standup)
      data.standups = [...data.standups.filter((item) => item.id !== standup.id), standup]
      return true
    },
    async listMilestones(filters) {
      return clone(filters.projectId === 'all' ? data.milestones : data.milestones.filter((milestone) => milestone.projectId === filters.projectId))
    },
    async saveMilestone(milestone: Milestone) {
      const result = validateMilestoneReferences(milestone)
      if (result !== 'saved') return result
      data.milestones = [...data.milestones.filter((item) => item.id !== milestone.id), milestone]
      return 'saved'
    },
    async saveFeishuNotification(input) {
      const result = validateFeishuNotificationReferences(input)
      if (result !== 'saved') return result
      feishuNotifications.push(clone(input))
      return 'saved'
    },
    async saveFeishuQuery(input) {
      feishuQueries.push(clone(input))
    },
    async listFeishuNotifications() {
      return clone(feishuNotifications)
    },
    async listFeishuQueries() {
      return clone(feishuQueries)
    },
    async loadData() {
      return clone(data)
    },
  }
}
```

- [ ] **Step 4: Add request schemas**

Create `apps/agilix-api/src/schema.ts`:

```ts
import { createDocQueryCommand } from '@agilix/app/domain/feishu'
import type { FeishuQueryCommand } from '@agilix/app/domain/types'
import type { CreateDocInput, FeishuNotificationRecord } from './repository'
import { z } from 'zod'

export const projectIdSchema = z.enum(['search', 'data', 'api', 'mobile'])
export const projectFilterSchema = z.enum(['all', 'search', 'data', 'api', 'mobile'])
export const memberIdSchema = z.enum(['lin', 'chen', 'gao', 'su', 'han', 'he', 'jiang', 'zhou'])
export const issueStatusSchema = z.enum(['todo', 'doing', 'review', 'blocked', 'done'])
export const issueTypeSchema = z.enum(['story', 'bug', 'task', 'tech'])
export const prioritySchema = z.enum(['high', 'medium', 'low'])
export const docScopeSchema = z.enum(['global', 'project'])
export const milestoneStatusSchema = z.enum(['done', 'doing', 'risk', 'planned'])
export const stringArraySchema = z.array(z.string())
const nonEmptyStringArraySchema = z.array(z.string().min(1)).min(1).transform((items) => items as [string, ...string[]])

export const issueQuerySchema = z.object({
  projectId: projectFilterSchema,
  status: z.union([issueStatusSchema, z.literal('all')]),
  assigneeId: z.union([memberIdSchema, z.literal('all')]),
  keyword: z.string(),
}).strict()

export const docQuerySchema = z.object({
  projectId: projectFilterSchema,
  query: z.string(),
}).strict()

export const projectScopedQuerySchema = z.object({
  projectId: projectFilterSchema,
}).strict()

export const moveIssueSchema = z.object({
  status: issueStatusSchema,
}).strict()

const docBaseSchema = {
  id: z.string().min(1),
  title: z.string().min(1),
  directory: z.string().min(1),
  body: z.string().min(1),
  linkedIssueKeys: z.array(z.string().min(1)).refine((keys) => new Set(keys).size === keys.length, 'linkedIssueKeys must be unique'),
  comments: z.array(z.never()).length(0),
  updatedAtLabel: z.string().min(1),
}

export const docSchema: z.ZodType<CreateDocInput> = z.discriminatedUnion('scope', [
  z.object({ ...docBaseSchema, scope: z.literal('global'), projectId: z.undefined().optional() }).strict(),
  z.object({ ...docBaseSchema, scope: z.literal('project'), projectId: projectIdSchema }).strict(),
])

export const docCommentSchema = z.object({
  id: z.string().min(1),
  docId: z.string().min(1),
  authorId: memberIdSchema,
  body: z.string().min(1),
  resolved: z.boolean(),
  createdAtLabel: z.string().min(1),
}).strict()

const feishuDocsQuerySchema = z.string()
  .min(1)
  .refine((query) => query === query.trim(), 'docs query must not include leading or trailing whitespace')

const feishuCommandSchema: z.ZodType<FeishuQueryCommand> = z.union([
  z.object({ type: z.literal('team') }).strict(),
  z.object({ type: z.literal('blockers') }).strict(),
  z.object({ type: z.literal('docs'), query: feishuDocsQuerySchema }).strict().transform((command) => createDocQueryCommand(command.query)),
])

export const feishuQuerySchema = z.object({
  command: feishuCommandSchema,
}).strict()

const feishuNotificationBaseSchema = {
  id: z.string().min(1),
  targetGroup: z.literal('AgiliX 团队群'),
  status: z.enum(['queued', 'sent', 'failed']),
  createdAt: z.string().min(1),
}

export const feishuNotificationSchema: z.ZodType<FeishuNotificationRecord> = z.discriminatedUnion('trigger', [
  z.object({ ...feishuNotificationBaseSchema, trigger: z.literal('站会摘要'), payload: z.object({ standupId: z.string().min(1) }).strict() }).strict(),
  z.object({ ...feishuNotificationBaseSchema, trigger: z.literal('阻塞提醒'), payload: z.object({ issueKeys: nonEmptyStringArraySchema }).strict() }).strict(),
  z.object({ ...feishuNotificationBaseSchema, trigger: z.literal('文档评论'), payload: z.object({ docId: z.string().min(1), commentId: z.string().min(1) }).strict() }).strict(),
])

export const standupItemSchema = z.object({
  memberId: memberIdSchema,
  yesterday: z.array(z.string()),
  today: z.array(z.string()),
  blockers: z.array(z.string()),
}).strict()

export const standupSchema = z.object({
  id: z.string().min(1),
  projectId: projectIdSchema,
  dateLabel: z.string().min(1),
  timeLabel: z.string().min(1),
  items: z.array(standupItemSchema),
}).strict()

export const milestoneSchema = z.object({
  id: z.string().min(1),
  projectId: projectIdSchema,
  iterationId: z.string().min(1),
  title: z.string().min(1),
  startDay: z.number().int(),
  endDay: z.number().int(),
  status: milestoneStatusSchema,
  ownerId: memberIdSchema,
}).strict()
```

- [ ] **Step 5: Add Hono app factory**

Create `apps/agilix-api/src/app.ts`:

```ts
import { buildFeishuReply } from '@agilix/app/domain/feishu'
import { Hono, type Context } from 'hono'
import type { z } from 'zod'
import type { AddDocCommentResult, AgiliXRepository, CreateDocResult, SaveFeishuNotificationResult, SaveMilestoneResult } from './repository'
import { docCommentSchema, docQuerySchema, docSchema, feishuNotificationSchema, feishuQuerySchema, issueQuerySchema, milestoneSchema, moveIssueSchema, projectScopedQuerySchema, standupSchema } from './schema'

type ParseResult<T> = { value: T; response?: never } | { value?: never; response: Response }
type JsonFailure = { message: string; status: 400 | 404 | 409 }

const createDocFailures = {
  'duplicate-document': { message: 'Document already exists', status: 409 },
  'duplicate-linked-issue': { message: 'Duplicate linked issue', status: 400 },
  'linked-issue-not-found': { message: 'Linked issue not found', status: 400 },
  'document-comments-not-empty': { message: 'Document comments must be empty on create', status: 400 },
} satisfies Record<Exclude<CreateDocResult, 'created'>, JsonFailure>

const addDocCommentFailures = {
  'document-not-found': { message: 'Document not found', status: 404 },
  'comment-doc-id-mismatch': { message: 'Comment docId must match route id', status: 400 },
} satisfies Record<Exclude<AddDocCommentResult, 'created'>, JsonFailure>

const saveMilestoneFailures = {
  'milestone-not-found': { message: 'Milestone not found', status: 404 },
  'project-not-found': { message: 'Project not found', status: 400 },
  'iteration-not-found': { message: 'Iteration not found', status: 400 },
  'owner-not-found': { message: 'Owner not found', status: 400 },
} satisfies Record<Exclude<SaveMilestoneResult, 'saved'>, JsonFailure>

const saveFeishuNotificationFailures = {
  'standup-not-found': { message: 'Standup not found', status: 400 },
  'issue-not-found': { message: 'Issue not found', status: 400 },
  'document-not-found': { message: 'Document not found', status: 400 },
  'comment-not-found': { message: 'Comment not found', status: 400 },
} satisfies Record<Exclude<SaveFeishuNotificationResult, 'saved'>, JsonFailure>

async function parseJson<T>(context: Context, schema: z.ZodType<T>): Promise<ParseResult<T>> {
  let json: unknown
  try {
    json = await context.req.json()
  } catch {
    return { response: context.json({ message: 'Malformed JSON' }, 400) }
  }

  const parsed = schema.safeParse(json)
  if (!parsed.success) return { response: context.json({ message: 'Validation error', issues: parsed.error.issues }, 400) }
  return { value: parsed.data }
}

function parseQuery<T>(context: Context, schema: z.ZodType<T>): ParseResult<T> {
  const parsed = schema.safeParse(context.req.query())
  if (!parsed.success) return { response: context.json({ message: 'Validation error', issues: parsed.error.issues }, 400) }
  return { value: parsed.data }
}

function idMismatch(context: Context, message: string) {
  return context.json({ message }, 400)
}

export function createApp(repository: AgiliXRepository) {
  const app = new Hono()

  app.get('/api/bootstrap', async (context) => context.json(await repository.loadData()))

  app.get('/api/projects', async (context) => context.json(await repository.listProjects()))

  app.get('/api/issues', async (context) => {
    const parsed = parseQuery(context, issueQuerySchema)
    if ('response' in parsed) return parsed.response
    return context.json(await repository.listIssues(parsed.value))
  })

  app.patch('/api/issues/:key/status', async (context) => {
    const parsed = await parseJson(context, moveIssueSchema)
    if ('response' in parsed) return parsed.response
    const moved = await repository.moveIssue(context.req.param('key'), parsed.value.status)
    return moved ? context.body(null, 204) : context.json({ message: 'Issue not found' }, 404)
  })

  app.get('/api/docs', async (context) => {
    const parsed = parseQuery(context, docQuerySchema)
    if ('response' in parsed) return parsed.response
    return context.json(await repository.listDocs(parsed.value))
  })

  app.post('/api/docs', async (context) => {
    const parsed = await parseJson(context, docSchema)
    if ('response' in parsed) return parsed.response
    const result = await repository.createDoc(parsed.value)
    if (result === 'created') return context.json(parsed.value, 201)
    const failure = createDocFailures[result]
    return context.json({ message: failure.message }, failure.status)
  })

  app.get('/api/docs/:id', async (context) => {
    const doc = await repository.getDoc(context.req.param('id'))
    return doc ? context.json(doc) : context.json({ message: 'Document not found' }, 404)
  })

  app.post('/api/docs/:id/comments', async (context) => {
    const parsed = await parseJson(context, docCommentSchema)
    if ('response' in parsed) return parsed.response
    if (parsed.value.docId !== context.req.param('id')) return idMismatch(context, 'Comment docId must match route id')
    const result = await repository.addDocComment(context.req.param('id'), parsed.value)
    if (result === 'created') return context.json(parsed.value, 201)
    const failure = addDocCommentFailures[result]
    return context.json({ message: failure.message }, failure.status)
  })

  app.get('/api/standups', async (context) => {
    const parsed = parseQuery(context, projectScopedQuerySchema)
    if ('response' in parsed) return parsed.response
    return context.json(await repository.listStandups(parsed.value))
  })

  app.put('/api/standups/:id', async (context) => {
    const parsed = await parseJson(context, standupSchema)
    if ('response' in parsed) return parsed.response
    if (parsed.value.id !== context.req.param('id')) return idMismatch(context, 'Standup id must match route id')
    const saved = await repository.saveStandup(parsed.value)
    return saved ? context.body(null, 204) : context.json({ message: 'Standup not found' }, 404)
  })

  app.get('/api/milestones', async (context) => {
    const parsed = parseQuery(context, projectScopedQuerySchema)
    if ('response' in parsed) return parsed.response
    return context.json(await repository.listMilestones(parsed.value))
  })

  app.put('/api/milestones/:id', async (context) => {
    const parsed = await parseJson(context, milestoneSchema)
    if ('response' in parsed) return parsed.response
    if (parsed.value.id !== context.req.param('id')) return idMismatch(context, 'Milestone id must match route id')
    const result = await repository.saveMilestone(parsed.value)
    if (result === 'saved') return context.body(null, 204)
    const failure = saveMilestoneFailures[result]
    return context.json({ message: failure.message }, failure.status)
  })

  app.post('/api/feishu/query', async (context) => {
    const parsed = await parseJson(context, feishuQuerySchema)
    if ('response' in parsed) return parsed.response
    const reply = buildFeishuReply(parsed.value.command, await repository.loadData())
    await repository.saveFeishuQuery({ id: crypto.randomUUID(), command: parsed.value.command, reply, createdAt: new Date().toISOString() })
    return context.json(reply)
  })

  app.post('/api/feishu/notifications', async (context) => {
    const parsed = await parseJson(context, feishuNotificationSchema)
    if ('response' in parsed) return parsed.response
    const result = await repository.saveFeishuNotification(parsed.value)
    if (result !== 'saved') {
      const failure = saveFeishuNotificationFailures[result]
      return context.json({ message: failure.message }, failure.status)
    }
    return context.json(parsed.value, 201)
  })

  return app
}
```

- [ ] **Step 6: Run GREEN**

Run:

```bash
pnpm --filter @agilix/api test -- src/app.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/agilix-api/src/app.ts apps/agilix-api/src/schema.ts apps/agilix-api/src/test/memoryRepository.ts apps/agilix-api/src/app.test.ts
git commit -m "feat: add validated AgiliX API routes"
```

### Task 4: Add Drizzle Repository Conformance Coverage

**Files:**
- Create: `apps/agilix-api/src/test/repositoryConformance.ts`
- Create: `apps/agilix-api/src/test/createTestDrizzleDb.ts`
- Create: `apps/agilix-api/src/drizzleRepository.ts`
- Create: `apps/agilix-api/src/drizzleRepository.test.ts`
- Create: `apps/agilix-api/src/seed.ts`

- [ ] **Step 1: Write shared repository conformance tests**

Create `apps/agilix-api/src/test/repositoryConformance.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { seedData } from '@agilix/app/domain/fixtures'
import type { AgiliXRepository } from '../repository'

export function describeRepositoryConformance(name: string, createRepository: () => AgiliXRepository) {
  describe(name, () => {
    it('persists issue moves and document comments', async () => {
      const repository = createRepository()

      await repository.seed(seedData)
      expect(await repository.moveIssue('SRCH-186', 'done')).toBe(true)
      expect(await repository.addDocComment('doc-result-card', {
        id: 'comment-conformance',
        docId: 'doc-result-card',
        authorId: 'zhou',
        body: 'Repository conformance comment',
        resolved: false,
        createdAtLabel: '刚刚',
      })).toBe('created')
      expect(await repository.createDoc({
        id: 'doc-conformance-created',
        scope: 'global',
        title: 'Repository 创建文档',
        directory: '全局文档/待整理',
        body: 'Repository conformance created doc',
        linkedIssueKeys: [],
        comments: [],
        updatedAtLabel: '刚刚',
      })).toBe('created')
      expect(await repository.saveStandup({
        ...seedData.standups[0],
        items: seedData.standups[0].items.map((item) =>
          item.memberId === 'gao' ? { ...item, today: ['Repository updated standup item'], blockers: [] } : item,
        ),
      })).toBe(true)
      expect(await repository.saveMilestone({ ...seedData.milestones[1], status: 'doing' })).toBe('saved')
      expect(await repository.saveFeishuNotification({
        id: 'notification-conformance',
        trigger: '站会摘要',
        targetGroup: 'AgiliX 团队群',
        payload: { standupId: 'standup-search-today' },
        status: 'queued',
        createdAt: '2026-06-06T10:00:00.000Z',
      })).toBe('saved')
      await repository.saveFeishuQuery({
        id: 'query-conformance',
        command: { type: 'team' },
        reply: { title: '团队状态', lines: ['Issue 7'] },
        createdAt: '2026-06-06T10:01:00.000Z',
      })

      expect((await repository.listIssues({ projectId: 'search', status: 'all', assigneeId: 'all', keyword: '' })).find((issue) => issue.key === 'SRCH-186')?.status).toBe('done')
      expect((await repository.getDoc('doc-result-card'))?.comments.map((comment) => comment.body)).toContain('Repository conformance comment')
      expect((await repository.getDoc('doc-conformance-created'))?.title).toBe('Repository 创建文档')
      expect((await repository.listStandups({ projectId: 'search' }))[0].items.find((item) => item.memberId === 'gao')?.today).toEqual(['Repository updated standup item'])
      expect((await repository.listMilestones({ projectId: 'search' })).find((milestone) => milestone.id === 'ms-beta')?.status).toBe('doing')
      expect((await repository.listFeishuNotifications()).map((notification) => notification.trigger)).toEqual(['站会摘要'])
      expect((await repository.listFeishuQueries()).map((query) => query.command)).toEqual([{ type: 'team' }])
    })

    it('rejects duplicate seed calls instead of skipping conflicts', async () => {
      const repository = createRepository()

      await repository.seed(seedData)

      await expect(repository.seed(seedData)).rejects.toThrow('Repository already seeded')
    })

    it('rejects duplicate seed identifiers before writing data', async () => {
      const repository = createRepository()

      await expect(repository.seed({
        ...seedData,
        projects: [seedData.projects[0], seedData.projects[0]],
      })).rejects.toThrow('Duplicate seed project id')

      expect(await repository.listProjects()).toEqual([])
    })

    it('rejects duplicate seed natural keys before writing data', async () => {
      const repository = createRepository()

      await expect(repository.seed({
        ...seedData,
        iterations: [...seedData.iterations, { ...seedData.iterations[0], id: 'it-duplicate-code' }],
      })).rejects.toThrow('Duplicate seed iteration project code')

      expect(await repository.listProjects()).toEqual([])
    })

    it('rejects invalid seed references before writing data', async () => {
      const repository = createRepository()

      await expect(repository.seed({
        ...seedData,
        docs: [{
          ...seedData.docs[0],
          id: 'doc-invalid-seed-link',
          linkedIssueKeys: ['MISSING-1'],
          comments: [],
        }],
      })).rejects.toThrow('Seed linked issue not found: MISSING-1')

      expect(await repository.listProjects()).toEqual([])
      expect(await repository.listDocs({ projectId: 'all', query: '' })).toEqual([])
    })

    it('rejects invalid mutation targets and document references without creating replacement records', async () => {
      const repository = createRepository()

      await repository.seed(seedData)

      expect(await repository.moveIssue('MISSING-1', 'done')).toBe(false)
      expect(await repository.addDocComment('missing-doc', {
        id: 'comment-missing-conformance',
        docId: 'missing-doc',
        authorId: 'zhou',
        body: 'Missing doc comment',
        resolved: false,
        createdAtLabel: '刚刚',
      })).toBe('document-not-found')
      expect(await repository.addDocComment('doc-result-card', {
        id: 'comment-mismatch-conformance',
        docId: 'other-doc',
        authorId: 'zhou',
        body: 'Mismatched doc id comment',
        resolved: false,
        createdAtLabel: '刚刚',
      })).toBe('comment-doc-id-mismatch')
      expect(await repository.createDoc({
        ...seedData.docs[0],
        comments: [],
      })).toBe('duplicate-document')
      expect(await repository.createDoc({
        id: 'doc-invalid-linked-issue',
        scope: 'project',
        projectId: 'search',
        title: 'Invalid linked issue doc',
        directory: '项目文档/搜索平台/结果页',
        body: 'Linked issue must exist.',
        linkedIssueKeys: ['MISSING-1'],
        comments: [],
        updatedAtLabel: '刚刚',
      })).toBe('linked-issue-not-found')
      expect(await repository.createDoc({
        id: 'doc-duplicate-linked-issue',
        scope: 'project',
        projectId: 'search',
        title: 'Duplicate linked issue doc',
        directory: '项目文档/搜索平台/结果页',
        body: 'Linked issue keys must be unique.',
        linkedIssueKeys: ['SRCH-186', 'SRCH-186'],
        comments: [],
        updatedAtLabel: '刚刚',
      })).toBe('duplicate-linked-issue')
      expect(await repository.createDoc({
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
      })).toBe('document-comments-not-empty')
      expect(await repository.saveStandup({ ...seedData.standups[0], id: 'missing-standup' })).toBe(false)
      expect(await repository.saveMilestone({ ...seedData.milestones[1], id: 'missing-milestone' })).toBe('milestone-not-found')
      expect(await repository.saveMilestone({ ...seedData.milestones[1], iterationId: 'missing-iteration' })).toBe('iteration-not-found')
      expect(await repository.saveMilestone({
        ...seedData.milestones[1],
        // @ts-expect-error invalid owner validates explicit repository result
        ownerId: 'missing-owner',
      })).toBe('owner-not-found')
      expect(await repository.saveFeishuNotification({
        id: 'notification-missing-standup',
        trigger: '站会摘要',
        targetGroup: 'AgiliX 团队群',
        payload: { standupId: 'missing-standup' },
        status: 'queued',
        createdAt: '2026-06-06T10:00:00.000Z',
      })).toBe('standup-not-found')
      expect(await repository.saveFeishuNotification({
        id: 'notification-missing-issue',
        trigger: '阻塞提醒',
        targetGroup: 'AgiliX 团队群',
        payload: { issueKeys: ['MISSING-1'] },
        status: 'queued',
        createdAt: '2026-06-06T10:00:00.000Z',
      })).toBe('issue-not-found')
      expect(await repository.saveFeishuNotification({
        id: 'notification-missing-comment',
        trigger: '文档评论',
        targetGroup: 'AgiliX 团队群',
        payload: { docId: 'doc-result-card', commentId: 'missing-comment' },
        status: 'queued',
        createdAt: '2026-06-06T10:00:00.000Z',
      })).toBe('comment-not-found')

      expect(await repository.listIssues({ projectId: 'all', status: 'all', assigneeId: 'all', keyword: 'MISSING-1' })).toEqual([])
      expect((await repository.getDoc('missing-doc'))).toBeUndefined()
      expect((await repository.getDoc('doc-invalid-linked-issue'))).toBeUndefined()
      expect((await repository.getDoc('doc-duplicate-linked-issue'))).toBeUndefined()
      expect((await repository.getDoc('doc-create-with-comment'))).toBeUndefined()
      expect((await repository.listDocs({ projectId: 'all', query: '' })).filter((doc) => doc.id === seedData.docs[0].id)).toHaveLength(1)
      expect((await repository.listStandups({ projectId: 'all' })).map((standup) => standup.id)).not.toContain('missing-standup')
      expect((await repository.listMilestones({ projectId: 'all' })).map((milestone) => milestone.id)).not.toContain('missing-milestone')
      expect(await repository.listFeishuNotifications()).toEqual([])
    })

    it('keeps existing standup items when a standup save fails', async () => {
      const repository = createRepository()

      await repository.seed(seedData)
      const original = (await repository.listStandups({ projectId: 'search' })).find((standup) => standup.id === 'standup-search-today')

      await expect(repository.saveStandup({
        ...seedData.standups[0],
        items: [{
          ...seedData.standups[0].items[0],
          // @ts-expect-error invalid member id validates repository atomicity
          memberId: 'missing-member',
        }],
      })).rejects.toThrow('Standup member not found: missing-member')

      expect((await repository.listStandups({ projectId: 'search' })).find((standup) => standup.id === 'standup-search-today')?.items).toEqual(original?.items)
    })
  })
}
```

- [ ] **Step 2: Write the failing Drizzle repository test**

Create `apps/agilix-api/src/drizzleRepository.test.ts`:

```ts
import { sql } from 'drizzle-orm'
import { expect, it } from 'vitest'
import { seedData } from '@agilix/app/domain/fixtures'
import { describeRepositoryConformance } from './test/repositoryConformance'
import { createDrizzleRepository } from './drizzleRepository'
import { createTestDrizzleDb } from './test/createTestDrizzleDb'

describeRepositoryConformance('drizzle repository', () => createDrizzleRepository(createTestDrizzleDb()))

it('rejects invalid persisted issue status values', async () => {
  const db = createTestDrizzleDb()
  const repository = createDrizzleRepository(db)
  await repository.seed(seedData)
  db.run(sql`insert into issues (key, project_id, iteration_id, type, title, status, priority, assignee_id, story_points, blocker_reason) values ('BAD-1', 'search', 'search-s24', 'task', 'Bad issue status', 'unknown', 'medium', 'gao', 1, null)`)

  await expect(repository.listIssues({ projectId: 'search', status: 'all', assigneeId: 'all', keyword: '' })).rejects.toThrow()
})

it('rejects invalid persisted issue project ids before applying filters', async () => {
  const db = createTestDrizzleDb()
  const repository = createDrizzleRepository(db)
  await repository.seed(seedData)
  db.corrupt(sql`insert into issues (key, project_id, iteration_id, type, title, status, priority, assignee_id, story_points, blocker_reason) values ('BAD-2', 'missing', 'search-s24', 'task', 'Bad issue project', 'todo', 'medium', 'gao', 1, null)`)

  await expect(repository.listIssues({ projectId: 'search', status: 'all', assigneeId: 'all', keyword: '' })).rejects.toThrow()
})

it('rejects invalid persisted document scopes before applying filters', async () => {
  const db = createTestDrizzleDb()
  const repository = createDrizzleRepository(db)
  await repository.seed(seedData)
  db.run(sql`insert into documents (id, scope, project_id, title, directory, body, updated_at_label) values ('doc-bad-scope', 'unknown', 'data', 'Bad doc scope', '坏数据', 'Bad document scope', '刚刚')`)

  await expect(repository.listDocs({ projectId: 'search', query: '' })).rejects.toThrow()
})

it('rejects invalid persisted planning project ids before applying filters', async () => {
  const db = createTestDrizzleDb()
  const repository = createDrizzleRepository(db)
  await repository.seed(seedData)
  db.corrupt(sql`insert into standups (id, project_id, date_label, time_label) values ('standup-bad-project', 'missing', '星期五', '10:00-10:15')`)
  db.corrupt(sql`insert into milestones (id, project_id, iteration_id, title, start_day, end_day, status, owner_id) values ('milestone-bad-project', 'missing', 'search-s24', 'Bad milestone project', 1, 2, 'planned', 'gao')`)

  await expect(repository.listStandups({ projectId: 'search' })).rejects.toThrow()
  await expect(repository.listMilestones({ projectId: 'search' })).rejects.toThrow()
})

it('rejects invalid persisted Feishu response lines', async () => {
  const db = createTestDrizzleDb()
  const repository = createDrizzleRepository(db)
  await repository.seed(seedData)
  db.run(sql`insert into feishu_queries (id, command, response_title, response_body_json, created_at) values ('query-bad-lines', '/team', '团队状态', '{"line":1}', '2026-06-06T10:01:00.000Z')`)

  await expect(repository.listFeishuQueries()).rejects.toThrow()
})
```

Run:

```bash
pnpm --filter @agilix/api test -- src/drizzleRepository.test.ts
```

Expected: FAIL because `createTestDrizzleDb.ts` and `drizzleRepository.ts` do not exist.

- [ ] **Step 3: Add Drizzle test database**

Create `apps/agilix-api/src/test/createTestDrizzleDb.ts`:

```ts
import Database from 'better-sqlite3'
import { sql, type SQL } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../db/schema'
import { createTransactionDatabase } from '../db/transaction'

export function createTestDrizzleDb() {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  const runBatch = sqlite.transaction((statements: readonly { run(): unknown }[]) => statements.map((statement) => statement.run()))
  const transactionDb = Object.assign(db, {
    batch(queries: readonly unknown[]) {
      return runBatch(queries as readonly { run(): unknown }[])
    },
  })

  db.run(sql`create table projects (id text primary key, name text not null, glyph text not null, color text not null, active_iteration_code text not null)`)
  db.run(sql`create table members (id text primary key, name text not null, role text not null, capacity integer not null)`)
  db.run(sql`create table iterations (id text primary key, project_id text not null references projects(id) on delete cascade, code text not null, name text not null, day integer not null, total_days integer not null, goal text not null, velocity integer not null, unique(project_id, code))`)
  db.run(sql`create table issues (key text primary key, project_id text not null references projects(id) on delete cascade, iteration_id text not null references iterations(id) on delete cascade, type text not null, title text not null, status text not null, priority text not null, assignee_id text not null references members(id), story_points integer not null, blocker_reason text)`)
  db.run(sql`create table issue_events (id text primary key, issue_key text not null, type text not null, actor_id text, message text not null, created_at text not null)`)
  db.run(sql`create table documents (id text primary key, scope text not null, project_id text, title text not null, directory text not null, body text not null, updated_at_label text not null)`)
  db.run(sql`create table doc_issue_links (doc_id text not null references documents(id) on delete cascade, issue_key text not null references issues(key) on delete cascade, unique(doc_id, issue_key))`)
  db.run(sql`create table doc_comments (id text primary key, doc_id text not null references documents(id) on delete cascade, author_id text not null references members(id), body text not null, resolved integer not null, created_at_label text not null)`)
  db.run(sql`create table standups (id text primary key, project_id text not null references projects(id) on delete cascade, date_label text not null, time_label text not null)`)
  db.run(sql`create table standup_items (id text primary key, standup_id text not null references standups(id) on delete cascade, member_id text not null references members(id), yesterday_json text not null, today_json text not null, blockers_json text not null)`)
  db.run(sql`create table milestones (id text primary key, project_id text not null references projects(id) on delete cascade, iteration_id text not null references iterations(id) on delete cascade, title text not null, start_day integer not null, end_day integer not null, status text not null, owner_id text not null references members(id))`)
  db.run(sql`create table feishu_notifications (id text primary key, trigger text not null, target_group text not null, payload_json text not null, status text not null, created_at text not null)`)
  db.run(sql`create table feishu_queries (id text primary key, command text not null, response_title text not null, response_body_json text not null, created_at text not null)`)

  return Object.assign(createTransactionDatabase(transactionDb), {
    run(statement: SQL) {
      db.run(statement)
    },
    corrupt(statement: SQL) {
      sqlite.pragma('foreign_keys = OFF')
      try {
        db.run(statement)
      } finally {
        sqlite.pragma('foreign_keys = ON')
      }
    },
  })
}
```

- [ ] **Step 4: Add seed helper**

Create `apps/agilix-api/src/seed.ts`:

```ts
import { seedData } from '@agilix/app/domain/fixtures'
import type { AgiliXRepository } from './repository'

export async function seedAgiliX(repository: AgiliXRepository) {
  await repository.seed(seedData)
}
```

- [ ] **Step 5: Add Drizzle repository module**

Create `apps/agilix-api/src/drizzleRepository.ts`:

```ts
import { eq } from 'drizzle-orm'
import { createDocQueryCommand, formatFeishuCommand, parseFeishuCommand } from '@agilix/app/domain/feishu'
import type { Doc, DocComment, Issue, IssueStatus, Iteration, Member, Milestone, Project, SeedData, Standup } from '@agilix/app/domain/types'
import type { AgiliXRepository, CreateDocInput, DocFilters, FeishuNotificationRecord, FeishuQueryRecord, IssueFilters, SaveFeishuNotificationResult, SaveMilestoneResult } from './repository'
import * as schema from './db/schema'
import type { TransactionDatabase } from './db/transaction'
import { docScopeSchema, feishuNotificationSchema, issueStatusSchema, issueTypeSchema, memberIdSchema, milestoneStatusSchema, prioritySchema, projectIdSchema, stringArraySchema } from './schema'

function toProject(row: typeof schema.projects.$inferSelect): Project {
  return { ...row, id: projectIdSchema.parse(row.id) }
}

function toMember(row: typeof schema.members.$inferSelect): Member {
  return { ...row, id: memberIdSchema.parse(row.id) }
}

function toIteration(row: typeof schema.iterations.$inferSelect): Iteration {
  return { ...row, projectId: projectIdSchema.parse(row.projectId) }
}

function toIssue(row: typeof schema.issues.$inferSelect, linkedDocIds: string[]): Issue {
  return {
    ...row,
    projectId: projectIdSchema.parse(row.projectId),
    type: issueTypeSchema.parse(row.type),
    status: issueStatusSchema.parse(row.status),
    priority: prioritySchema.parse(row.priority),
    assigneeId: memberIdSchema.parse(row.assigneeId),
    blockerReason: row.blockerReason === null ? undefined : row.blockerReason,
    linkedDocIds,
  }
}

function toDocComment(row: typeof schema.docComments.$inferSelect): DocComment {
  return { ...row, authorId: memberIdSchema.parse(row.authorId) }
}

function toMilestone(row: typeof schema.milestones.$inferSelect): Milestone {
  return { ...row, projectId: projectIdSchema.parse(row.projectId), status: milestoneStatusSchema.parse(row.status), ownerId: memberIdSchema.parse(row.ownerId) }
}

function toFeishuNotification(row: typeof schema.feishuNotifications.$inferSelect): FeishuNotificationRecord {
  return feishuNotificationSchema.parse({
    id: row.id,
    trigger: row.trigger,
    targetGroup: row.targetGroup,
    payload: JSON.parse(row.payloadJson),
    status: row.status,
    createdAt: row.createdAt,
  })
}

function toFeishuQuery(row: typeof schema.feishuQueries.$inferSelect): FeishuQueryRecord {
  return {
    id: row.id,
    command: parseFeishuCommand(row.command),
    reply: { title: row.responseTitle, lines: stringArraySchema.parse(JSON.parse(row.responseBodyJson)) },
    createdAt: row.createdAt,
  }
}

function assertUnique(values: string[], label: string) {
  const seen = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Duplicate seed ${label}: ${value}`)
    seen.add(value)
  }
}

function assertReference(values: Set<string>, value: string, message: string) {
  if (!values.has(value)) throw new Error(message)
}

function assertStandupMembers(memberIds: Set<string>, standup: Standup) {
  for (const item of standup.items) {
    assertReference(memberIds, item.memberId, `Standup member not found: ${item.memberId}`)
  }
}

function assertSeedData(data: SeedData) {
  assertUnique(data.projects.map((project) => project.id), 'project id')
  assertUnique(data.members.map((member) => member.id), 'member id')
  assertUnique(data.iterations.map((iteration) => iteration.id), 'iteration id')
  assertUnique(data.iterations.map((iteration) => `${iteration.projectId}:${iteration.code}`), 'iteration project code')
  assertUnique(data.issues.map((issue) => issue.key), 'issue key')
  assertUnique(data.docs.map((doc) => doc.id), 'document id')
  assertUnique(data.docs.flatMap((doc) => doc.linkedIssueKeys.map((issueKey) => `${doc.id}:${issueKey}`)), 'document issue link')
  assertUnique(data.docs.flatMap((doc) => doc.comments.map((comment) => comment.id)), 'document comment id')
  assertUnique(data.standups.map((standup) => standup.id), 'standup id')
  assertUnique(data.milestones.map((milestone) => milestone.id), 'milestone id')

  const projectIds = new Set(data.projects.map((project) => project.id))
  const memberIds = new Set(data.members.map((member) => member.id))
  const iterationIds = new Set(data.iterations.map((iteration) => iteration.id))
  const issueKeys = new Set(data.issues.map((issue) => issue.key))
  const docIds = new Set(data.docs.map((doc) => doc.id))

  for (const iteration of data.iterations) {
    assertReference(projectIds, iteration.projectId, `Seed project not found: ${iteration.projectId}`)
  }
  for (const issue of data.issues) {
    assertReference(projectIds, issue.projectId, `Seed project not found: ${issue.projectId}`)
    assertReference(iterationIds, issue.iterationId, `Seed iteration not found: ${issue.iterationId}`)
    assertReference(memberIds, issue.assigneeId, `Seed member not found: ${issue.assigneeId}`)
    for (const docId of issue.linkedDocIds) {
      assertReference(docIds, docId, `Seed linked document not found: ${docId}`)
    }
  }
  for (const doc of data.docs) {
    if (doc.scope === 'project') assertReference(projectIds, doc.projectId, `Seed project not found: ${doc.projectId}`)
    for (const issueKey of doc.linkedIssueKeys) {
      assertReference(issueKeys, issueKey, `Seed linked issue not found: ${issueKey}`)
    }
    for (const comment of doc.comments) {
      if (comment.docId !== doc.id) throw new Error(`Seed comment document mismatch: ${comment.id}`)
      assertReference(docIds, comment.docId, `Seed comment document not found: ${comment.docId}`)
      assertReference(memberIds, comment.authorId, `Seed comment author not found: ${comment.authorId}`)
    }
  }
  for (const standup of data.standups) {
    assertReference(projectIds, standup.projectId, `Seed project not found: ${standup.projectId}`)
    assertStandupMembers(memberIds, standup)
  }
  for (const milestone of data.milestones) {
    assertReference(projectIds, milestone.projectId, `Seed project not found: ${milestone.projectId}`)
    assertReference(iterationIds, milestone.iterationId, `Seed iteration not found: ${milestone.iterationId}`)
    assertReference(memberIds, milestone.ownerId, `Seed milestone owner not found: ${milestone.ownerId}`)
  }
}

async function assertRepositoryEmpty(db: TransactionDatabase) {
  const [project] = await db.select({ id: schema.projects.id }).from(schema.projects).limit(1)
  const [member] = await db.select({ id: schema.members.id }).from(schema.members).limit(1)
  const [iteration] = await db.select({ id: schema.iterations.id }).from(schema.iterations).limit(1)
  const [issue] = await db.select({ key: schema.issues.key }).from(schema.issues).limit(1)
  const [issueEvent] = await db.select({ id: schema.issueEvents.id }).from(schema.issueEvents).limit(1)
  const [doc] = await db.select({ id: schema.documents.id }).from(schema.documents).limit(1)
  const [docIssueLink] = await db.select({ docId: schema.docIssueLinks.docId }).from(schema.docIssueLinks).limit(1)
  const [docComment] = await db.select({ id: schema.docComments.id }).from(schema.docComments).limit(1)
  const [standup] = await db.select({ id: schema.standups.id }).from(schema.standups).limit(1)
  const [standupItem] = await db.select({ id: schema.standupItems.id }).from(schema.standupItems).limit(1)
  const [milestone] = await db.select({ id: schema.milestones.id }).from(schema.milestones).limit(1)
  const [feishuNotification] = await db.select({ id: schema.feishuNotifications.id }).from(schema.feishuNotifications).limit(1)
  const [feishuQuery] = await db.select({ id: schema.feishuQueries.id }).from(schema.feishuQueries).limit(1)
  if (project || member || iteration || issue || issueEvent || doc || docIssueLink || docComment || standup || standupItem || milestone || feishuNotification || feishuQuery) throw new Error('Repository already seeded')
}

async function validateMilestoneReferences(db: TransactionDatabase, milestone: Milestone): Promise<SaveMilestoneResult> {
  const [existing] = await db.select({ id: schema.milestones.id }).from(schema.milestones).where(eq(schema.milestones.id, milestone.id))
  if (!existing) return 'milestone-not-found'
  const [project] = await db.select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.id, milestone.projectId))
  if (!project) return 'project-not-found'
  const [iteration] = await db.select({ projectId: schema.iterations.projectId }).from(schema.iterations).where(eq(schema.iterations.id, milestone.iterationId))
  if (!iteration || iteration.projectId !== milestone.projectId) return 'iteration-not-found'
  const [owner] = await db.select({ id: schema.members.id }).from(schema.members).where(eq(schema.members.id, milestone.ownerId))
  if (!owner) return 'owner-not-found'
  return 'saved'
}

async function validateFeishuNotificationReferences(db: TransactionDatabase, input: FeishuNotificationRecord): Promise<SaveFeishuNotificationResult> {
  switch (input.trigger) {
    case '站会摘要': {
      const [standup] = await db.select({ id: schema.standups.id }).from(schema.standups).where(eq(schema.standups.id, input.payload.standupId))
      return standup ? 'saved' : 'standup-not-found'
    }
    case '阻塞提醒': {
      const issueRows = await db.select({ key: schema.issues.key }).from(schema.issues)
      const issueKeys = new Set(issueRows.map((issue) => issue.key))
      return input.payload.issueKeys.every((issueKey) => issueKeys.has(issueKey)) ? 'saved' : 'issue-not-found'
    }
    case '文档评论': {
      const [doc] = await db.select({ id: schema.documents.id }).from(schema.documents).where(eq(schema.documents.id, input.payload.docId))
      if (!doc) return 'document-not-found'
      const [comment] = await db.select({ docId: schema.docComments.docId }).from(schema.docComments).where(eq(schema.docComments.id, input.payload.commentId))
      return comment?.docId === input.payload.docId ? 'saved' : 'comment-not-found'
    }
  }
}

export function createDrizzleRepository(db: TransactionDatabase): AgiliXRepository {
  return {
    async seed(data: SeedData) {
      assertSeedData(data)
      await assertRepositoryEmpty(db)
      await db.batch([
        db.insert(schema.projects).values(data.projects),
        db.insert(schema.members).values(data.members),
        db.insert(schema.iterations).values(data.iterations),
        db.insert(schema.issues).values(data.issues.map(({ linkedDocIds, ...issue }) => issue)),
        db.insert(schema.documents).values(data.docs.map(({ linkedIssueKeys, comments, ...doc }) => doc)),
        db.insert(schema.docIssueLinks).values(data.docs.flatMap((doc) => doc.linkedIssueKeys.map((issueKey) => ({ docId: doc.id, issueKey })))),
        db.insert(schema.docComments).values(data.docs.flatMap((doc) => doc.comments)),
        db.insert(schema.standups).values(data.standups.map(({ items, ...standup }) => standup)),
        db.insert(schema.standupItems).values(data.standups.flatMap((standup) => standup.items.map((item, index) => ({
          id: `${standup.id}-${item.memberId}-${index}`,
          standupId: standup.id,
          memberId: item.memberId,
          yesterdayJson: JSON.stringify(item.yesterday),
          todayJson: JSON.stringify(item.today),
          blockersJson: JSON.stringify(item.blockers),
        })))),
        db.insert(schema.milestones).values(data.milestones),
      ])
    },
    async listProjects() {
      return (await db.select().from(schema.projects)).map(toProject)
    },
    async listIssues(filters: IssueFilters) {
      const rows = await db.select().from(schema.issues)
      const links = await db.select().from(schema.docIssueLinks)
      const issues = rows.map((issue) => toIssue(issue, links.filter((link) => link.issueKey === issue.key).map((link) => link.docId)))
      return issues
        .filter((issue) => filters.projectId === 'all' || issue.projectId === filters.projectId)
        .filter((issue) => filters.status === 'all' || issue.status === filters.status)
        .filter((issue) => filters.assigneeId === 'all' || issue.assigneeId === filters.assigneeId)
        .filter((issue) => filters.keyword === '' || `${issue.key} ${issue.title}`.toLowerCase().includes(filters.keyword.toLowerCase()))
    },
    async moveIssue(issueKey: string, status: IssueStatus) {
      const [existing] = await db.select().from(schema.issues).where(eq(schema.issues.key, issueKey))
      if (!existing) return false
      await db.update(schema.issues).set({ status }).where(eq(schema.issues.key, issueKey))
      return true
    },
    async listDocs(filters: DocFilters) {
      const docs = await db.select().from(schema.documents)
      const comments = await db.select().from(schema.docComments)
      const links = await db.select().from(schema.docIssueLinks)
      const domainDocs = docs.map((doc): Doc => {
        const scope = docScopeSchema.parse(doc.scope)
        if (scope === 'global' && doc.projectId !== null) throw new Error(`Global document cannot have projectId: ${doc.id}`)
        return {
          ...doc,
          scope,
          projectId: scope === 'project' ? projectIdSchema.parse(doc.projectId) : undefined,
          linkedIssueKeys: links.filter((link) => link.docId === doc.id).map((link) => link.issueKey),
          comments: comments.filter((comment) => comment.docId === doc.id).map(toDocComment),
        }
      })
      return domainDocs
        .filter((doc) => filters.projectId === 'all' || doc.scope === 'global' || doc.projectId === filters.projectId)
        .filter((doc) => filters.query === '' || `${doc.title} ${doc.body}`.toLowerCase().includes(filters.query.toLowerCase()))
    },
    async getDoc(docId: string) {
      return (await this.listDocs({ projectId: 'all', query: '' })).find((doc) => doc.id === docId)
    },
    async createDoc(doc: CreateDocInput) {
      const [existing] = await db.select().from(schema.documents).where(eq(schema.documents.id, doc.id))
      if (existing) return 'duplicate-document'
      const { linkedIssueKeys, comments, ...record } = doc
      if (comments.length > 0) return 'document-comments-not-empty'
      if (new Set(linkedIssueKeys).size !== linkedIssueKeys.length) return 'duplicate-linked-issue'
      const issueRows = await db.select({ key: schema.issues.key }).from(schema.issues)
      const existingIssueKeys = new Set(issueRows.map((issue) => issue.key))
      if (!linkedIssueKeys.every((issueKey) => existingIssueKeys.has(issueKey))) return 'linked-issue-not-found'
      await db.insert(schema.documents).values(record)
      if (linkedIssueKeys.length > 0) {
        await db.insert(schema.docIssueLinks).values(linkedIssueKeys.map((issueKey) => ({ docId: doc.id, issueKey })))
      }
      return 'created'
    },
    async addDocComment(docId: string, comment: DocComment) {
      if (comment.docId !== docId) return 'comment-doc-id-mismatch'
      const [existing] = await db.select().from(schema.documents).where(eq(schema.documents.id, docId))
      if (!existing) return 'document-not-found'
      await db.insert(schema.docComments).values(comment)
      return 'created'
    },
    async listStandups(filters) {
      const standups = await db.select().from(schema.standups)
      const items = await db.select().from(schema.standupItems)
      const domainStandups = standups.map((standup): Standup => ({
        ...standup,
        projectId: projectIdSchema.parse(standup.projectId),
        items: items.filter((item) => item.standupId === standup.id).map((item) => ({
          memberId: memberIdSchema.parse(item.memberId),
          yesterday: stringArraySchema.parse(JSON.parse(item.yesterdayJson)),
          today: stringArraySchema.parse(JSON.parse(item.todayJson)),
          blockers: stringArraySchema.parse(JSON.parse(item.blockersJson)),
        })),
      }))
      return domainStandups.filter((standup) => filters.projectId === 'all' || standup.projectId === filters.projectId)
    },
    async saveStandup(standup: Standup) {
      const [existing] = await db.select().from(schema.standups).where(eq(schema.standups.id, standup.id))
      if (!existing) return false
      const memberRows = await db.select({ id: schema.members.id }).from(schema.members)
      assertStandupMembers(new Set(memberRows.map((member) => member.id)), standup)
      await db.batch([
        db.update(schema.standups).set({ projectId: standup.projectId, dateLabel: standup.dateLabel, timeLabel: standup.timeLabel }).where(eq(schema.standups.id, standup.id)),
        db.delete(schema.standupItems).where(eq(schema.standupItems.standupId, standup.id)),
        ...(standup.items.length > 0 ? [
          db.insert(schema.standupItems).values(standup.items.map((item, index) => ({
            id: `${standup.id}-${item.memberId}-${index}`,
            standupId: standup.id,
            memberId: item.memberId,
            yesterdayJson: JSON.stringify(item.yesterday),
            todayJson: JSON.stringify(item.today),
            blockersJson: JSON.stringify(item.blockers),
          }))),
        ] : []),
      ])
      return true
    },
    async listMilestones(filters) {
      const rows = await db.select().from(schema.milestones)
      const milestones = rows.map(toMilestone)
      return milestones.filter((milestone) => filters.projectId === 'all' || milestone.projectId === filters.projectId)
    },
    async saveMilestone(milestone: Milestone) {
      const result = await validateMilestoneReferences(db, milestone)
      if (result !== 'saved') return result
      await db.update(schema.milestones).set(milestone).where(eq(schema.milestones.id, milestone.id))
      return 'saved'
    },
    async saveFeishuNotification(input) {
      const result = await validateFeishuNotificationReferences(db, input)
      if (result !== 'saved') return result
      const { payload, ...record } = input
      await db.insert(schema.feishuNotifications).values({ ...record, payloadJson: JSON.stringify(payload) })
      return 'saved'
    },
    async listFeishuNotifications() {
      return (await db.select().from(schema.feishuNotifications)).map(toFeishuNotification)
    },
    async saveFeishuQuery(input) {
      await db.insert(schema.feishuQueries).values({
        id: input.id,
        command: formatFeishuCommand(input.command),
        responseTitle: input.reply.title,
        responseBodyJson: JSON.stringify(input.reply.lines),
        createdAt: input.createdAt,
      })
    },
    async listFeishuQueries() {
      return (await db.select().from(schema.feishuQueries)).map(toFeishuQuery)
    },
    async loadData() {
      return {
        navItems: ['团队工作台', '项目总览', 'Issues', '看板', '迭代统计', '文档', '成员负载', '每日站会', '排期甘特', '飞书'],
        projects: await this.listProjects(),
        members: (await db.select().from(schema.members)).map(toMember),
        iterations: (await db.select().from(schema.iterations)).map(toIteration),
        issues: await this.listIssues({ projectId: 'all', status: 'all', assigneeId: 'all', keyword: '' }),
        docs: await this.listDocs({ projectId: 'all', query: '' }),
        standups: await this.listStandups({ projectId: 'all' }),
        milestones: await this.listMilestones({ projectId: 'all' }),
        feishu: { groups: ['AgiliX 团队群'], queryCommands: [{ type: 'team' }, { type: 'blockers' }, createDocQueryCommand('结果卡片')], notificationTriggers: ['站会摘要', '阻塞提醒', '文档评论'] },
      }
    },
  }
}
```

- [ ] **Step 6: Run GREEN**

Run:

```bash
pnpm --filter @agilix/api test -- src/drizzleRepository.test.ts
```

Expected: PASS for the Drizzle-backed repository conformance test.

- [ ] **Step 7: Run package tests and build**

Run:

```bash
pnpm --filter @agilix/api test
pnpm --filter @agilix/api build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/agilix-api/src/test/repositoryConformance.ts apps/agilix-api/src/test/createTestDrizzleDb.ts apps/agilix-api/src/drizzleRepository.ts apps/agilix-api/src/drizzleRepository.test.ts apps/agilix-api/src/seed.ts
git commit -m "feat: add AgiliX Drizzle repository"
```

## Self-Review

- Spec coverage: Phase 2 covers API package setup, Drizzle schema, repository contract, memory test repository, Hono routes, seed helper, and Drizzle repository module.
- Scope check: React route UI remains outside this phase.
- TDD check: Each task starts with a failing or baseline-proving test before production code.
- Persistence check: Tables are relational and cover every full product data area.
- Complexity check: Permissions, approval flow, multiple Feishu groups, and Feishu-side editing remain excluded.
- Placeholder scan: No unresolved placeholder markers or unfilled sections remain.
