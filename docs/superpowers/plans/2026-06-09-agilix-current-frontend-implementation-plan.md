# AgiliX Current Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the current AgiliX frontend data model, real API, persistence, and five secondary operation pages exactly as specified in `docs/superpowers/specs/2026-06-09-agilix-current-frontend-data-model-design.md`.

**Architecture:** The current frontend remains the product contract. Backend schema, repositories, API routes, and frontend data adapters can be replaced, but existing main-page user-visible flow, style, and business behavior must not change. A new shared TypeScript contract package owns all API/domain types and runtime schemas; API and frontend import from that package instead of duplicating protocol shapes.

**Tech Stack:** TypeScript, React 19, Vite, Vitest, Testing Library, Playwright, Hono, Drizzle ORM, SQLite/D1-compatible schema, Zod, pnpm workspaces.

**Execution Constraint:** Work only on `main`. Do not create git worktrees. Do not create feature branches.

---

## Non-Negotiable Boundaries

- Do not change existing main-page layout, visible styles, filter semantics, information hierarchy, or business flow.
- Do not edit existing visual rules in `apps/agilix/src/styles/agilix.css`.
- Only add scoped CSS for the five new secondary operation pages.
- Do not introduce permissions, approvals, owners, responsible persons, or teams.
- Do not add database foreign keys.
- Do not add API mocks to Playwright tests.
- Do not let the frontend generate primary IDs.
- Do not implement document versioning.
- Do not keep frontend/backend duplicate request or response types.

---

## File Structure

- Create: `packages/agilix-contract/package.json`
  - Workspace package manifest for the shared contract.
- Create: `packages/agilix-contract/tsconfig.json`
  - TypeScript build configuration for the contract package.
- Create: `packages/agilix-contract/src/index.ts`
  - Public export surface.
- Create: `packages/agilix-contract/src/schemas.ts`
  - Zod runtime schemas for domain models, API requests, and API responses.
- Create: `packages/agilix-contract/src/types.ts`
  - Types inferred from schemas.
- Create: `packages/agilix-contract/src/contract.test.ts`
  - Schema/type conformance tests.
- Modify: `package.json`
  - Include contract package in scripts through workspace discovery.
- Modify: `apps/agilix/package.json`
  - Depend on `@agilix/contract`.
- Modify: `apps/agilix-api/package.json`
  - Depend on `@agilix/contract`.
- Modify: `apps/agilix-api/src/db/schema.test.ts`
  - Assert all required tables/columns exist and no foreign keys are declared.
- Modify: `apps/agilix-api/src/db/schema.ts`
  - Replace schema with current frontend data model tables.
- Create: `apps/agilix-api/src/snowflake.test.ts`
  - Prove backend-generated IDs are monotonic numeric strings.
- Create: `apps/agilix-api/src/snowflake.ts`
  - Snowflake ID generator.
- Modify: `apps/agilix-api/src/repository.ts`
  - Repository interface matching the shared contract.
- Modify: `apps/agilix-api/src/test/repositoryConformance.ts`
  - Shared conformance tests for memory and Drizzle repositories.
- Modify: `apps/agilix-api/src/test/memoryRepository.ts`
  - In-memory repository implementation using the new interface.
- Modify: `apps/agilix-api/src/drizzleRepository.ts`
  - SQLite/D1 repository implementation with transaction-level relation validation.
- Modify: `apps/agilix-api/src/drizzleRepository.test.ts`
  - Run repository conformance against Drizzle.
- Modify: `apps/agilix-api/src/seed.ts`
  - Seed all new tables from current frontend fixtures.
- Modify: `apps/agilix-api/src/app.test.ts`
  - API contract tests.
- Modify: `apps/agilix-api/src/app.ts`
  - Hono routes using contract schemas.
- Modify: `apps/agilix-api/src/localDevServer.test.ts`
  - Local real API reset and app-state tests.
- Modify: `apps/agilix-api/src/localDevServer.ts`
  - Local server wiring for real frontend development.
- Modify: `apps/agilix/src/domain/types.ts`
  - Re-export display/domain types from `@agilix/contract`.
- Modify: `apps/agilix/src/api/client.test.ts`
  - Prove the frontend client imports contract schemas and rejects malformed responses.
- Modify: `apps/agilix/src/api/client.ts`
  - Real API client using contract schemas.
- Modify: `apps/agilix/src/App.persistence.test.tsx`
  - Prove current main pages load from real API-shaped app state.
- Modify: `apps/agilix/src/App.tsx`
  - Data loading and mutation orchestration only.
- Create: `apps/agilix/src/routes/SecondaryNewProjectPage.test.tsx`
- Create: `apps/agilix/src/routes/SecondaryNewProjectPage.tsx`
- Create: `apps/agilix/src/routes/SecondaryNewIssuePage.test.tsx`
- Create: `apps/agilix/src/routes/SecondaryNewIssuePage.tsx`
- Create: `apps/agilix/src/routes/SecondaryNewDocPage.test.tsx`
- Create: `apps/agilix/src/routes/SecondaryNewDocPage.tsx`
- Create: `apps/agilix/src/routes/SecondaryAssignPage.test.tsx`
- Create: `apps/agilix/src/routes/SecondaryAssignPage.tsx`
- Create: `apps/agilix/src/routes/SecondaryBotPage.test.tsx`
- Create: `apps/agilix/src/routes/SecondaryBotPage.tsx`
- Create: `apps/agilix/src/styles/secondary-pages.css`
  - Scoped styles for the five new secondary pages only.
- Modify: `apps/agilix/src/routes/ProjectsPage.tsx`
  - Bind existing new-project action to the new secondary route only.
- Modify: `apps/agilix/src/routes/IssuesPage.tsx`
  - Bind existing new-issue action to the new secondary route only.
- Modify: `apps/agilix/src/routes/DocsPage.tsx`
  - Bind existing new-doc action to the new secondary route only.
- Modify: `apps/agilix/src/routes/WorkloadPage.tsx`
  - Bind existing assign action to the new secondary route only.
- Modify: `apps/agilix/src/routes/FeishuPage.tsx`
  - Bind existing bot console action to the new secondary route only.
- Modify: `apps/agilix/src/routes/prototype-parity.test.tsx`
  - Prove existing main pages keep current identity and content.
- Create: `apps/agilix/e2e/secondary-pages-real-api.spec.ts`
  - Real API e2e for the five secondary operation pages.
- Modify: `apps/agilix/e2e/prototype-visual.audit.ts`
  - Add five secondary-page pixel-diff checks against `飞书敏捷项目管理 · 编辑台账(单文件) (1).html`.
- Create: `apps/agilix/e2e/no-api-mocks.spec.ts`
  - Static e2e guard proving no Playwright route interception exists in e2e specs.
- Modify: `apps/agilix/package.json`
  - Add `pixelmatch` and `pngjs` dev dependencies for the visual audit.
- Modify: `apps/agilix/playwright.config.ts`
  - Ensure e2e starts real frontend and real local API, with no API mocks.

---

## Task 1: Shared TypeScript Contract Package

**Files:**
- Create: `packages/agilix-contract/package.json`
- Create: `packages/agilix-contract/tsconfig.json`
- Create: `packages/agilix-contract/src/index.ts`
- Create: `packages/agilix-contract/src/schemas.ts`
- Create: `packages/agilix-contract/src/types.ts`
- Create: `packages/agilix-contract/src/contract.test.ts`
- Modify: `apps/agilix/package.json`
- Modify: `apps/agilix-api/package.json`

- [ ] **Step 1: Write the failing contract test**

Create `packages/agilix-contract/src/contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  appStateResponseSchema,
  createDocumentCommentRequestSchema,
  createDocumentDirectoryRequestSchema,
  createDocumentRequestSchema,
  createIssueRequestSchema,
  createProjectRequestSchema,
  recordFeishuNotificationRequestSchema,
  saveBotConfigRequestSchema,
  updateDocumentDirectoryRequestSchema,
} from './schemas'

describe('AgiliX shared contract', () => {
  it('rejects client-generated ids in create requests', () => {
    const project = {
      code: 'OPS',
      name: '运营平台',
      glyph: '运',
      color: '#6f7f5b',
      cadence: '双周',
      template_key: 'scrum-board-burndown',
      member_ids: ['730000000000000201'],
    }
    const issue = {
      project_id: '730000000000000001',
      iteration_id: '730000000000000101',
      type: 'requirement',
      title: '检索日志接入留存分析',
      description: '接入搜索日志',
      acceptance_criteria: '可按日期查看留存',
      priority: 'medium',
      story_points: 5,
      handler_member_id: '730000000000000201',
      epic_name: '搜索平台',
      labels: ['Data'],
      collaborator_member_ids: ['730000000000000202'],
      draft: false,
    }
    const document = {
      scope: 'project',
      project_id: '730000000000000001',
      directory_id: '730000000000000301',
      title: '接口说明',
      content_type: 'markdown',
      body: '# 接口说明',
      editor_member_id: '730000000000000201',
      linked_issue_ids: ['730000000000000401'],
      sync_feishu_doc: true,
    }

    expect(createProjectRequestSchema.safeParse({ ...project }).success).toBe(true)
    expect(createIssueRequestSchema.safeParse({ ...issue }).success).toBe(true)
    expect(createDocumentRequestSchema.safeParse({ ...document }).success).toBe(true)
    expect(createProjectRequestSchema.safeParse({ id: 'client-id', ...project }).success).toBe(false)
    expect(createIssueRequestSchema.safeParse({ id: 'client-id', key: 'OPS-1', ...issue }).success).toBe(false)
    expect(createDocumentRequestSchema.safeParse({ id: 'client-id', ...document }).success).toBe(false)
  })

  it('requires target_group_id for every bot rule', () => {
    const result = saveBotConfigRequestSchema.safeParse({
      project_id: '730000000000000001',
      groups: [
        {
          id: '730000000000000101',
          name: 'AgiliX 团队群',
          purpose: '项目通知',
          member_count_label: '8 人',
          status: '已连接',
          sort_order: 1,
        },
      ],
      rules: [
        {
          title: '风险告警',
          description: '阻塞时通知',
          rule_type: 'risk_alert',
          schedule_label: '实时',
          enabled: true,
          sort_order: 1,
        },
      ],
    })

    expect(result.success).toBe(false)
  })

  it('parses app state with project-scoped iterations and document directories', () => {
    const result = appStateResponseSchema.safeParse({
      projects: [],
      project_members: [],
      iterations: [],
      iteration_calendar_weeks: [],
      iteration_calendar_days: [],
      members: [],
      issues: [],
      issue_events: [],
      issue_labels: [],
      issue_collaborators: [],
      documents: [],
      document_directories: [],
      document_issue_links: [],
      document_comments: [],
      standups: [],
      standup_items: [],
      milestones: [],
      feishu_member_profiles: [],
      feishu_groups: [],
      feishu_bot_rules: [],
      feishu_notifications: [],
      feishu_queries: [],
    })

    expect(result.success).toBe(true)
  })

  it('rejects client-generated ids in every other create request', () => {
    expect(createDocumentDirectoryRequestSchema.safeParse({
      scope: 'project',
      project_id: '730000000000000001',
      parent_id: null,
      name: '接口',
    }).success).toBe(true)
    expect(createDocumentDirectoryRequestSchema.safeParse({
      id: 'client-id',
      scope: 'project',
      project_id: '730000000000000001',
      parent_id: null,
      name: '接口',
    }).success).toBe(false)
    expect(createDocumentCommentRequestSchema.safeParse({
      author_member_id: '730000000000000201',
      body: '需要补验收标准',
    }).success).toBe(true)
    expect(createDocumentCommentRequestSchema.safeParse({
      id: 'client-id',
      author_member_id: '730000000000000201',
      body: '需要补验收标准',
    }).success).toBe(false)
    expect(recordFeishuNotificationRequestSchema.safeParse({
      trigger: 'issue_created',
      target_group_id: '730000000000000501',
      payload_json: { issue_id: '730000000000000401' },
    }).success).toBe(true)
    expect(recordFeishuNotificationRequestSchema.safeParse({
      id: 'client-id',
      trigger: 'issue_created',
      target_group_id: '730000000000000501',
      payload_json: { issue_id: '730000000000000401' },
    }).success).toBe(false)
  })

  it('keeps directory update separate from directory creation', () => {
    expect(updateDocumentDirectoryRequestSchema.safeParse({ name: '接口规范' }).success).toBe(true)
    expect(updateDocumentDirectoryRequestSchema.safeParse({ parent_id: '730000000000000302' }).success).toBe(true)
    expect(updateDocumentDirectoryRequestSchema.safeParse({ id: 'client-id', name: '接口规范' }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run the failing contract test**

Run:

```bash
pnpm --filter @agilix/contract test -- src/contract.test.ts
```

Expected: FAIL because `@agilix/contract` does not exist yet.

- [ ] **Step 3: Create the contract package manifest**

Create `packages/agilix-contract/package.json`:

```json
{
  "name": "@agilix/contract",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 4: Create the contract TypeScript config**

Create `packages/agilix-contract/tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "target": "ES2022",
    "strict": true,
    "skipLibCheck": true,
    "types": ["vitest/globals"]
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Implement schemas and exported types**

Create `packages/agilix-contract/src/schemas.ts` with the schemas named in Step 1 plus domain row schemas for every table listed in the spec. Use `z.object(...).strict()` for request schemas so unknown `id` fields are rejected. Use these exact enum values:

```ts
export const issueTypeValues = ['requirement', 'bug', 'task', 'tech_debt'] as const
export const issueStatusValues = ['todo', 'doing', 'blocked', 'done'] as const
export const issuePriorityValues = ['high', 'medium', 'low'] as const
export const docScopeValues = ['global', 'project'] as const
export const docContentTypeValues = ['markdown', 'mermaid', 'diagram', 'mindmap'] as const
export const botRuleTypeValues = ['scheduled_summary', 'iteration_weekly', 'risk_alert'] as const
```

The schema file must export row schemas for every table by these exact names: `projectRowSchema`, `projectMemberRowSchema`, `iterationRowSchema`, `iterationCalendarWeekRowSchema`, `iterationCalendarDayRowSchema`, `memberRowSchema`, `issueRowSchema`, `issueEventRowSchema`, `issueLabelRowSchema`, `issueCollaboratorRowSchema`, `documentRowSchema`, `documentDirectoryRowSchema`, `documentIssueLinkRowSchema`, `documentCommentRowSchema`, `standupRowSchema`, `standupItemRowSchema`, `milestoneRowSchema`, `feishuMemberProfileRowSchema`, `feishuNotificationRowSchema`, `feishuQueryRowSchema`, `feishuGroupRowSchema`, and `feishuBotRuleRowSchema`.

The schema file must also export request/response schemas by these exact names: `appStateResponseSchema`, `createProjectRequestSchema`, `createIssueRequestSchema`, `updateIssueStatusRequestSchema`, `saveAssignmentRequestSchema`, `createDocumentRequestSchema`, `createDocumentCommentRequestSchema`, `createDocumentDirectoryRequestSchema`, `updateDocumentDirectoryRequestSchema`, `saveStandupRequestSchema`, `saveMilestoneRequestSchema`, `botConfigResponseSchema`, `saveBotConfigRequestSchema`, `sendFeishuTestMessageRequestSchema`, `feishuTestMessageResponseSchema`, `feishuQueryRequestSchema`, `feishuQueryResponseSchema`, and `recordFeishuNotificationRequestSchema`.

Each row schema must include exactly the fields listed for its table in `docs/superpowers/specs/2026-06-09-agilix-current-frontend-data-model-design.md`; each create request schema must be `.strict()` and must not include primary `id` fields.

Create `packages/agilix-contract/src/types.ts`:

```ts
import type { z } from 'zod'
import type {
  appStateResponseSchema,
  botConfigResponseSchema,
  createDocumentCommentRequestSchema,
  createDocumentDirectoryRequestSchema,
  createDocumentRequestSchema,
  createIssueRequestSchema,
  createProjectRequestSchema,
  feishuQueryRequestSchema,
  feishuQueryResponseSchema,
  feishuTestMessageResponseSchema,
  issueStatusValues,
  recordFeishuNotificationRequestSchema,
  saveAssignmentRequestSchema,
  saveBotConfigRequestSchema,
  saveMilestoneRequestSchema,
  saveStandupRequestSchema,
  sendFeishuTestMessageRequestSchema,
  updateDocumentDirectoryRequestSchema,
} from './schemas'

export type AppStateResponse = z.infer<typeof appStateResponseSchema>
export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>
export type CreateIssueRequest = z.infer<typeof createIssueRequestSchema>
export type CreateDocumentRequest = z.infer<typeof createDocumentRequestSchema>
export type CreateDocumentCommentRequest = z.infer<typeof createDocumentCommentRequestSchema>
export type CreateDocumentDirectoryRequest = z.infer<typeof createDocumentDirectoryRequestSchema>
export type UpdateDocumentDirectoryRequest = z.infer<typeof updateDocumentDirectoryRequestSchema>
export type SaveAssignmentRequest = z.infer<typeof saveAssignmentRequestSchema>
export type SaveStandupRequest = z.infer<typeof saveStandupRequestSchema>
export type SaveMilestoneRequest = z.infer<typeof saveMilestoneRequestSchema>
export type BotConfigResponse = z.infer<typeof botConfigResponseSchema>
export type SaveBotConfigRequest = z.infer<typeof saveBotConfigRequestSchema>
export type SendFeishuTestMessageRequest = z.infer<typeof sendFeishuTestMessageRequestSchema>
export type FeishuTestMessageResponse = z.infer<typeof feishuTestMessageResponseSchema>
export type FeishuQueryRequest = z.infer<typeof feishuQueryRequestSchema>
export type FeishuQueryResponse = z.infer<typeof feishuQueryResponseSchema>
export type RecordFeishuNotificationRequest = z.infer<typeof recordFeishuNotificationRequestSchema>
export type IssueStatus = (typeof issueStatusValues)[number]
```

Create `packages/agilix-contract/src/index.ts`:

```ts
export * from './schemas'
export * from './types'
```

- [ ] **Step 6: Wire app and API package dependencies**

Add this dependency to `apps/agilix/package.json` and `apps/agilix-api/package.json`:

```json
"@agilix/contract": "workspace:*"
```

- [ ] **Step 7: Update workspace lockfile**

Run:

```bash
pnpm install
```

Expected: PASS and `pnpm-lock.yaml` includes `@agilix/contract`.

- [ ] **Step 8: Run contract tests**

Run:

```bash
pnpm --filter @agilix/contract test
```

Expected: PASS.

- [ ] **Step 9: Commit**

Run:

```bash
git add packages/agilix-contract apps/agilix/package.json apps/agilix-api/package.json pnpm-lock.yaml
git commit -m "feat: add shared agilix contract"
```

---

## Task 2: Database Schema Without Foreign Keys

**Files:**
- Modify: `apps/agilix-api/src/db/schema.test.ts`
- Modify: `apps/agilix-api/src/db/schema.ts`
- Create: `apps/agilix-api/src/snowflake.test.ts`
- Create: `apps/agilix-api/src/snowflake.ts`

- [ ] **Step 1: Write schema tests for required tables and no foreign keys**

Replace the table list test in `apps/agilix-api/src/db/schema.test.ts` with:

```ts
import { getTableColumns, getTableName } from 'drizzle-orm'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { createDbClient } from './client'
import * as schema from './schema'
import type { TransactionDatabase } from './transaction'

const requiredTables = {
  projects: ['id', 'code', 'name', 'glyph', 'color', 'activeIterationId', 'cadence', 'templateKey'],
  projectMembers: ['projectId', 'memberId', 'sortOrder'],
  iterations: ['id', 'projectId', 'code', 'name', 'dateRangeLabel', 'calendarTitle', 'day', 'totalDays', 'goal', 'velocity'],
  iterationCalendarWeeks: ['id', 'iterationId', 'sortOrder', 'label', 'rangeLabel'],
  iterationCalendarDays: ['id', 'weekId', 'sortOrder', 'label'],
  members: ['id', 'name', 'role', 'capacity', 'onlineSortOrder'],
  issues: ['id', 'key', 'projectId', 'iterationId', 'type', 'title', 'status', 'priority', 'handlerMemberId', 'storyPoints', 'blockerReason', 'description', 'acceptanceCriteria', 'epicName', 'draft'],
  issueEvents: ['id', 'issueId', 'eventType', 'actorMemberId', 'message', 'createdAt'],
  issueLabels: ['issueId', 'label', 'sortOrder'],
  issueCollaborators: ['issueId', 'memberId', 'sortOrder'],
  documents: ['id', 'scope', 'projectId', 'directoryId', 'title', 'contentType', 'body', 'editorMemberId', 'syncFeishuDoc', 'createdAt', 'updatedAt'],
  documentDirectories: ['id', 'scope', 'projectId', 'parentId', 'name', 'sortOrder', 'createdAt', 'updatedAt'],
  documentIssueLinks: ['docId', 'issueId'],
  documentComments: ['id', 'docId', 'authorMemberId', 'body', 'resolved', 'createdAt'],
  standups: ['id', 'projectId', 'date', 'dateLabel', 'weekdayLabel', 'timeLabel', 'calendarLabel'],
  standupItems: ['id', 'standupId', 'memberId', 'sortOrder', 'yesterdayText', 'todayText', 'blockersText'],
  milestones: ['id', 'projectId', 'iterationId', 'title', 'startDay', 'endDay', 'status', 'participantMemberId'],
  feishuMemberProfiles: ['memberId', 'openId', 'unionId', 'avatarUrl', 'displayName', 'lastSeenAt'],
  feishuNotifications: ['id', 'trigger', 'targetGroupId', 'payloadJson', 'status', 'createdAt'],
  feishuQueries: ['id', 'command', 'responseTitle', 'responseBodyJson', 'createdAt'],
  feishuGroups: ['id', 'projectId', 'name', 'purpose', 'memberCountLabel', 'status', 'sortOrder'],
  feishuBotRules: ['id', 'projectId', 'ruleType', 'title', 'description', 'scheduleLabel', 'targetGroupId', 'enabled', 'sortOrder'],
} as const

describe('AgiliX relational schema', () => {
  it('defines every table and field required by the current frontend contract', () => {
    expect(Object.keys(schema).sort()).toEqual([...Object.keys(requiredTables)].sort())

    for (const [exportName, expectedColumns] of Object.entries(requiredTables)) {
      const table = schema[exportName as keyof typeof schema]
      expect(getTableName(table)).toBe(snakeCase(exportName))
      expect(Object.keys(getTableColumns(table)).sort()).toEqual([...expectedColumns].sort())
    }
  })

  it('does not declare database foreign keys', () => {
    const source = readFileSync(join(process.cwd(), 'src/db/schema.ts'), 'utf8')

    expect(source).not.toContain('.references(')
    expect(source).not.toContain(' references ')
    expect(source).not.toContain('REFERENCES')
  })

  it('exposes an explicit transaction-capable database port', () => {
    type Client = ReturnType<typeof createDbClient>

    expectTypeOf<Client>().toEqualTypeOf<TransactionDatabase>()
  })
})

function snakeCase(value: string) {
  return value.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)
}
```

- [ ] **Step 2: Write Snowflake ID test**

Create `apps/agilix-api/src/snowflake.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createSnowflakeIdGenerator } from './snowflake'

describe('snowflake id generator', () => {
  it('generates monotonic numeric string ids on the backend', () => {
    const nextId = createSnowflakeIdGenerator({ epochMs: 1700000000000, workerId: 1 })

    const first = nextId()
    const second = nextId()

    expect(first).toMatch(/^\d+$/)
    expect(second).toMatch(/^\d+$/)
    expect(BigInt(second)).toBeGreaterThan(BigInt(first))
  })
})
```

- [ ] **Step 3: Run failing schema and ID tests**

Run:

```bash
pnpm --filter @agilix/api test -- src/db/schema.test.ts src/snowflake.test.ts
```

Expected: FAIL because schema fields and Snowflake generator are not implemented.

- [ ] **Step 4: Implement schema tables**

Modify `apps/agilix-api/src/db/schema.ts` to define every table from the spec. Use plain text columns for relation IDs and do not call `.references(...)`. Use composite primary keys for `project_members`, `issue_labels`, `issue_collaborators`, and `document_issue_links`.

- [ ] **Step 5: Implement Snowflake generator**

Create `apps/agilix-api/src/snowflake.ts`:

```ts
export type SnowflakeOptions = {
  epochMs: number
  workerId: number
}

export function createSnowflakeIdGenerator(options: SnowflakeOptions) {
  let lastTimestamp = 0
  let sequence = 0
  const worker = BigInt(options.workerId & 0x3ff)
  const epoch = BigInt(options.epochMs)

  return () => {
    const now = Date.now()
    if (now === lastTimestamp) {
      sequence = (sequence + 1) & 0xfff
    } else {
      sequence = 0
      lastTimestamp = now
    }

    const id = ((BigInt(now) - epoch) << 22n) | (worker << 12n) | BigInt(sequence)
    return id.toString()
  }
}
```

- [ ] **Step 6: Run schema and ID tests**

Run:

```bash
pnpm --filter @agilix/api test -- src/db/schema.test.ts src/snowflake.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add apps/agilix-api/src/db/schema.test.ts apps/agilix-api/src/db/schema.ts apps/agilix-api/src/snowflake.test.ts apps/agilix-api/src/snowflake.ts
git commit -m "feat: redesign persistence schema"
```

---

## Task 3: Repository Transactions And Relationship Validation

**Files:**
- Modify: `apps/agilix-api/src/repository.ts`
- Modify: `apps/agilix-api/src/test/repositoryConformance.ts`
- Modify: `apps/agilix-api/src/test/memoryRepository.ts`
- Modify: `apps/agilix-api/src/drizzleRepository.ts`
- Modify: `apps/agilix-api/src/drizzleRepository.test.ts`
- Modify: `apps/agilix-api/src/seed.ts`

- [ ] **Step 1: Write repository conformance tests first**

Add tests in `apps/agilix-api/src/test/repositoryConformance.ts` for these behaviors:

```ts
it('creates a project with backend ids, first iteration, default directories, and members in one transaction', async () => {
  const repository = await createRepository()

  const state = await repository.createProject({
    code: 'OPS',
    name: '运营平台',
    glyph: '运',
    color: '#6f7f5b',
    cadence: '双周',
    template_key: 'scrum-board-burndown',
    member_ids: ['730000000000000201', '730000000000000202'],
  })

  const project = state.projects.find((item) => item.code === 'OPS')
  expect(project?.id).toMatch(/^\d+$/)
  expect(project?.active_iteration_id).toMatch(/^\d+$/)
  expect(state.iterations.some((iteration) => iteration.project_id === project?.id)).toBe(true)
  expect(state.project_members.filter((member) => member.project_id === project?.id)).toHaveLength(2)
  expect(state.document_directories.some((directory) => directory.project_id === project?.id)).toBe(true)
})

it('rejects an issue when iteration does not belong to the project', async () => {
  const repository = await createRepository()
  const state = await repository.loadAppState()
  const project = state.projects[0]
  const otherIteration = state.iterations.find((iteration) => iteration.project_id !== project.id)

  await expect(
    repository.createIssue({
      project_id: project.id,
      iteration_id: otherIteration?.id ?? '730000000000009999',
      type: 'bug',
      title: '错误项目迭代',
      description: '不允许跨项目迭代',
      acceptance_criteria: '写入被拒绝',
      priority: 'high',
      story_points: 3,
      handler_member_id: state.members[0].id,
      epic_name: '校验',
      labels: ['关系校验'],
      collaborator_member_ids: [],
      draft: false,
    }),
  ).rejects.toThrow(/iteration/i)
})

it('creates issue labels, collaborators, event, and notification in one transaction', async () => {
  const repository = await createRepository()
  const state = await repository.loadAppState()
  const project = state.projects[0]
  const iteration = state.iterations.find((item) => item.project_id === project.id)
  const [handler, collaborator] = state.members

  const next = await repository.createIssue({
    project_id: project.id,
    iteration_id: iteration?.id ?? '',
    type: 'requirement',
    title: '检索日志接入留存分析',
    description: '接入搜索日志',
    acceptance_criteria: '可以按日期查看留存',
    priority: 'medium',
    story_points: 5,
    handler_member_id: handler.id,
    epic_name: '搜索平台',
    labels: ['Data'],
    collaborator_member_ids: [collaborator.id],
    draft: false,
  })

  const issue = next.issues.find((item) => item.title === '检索日志接入留存分析')
  expect(issue?.id).toMatch(/^\d+$/)
  expect(next.issue_labels.some((label) => label.issue_id === issue?.id && label.label === 'Data')).toBe(true)
  expect(next.issue_collaborators.some((item) => item.issue_id === issue?.id && item.member_id === collaborator.id)).toBe(true)
  expect(next.issue_events.some((event) => event.issue_id === issue?.id && event.actor_member_id === handler.id)).toBe(true)
  expect(next.feishu_notifications.some((notice) => notice.trigger === 'issue_created')).toBe(true)
})

it('replaces assignment collaborators and rejects handler duplication', async () => {
  const repository = await createRepository()
  const state = await repository.loadAppState()
  const issue = state.issues[0]
  const [handler, collaborator] = state.members

  await expect(
    repository.saveIssueAssignment(issue.id, {
      handler_member_id: handler.id,
      collaborator_member_ids: [handler.id],
    }),
  ).rejects.toThrow(/collaborator/i)

  const next = await repository.saveIssueAssignment(issue.id, {
    handler_member_id: handler.id,
    collaborator_member_ids: [collaborator.id],
  })
  expect(next.issues.find((item) => item.id === issue.id)?.handler_member_id).toBe(handler.id)
  expect(next.issue_collaborators.filter((item) => item.issue_id === issue.id)).toEqual([
    expect.objectContaining({ member_id: collaborator.id }),
  ])
})

it('creates document and issue links in one transaction', async () => {
  const repository = await createRepository()
  const state = await repository.loadAppState()
  const project = state.projects[0]
  const directory = state.document_directories.find((item) => item.scope === 'project' && item.project_id === project.id)
  const issue = state.issues.find((item) => item.project_id === project.id)
  const editor = state.members[0]

  const next = await repository.createDocument({
    scope: 'project',
    project_id: project.id,
    directory_id: directory?.id ?? '',
    title: '搜索接口说明',
    content_type: 'markdown',
    body: '# 搜索接口说明',
    editor_member_id: editor.id,
    linked_issue_ids: [issue?.id ?? ''],
    sync_feishu_doc: true,
  })

  const document = next.documents.find((item) => item.title === '搜索接口说明')
  expect(document?.id).toMatch(/^\d+$/)
  expect(next.document_issue_links).toContainEqual({ doc_id: document?.id, issue_id: issue?.id })
})

it('creates, renames, moves, and deletes only empty directories', async () => {
  const repository = await createRepository()
  const state = await repository.loadAppState()
  const project = state.projects[0]
  const root = state.document_directories.find((item) => item.scope === 'project' && item.project_id === project.id && item.parent_id === null)

  const created = await repository.createDirectory({
    scope: 'project',
    project_id: project.id,
    parent_id: root?.id ?? null,
    name: '接口',
  })
  const child = created.document_directories.find((item) => item.name === '接口')
  expect(child?.id).toMatch(/^\d+$/)

  const renamed = await repository.updateDirectory(child?.id ?? '', { name: '接口规范' })
  expect(renamed.document_directories.find((item) => item.id === child?.id)?.name).toBe('接口规范')

  await repository.createDocument({
    scope: 'project',
    project_id: project.id,
    directory_id: child?.id ?? '',
    title: '删除保护',
    content_type: 'markdown',
    body: '# 删除保护',
    editor_member_id: state.members[0].id,
    linked_issue_ids: [],
    sync_feishu_doc: false,
  })
  await expect(repository.deleteDirectory(child?.id ?? '')).rejects.toThrow(/empty/i)
})

it('saves bot config by full replacement and deletes omitted groups and rules', async () => {
  const repository = await createRepository()
  const state = await repository.loadAppState()
  const project = state.projects[0]
  const existingGroup = state.feishu_groups.find((item) => item.project_id === project.id)
  const existingRule = state.feishu_bot_rules.find((item) => item.project_id === project.id)

  const result = await repository.saveBotConfig({
    project_id: project.id,
    groups: [
      {
        id: existingGroup?.id,
        name: 'AgiliX 团队群',
        purpose: '项目通知',
        member_count_label: '8 人',
        status: '已连接',
        sort_order: 1,
      },
      {
        name: '风险同步群',
        purpose: '风险告警',
        member_count_label: '8 人',
        status: '已连接',
        sort_order: 2,
      },
    ],
    rules: [
      {
        id: existingRule?.id,
        rule_type: 'risk_alert',
        title: '风险告警',
        description: '阻塞时推送',
        schedule_label: '实时',
        target_group_id: existingGroup?.id ?? '',
        enabled: true,
        sort_order: 1,
      },
    ],
  })

  expect(result.groups.map((item) => item.name)).toEqual(['AgiliX 团队群', '风险同步群'])
  expect(result.rules).toHaveLength(1)
})

it('rejects bot rules whose target_group_id is missing or from another project', async () => {
  const repository = await createRepository()
  const state = await repository.loadAppState()
  const project = state.projects[0]
  const otherGroup = state.feishu_groups.find((item) => item.project_id !== project.id)

  await expect(
    repository.saveBotConfig({
      project_id: project.id,
      groups: [],
      rules: [
        {
          rule_type: 'risk_alert',
          title: '风险告警',
          description: '阻塞时推送',
          schedule_label: '实时',
          target_group_id: otherGroup?.id ?? '730000000000009999',
          enabled: true,
          sort_order: 1,
        },
      ],
    }),
  ).rejects.toThrow(/target_group_id/i)
})
```

Each test must call repository methods directly and assert persisted state with `loadAppState()`.

- [ ] **Step 2: Run failing repository conformance**

Run:

```bash
pnpm --filter @agilix/api test -- src/drizzleRepository.test.ts
```

Expected: FAIL because repository methods and validations are not implemented.

- [ ] **Step 3: Define repository interface**

Modify `apps/agilix-api/src/repository.ts` so it exports a repository interface with these methods:

```ts
export type AgiliXRepository = {
  loadAppState(): Promise<AppStateResponse>
  createProject(input: CreateProjectRequest): Promise<AppStateResponse>
  createIssue(input: CreateIssueRequest): Promise<AppStateResponse>
  updateIssueStatus(issueId: string, status: IssueStatus): Promise<AppStateResponse>
  saveIssueAssignment(issueId: string, input: SaveAssignmentRequest): Promise<AppStateResponse>
  createDocument(input: CreateDocumentRequest): Promise<AppStateResponse>
  createDocumentComment(documentId: string, input: CreateDocumentCommentRequest): Promise<AppStateResponse>
  createDirectory(input: CreateDocumentDirectoryRequest): Promise<AppStateResponse>
  updateDirectory(directoryId: string, input: UpdateDocumentDirectoryRequest): Promise<AppStateResponse>
  deleteDirectory(directoryId: string): Promise<AppStateResponse>
  saveStandup(standupId: string, input: SaveStandupRequest): Promise<AppStateResponse>
  saveMilestone(milestoneId: string, input: SaveMilestoneRequest): Promise<AppStateResponse>
  loadBotConfig(projectId: string): Promise<BotConfigResponse>
  saveBotConfig(input: SaveBotConfigRequest): Promise<BotConfigResponse>
  sendFeishuTestMessage(input: SendFeishuTestMessageRequest): Promise<FeishuTestMessageResponse>
  executeFeishuQuery(input: FeishuQueryRequest): Promise<FeishuQueryResponse>
  recordFeishuNotification(input: RecordFeishuNotificationRequest): Promise<AppStateResponse>
}
```

- [ ] **Step 4: Implement memory repository minimally**

Modify `apps/agilix-api/src/test/memoryRepository.ts` to satisfy conformance first. Keep validation explicit in small helper functions such as `requireProject`, `requireIterationInProject`, `requireMember`, `requireDirectoryForDocument`, and `requireTargetGroupInProject`.

- [ ] **Step 5: Implement Drizzle repository transactions**

Modify `apps/agilix-api/src/drizzleRepository.ts` so every write method wraps validation and writes in one transaction. Relationship failures must throw and leave state unchanged.

- [ ] **Step 6: Run repository tests**

Run:

```bash
pnpm --filter @agilix/api test -- src/drizzleRepository.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add apps/agilix-api/src/repository.ts apps/agilix-api/src/test/repositoryConformance.ts apps/agilix-api/src/test/memoryRepository.ts apps/agilix-api/src/drizzleRepository.ts apps/agilix-api/src/drizzleRepository.test.ts apps/agilix-api/src/seed.ts
git commit -m "feat: implement repository transactions"
```

---

## Task 4: Real API Routes From Shared Contract

**Files:**
- Modify: `apps/agilix-api/src/app.test.ts`
- Modify: `apps/agilix-api/src/app.ts`
- Modify: `apps/agilix-api/src/localDevServer.test.ts`
- Modify: `apps/agilix-api/src/localDevServer.ts`

- [ ] **Step 1: Write API contract tests**

Modify `apps/agilix-api/src/app.test.ts` to cover:

```ts
import {
  appStateResponseSchema,
  botConfigResponseSchema,
  feishuQueryResponseSchema,
  feishuTestMessageResponseSchema,
} from '@agilix/contract'

it('returns app state from GET /api/app-state', async () => {
  const response = await app.request('/api/app-state')
  const json = await response.json()

  expect(response.status).toBe(200)
  expect(appStateResponseSchema.parse(json).projects.length).toBeGreaterThan(0)
})

it('creates project without accepting client id', async () => {
  const rejected = await app.request('/api/projects', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      id: 'client-generated',
      code: 'OPS',
      name: '运营平台',
      glyph: '运',
      color: '#6f7f5b',
      cadence: '双周',
      template_key: 'scrum-board-burndown',
      member_ids: [],
    }),
  })
  expect(rejected.status).toBe(400)

  const created = await app.request('/api/projects', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      code: 'OPS',
      name: '运营平台',
      glyph: '运',
      color: '#6f7f5b',
      cadence: '双周',
      template_key: 'scrum-board-burndown',
      member_ids: [],
    }),
  })
  expect(created.status).toBe(201)
  expect(appStateResponseSchema.parse(await created.json()).projects.some((project) => project.code === 'OPS')).toBe(true)
})

it('creates issue and rejects client id or key', async () => {
  const state = appStateResponseSchema.parse(await (await app.request('/api/app-state')).json())
  const project = state.projects[0]
  const iteration = state.iterations.find((item) => item.project_id === project.id)
  const handler = state.members[0]

  const rejected = await app.request('/api/issues', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      id: 'client-id',
      key: 'OPS-1',
      project_id: project.id,
      iteration_id: iteration?.id,
      type: 'task',
      title: '非法客户端 ID',
      description: '应拒绝',
      acceptance_criteria: '400',
      priority: 'low',
      story_points: 1,
      handler_member_id: handler.id,
      epic_name: '校验',
      labels: [],
      collaborator_member_ids: [],
      draft: false,
    }),
  })

  expect(rejected.status).toBe(400)
})

it('updates issue status by snowflake id', async () => {
  const state = appStateResponseSchema.parse(await (await app.request('/api/app-state')).json())
  const issue = state.issues[0]

  const response = await app.request(`/api/issues/${issue.id}/status`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'done' }),
  })

  expect(response.status).toBe(200)
  expect(appStateResponseSchema.parse(await response.json()).issues.find((item) => item.id === issue.id)?.status).toBe('done')
})

it('saves assignment and returns updated workload data', async () => {
  const state = appStateResponseSchema.parse(await (await app.request('/api/app-state')).json())
  const issue = state.issues[0]
  const [handler, collaborator] = state.members

  const response = await app.request(`/api/issues/${issue.id}/assignment`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      handler_member_id: handler.id,
      collaborator_member_ids: [collaborator.id],
    }),
  })

  const next = appStateResponseSchema.parse(await response.json())
  expect(response.status).toBe(200)
  expect(next.issues.find((item) => item.id === issue.id)?.handler_member_id).toBe(handler.id)
  expect(next.issue_collaborators).toContainEqual(expect.objectContaining({ issue_id: issue.id, member_id: collaborator.id }))
})

it('creates document with linked issues and rejects client id', async () => {
  const state = appStateResponseSchema.parse(await (await app.request('/api/app-state')).json())
  const project = state.projects[0]
  const directory = state.document_directories.find((item) => item.project_id === project.id)
  const issue = state.issues.find((item) => item.project_id === project.id)

  const rejected = await app.request('/api/documents', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      id: 'client-id',
      scope: 'project',
      project_id: project.id,
      directory_id: directory?.id,
      title: '非法文档',
      content_type: 'markdown',
      body: '# 非法文档',
      editor_member_id: state.members[0].id,
      linked_issue_ids: [issue?.id],
      sync_feishu_doc: false,
    }),
  })
  expect(rejected.status).toBe(400)

  const created = await app.request('/api/documents', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      scope: 'project',
      project_id: project.id,
      directory_id: directory?.id,
      title: '搜索接口说明',
      content_type: 'markdown',
      body: '# 搜索接口说明',
      editor_member_id: state.members[0].id,
      linked_issue_ids: [issue?.id],
      sync_feishu_doc: true,
    }),
  })

  const next = appStateResponseSchema.parse(await created.json())
  const document = next.documents.find((item) => item.title === '搜索接口说明')
  expect(created.status).toBe(201)
  expect(next.document_issue_links).toContainEqual({ doc_id: document?.id, issue_id: issue?.id })
})

it('creates, renames, moves, and deletes directories', async () => {
  const state = appStateResponseSchema.parse(await (await app.request('/api/app-state')).json())
  const project = state.projects[0]
  const root = state.document_directories.find((item) => item.project_id === project.id && item.parent_id === null)

  const created = await app.request('/api/document-directories', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ scope: 'project', project_id: project.id, parent_id: root?.id, name: '接口' }),
  })
  const createdState = appStateResponseSchema.parse(await created.json())
  const directory = createdState.document_directories.find((item) => item.name === '接口')
  expect(created.status).toBe(201)

  const renamed = await app.request(`/api/document-directories/${directory?.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: '接口规范' }),
  })
  expect(appStateResponseSchema.parse(await renamed.json()).document_directories.find((item) => item.id === directory?.id)?.name).toBe('接口规范')

  const deleted = await app.request(`/api/document-directories/${directory?.id}`, { method: 'DELETE' })
  expect(deleted.status).toBe(200)
})

it('saves bot config by full replacement', async () => {
  const state = appStateResponseSchema.parse(await (await app.request('/api/app-state')).json())
  const project = state.projects[0]
  const group = state.feishu_groups.find((item) => item.project_id === project.id)

  const response = await app.request('/api/feishu/bot-config', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      project_id: project.id,
      groups: [
        {
          id: group?.id,
          name: 'AgiliX 团队群',
          purpose: '项目通知',
          member_count_label: '8 人',
          status: '已连接',
          sort_order: 1,
        },
      ],
      rules: [
        {
          rule_type: 'risk_alert',
          title: '风险告警',
          description: '阻塞时推送',
          schedule_label: '实时',
          target_group_id: group?.id,
          enabled: true,
          sort_order: 1,
        },
      ],
    }),
  })

  expect(response.status).toBe(200)
  expect(botConfigResponseSchema.parse(await response.json()).rules).toHaveLength(1)
})

it('sends test message and records notification', async () => {
  const state = appStateResponseSchema.parse(await (await app.request('/api/app-state')).json())
  const group = state.feishu_groups[0]

  const response = await app.request('/api/feishu/test-message', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ target_group_id: group.id, card_title: '测试消息' }),
  })

  expect(response.status).toBe(200)
  expect(feishuTestMessageResponseSchema.parse(await response.json()).card.title).toBe('测试消息')
})

it('executes Feishu query through real route handler', async () => {
  const response = await app.request('/api/feishu/query', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ command: '/agilix issues blocked' }),
  })

  expect(response.status).toBe(200)
  expect(feishuQueryResponseSchema.parse(await response.json()).response_title).toContain('AgiliX')
})
```

Tests must parse responses through schemas from `@agilix/contract`.

- [ ] **Step 2: Run failing API tests**

Run:

```bash
pnpm --filter @agilix/api test -- src/app.test.ts
```

Expected: FAIL because the new routes are not implemented.

- [ ] **Step 3: Implement Hono routes**

Modify `apps/agilix-api/src/app.ts` to register every route listed in the spec. Each request body must be parsed with the corresponding contract schema before calling repository methods. Each response must be produced from repository data and parse successfully with the contract response schema.

- [ ] **Step 4: Preserve local dev with real backend**

Modify `apps/agilix-api/src/localDevServer.ts` so `pnpm --filter @agilix/api dev` serves the same Hono app and returns `/api/app-state`. Keep `/api/dev/reset` gated behind `AGILIX_ENABLE_E2E_RESET=1`.

- [ ] **Step 5: Run API tests**

Run:

```bash
pnpm --filter @agilix/api test -- src/app.test.ts src/localDevServer.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add apps/agilix-api/src/app.test.ts apps/agilix-api/src/app.ts apps/agilix-api/src/localDevServer.test.ts apps/agilix-api/src/localDevServer.ts
git commit -m "feat: expose current agilix api"
```

---

## Task 5: Frontend API Client And Main Page Data Wiring

**Files:**
- Modify: `apps/agilix/src/domain/types.ts`
- Modify: `apps/agilix/src/api/client.test.ts`
- Modify: `apps/agilix/src/api/client.ts`
- Modify: `apps/agilix/src/App.persistence.test.tsx`
- Modify: `apps/agilix/src/App.tsx`
- Modify: `apps/agilix/src/routes/prototype-parity.test.tsx`

- [ ] **Step 1: Write frontend API client tests**

Modify `apps/agilix/src/api/client.test.ts` to prove:

```ts
const emptyAppStateResponse = {
  projects: [],
  project_members: [],
  iterations: [],
  iteration_calendar_weeks: [],
  iteration_calendar_days: [],
  members: [],
  issues: [],
  issue_events: [],
  issue_labels: [],
  issue_collaborators: [],
  documents: [],
  document_directories: [],
  document_issue_links: [],
  document_comments: [],
  standups: [],
  standup_items: [],
  milestones: [],
  feishu_member_profiles: [],
  feishu_groups: [],
  feishu_bot_rules: [],
  feishu_notifications: [],
  feishu_queries: [],
}

const validCreateProjectRequest = {
  code: 'OPS',
  name: '运营平台',
  glyph: '运',
  color: '#6f7f5b',
  cadence: '双周',
  template_key: 'scrum-board-burndown',
  member_ids: [],
}

const validCreateIssueRequest = {
  project_id: '730000000000000001',
  iteration_id: '730000000000000101',
  type: 'task',
  title: '检索日志接入留存分析',
  description: '接入搜索日志',
  acceptance_criteria: '可以按日期查看留存',
  priority: 'medium',
  story_points: 5,
  handler_member_id: '730000000000000201',
  epic_name: '搜索平台',
  labels: ['Data'],
  collaborator_member_ids: [],
  draft: false,
}

const validCreateDocumentRequest = {
  scope: 'project',
  project_id: '730000000000000001',
  directory_id: '730000000000000301',
  title: '接口说明',
  content_type: 'markdown',
  body: '# 接口说明',
  editor_member_id: '730000000000000201',
  linked_issue_ids: [],
  sync_feishu_doc: true,
}

const validCreateDirectoryRequest = {
  scope: 'project',
  project_id: '730000000000000001',
  parent_id: null,
  name: '接口',
}

const validCreateDocumentCommentRequest = {
  author_member_id: '730000000000000201',
  body: '需要补充验收标准',
}

it('loads /api/app-state and validates with the shared contract schema', async () => {
  const fetchCalls: Request[] = []
  const client = createAgiliXClient({
    fetch: async (input, init) => {
      const request = new Request(input, init)
      fetchCalls.push(request)
      return Response.json({
        projects: [],
        project_members: [],
        iterations: [],
        iteration_calendar_weeks: [],
        iteration_calendar_days: [],
        members: [],
        issues: [],
        issue_events: [],
        issue_labels: [],
        issue_collaborators: [],
        documents: [],
        document_directories: [],
        document_issue_links: [],
        document_comments: [],
        standups: [],
        standup_items: [],
        milestones: [],
        feishu_member_profiles: [],
        feishu_groups: [],
        feishu_bot_rules: [],
        feishu_notifications: [],
        feishu_queries: [],
      })
    },
  })

  await expect(client.loadAppState()).resolves.toEqual(expect.objectContaining({ projects: [] }))
  expect(fetchCalls[0].url).toContain('/api/app-state')
})

it('does not include id when creating project, issue, document, directory, or comment', async () => {
  const bodies: unknown[] = []
  const client = createAgiliXClient({
    fetch: async (input, init) => {
      bodies.push(JSON.parse(String(init?.body)))
      return Response.json(emptyAppStateResponse)
    },
  })

  await client.createProject(validCreateProjectRequest)
  await client.createIssue(validCreateIssueRequest)
  await client.createDocument(validCreateDocumentRequest)
  await client.createDirectory(validCreateDirectoryRequest)
  await client.createDocumentComment('730000000000000301', validCreateDocumentCommentRequest)

  expect(bodies.every((body) => !Object.prototype.hasOwnProperty.call(body as Record<string, unknown>, 'id'))).toBe(true)
})

it('rejects malformed app-state responses instead of using fallback data', async () => {
  const client = createAgiliXClient({
    fetch: async () => Response.json({ projects: 'not-array' }),
  })

  await expect(client.loadAppState()).rejects.toThrow()
})
```

- [ ] **Step 2: Write main-page persistence tests**

Modify `apps/agilix/src/App.persistence.test.tsx` to render `App` with a real API-shaped state and assert the current visible headings and core rows still render for: 团队工作台, 项目总览, 需求与缺陷, 看板, 迭代统计, 文档, 成员负载, 每日站会, 排期甘特, 飞书.

- [ ] **Step 3: Run failing frontend tests**

Run:

```bash
pnpm --filter @agilix/app test -- src/api/client.test.ts src/App.persistence.test.tsx src/routes/prototype-parity.test.tsx
```

Expected: FAIL because the client and App still use the old API shape.

- [ ] **Step 4: Implement API client**

Modify `apps/agilix/src/api/client.ts` so every method imports request/response types and schemas from `@agilix/contract`. Do not define duplicate request or response types in this file.

- [ ] **Step 5: Re-export domain types**

Modify `apps/agilix/src/domain/types.ts` to re-export display/domain types from `@agilix/contract`. Keep route component props compatible by adapting in data-layer helpers instead of changing route markup.

- [ ] **Step 6: Wire App data orchestration**

Modify `apps/agilix/src/App.tsx` to load `/api/app-state`, transform contract rows into the existing page props, and call mutation APIs. Only data loading, data construction, callback arguments, and route navigation may change.

- [ ] **Step 7: Run frontend tests**

Run:

```bash
pnpm --filter @agilix/app test -- src/api/client.test.ts src/App.persistence.test.tsx src/routes/prototype-parity.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add apps/agilix/src/domain/types.ts apps/agilix/src/api/client.test.ts apps/agilix/src/api/client.ts apps/agilix/src/App.persistence.test.tsx apps/agilix/src/App.tsx apps/agilix/src/routes/prototype-parity.test.tsx
git commit -m "feat: wire frontend to shared api contract"
```

---

## Task 6: Five Secondary Operation Pages

**Files:**
- Create tests and components listed in the File Structure section for `SecondaryNewProjectPage`, `SecondaryNewIssuePage`, `SecondaryNewDocPage`, `SecondaryAssignPage`, and `SecondaryBotPage`.
- Create: `apps/agilix/src/styles/secondary-pages.css`
- Modify: `apps/agilix/src/App.tsx`
- Modify only navigation binding in: `ProjectsPage.tsx`, `IssuesPage.tsx`, `DocsPage.tsx`, `WorkloadPage.tsx`, `FeishuPage.tsx`

- [ ] **Step 1: Write route tests for all five pages**

Create these assertions across the five secondary page test files:

```ts
it('renders new project controls from the prototype', () => {
  render(<SecondaryNewProjectPage members={members} onCancel={vi.fn()} onCreate={vi.fn()} />)

  expect(screen.getByRole('heading', { name: '① 新建项目' })).toBeInTheDocument()
  expect(screen.getByLabelText('项目名称')).toBeInTheDocument()
  expect(screen.getByLabelText('标识字')).toBeInTheDocument()
  expect(screen.getByLabelText('主色')).toBeInTheDocument()
  expect(screen.getByLabelText('项目代号')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '1 周' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '双周' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '3 周' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '自定义' })).toBeInTheDocument()
  expect(screen.getByText('Scrum · 看板+迭代+燃尽')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '创建项目' })).toBeInTheDocument()
})

it('renders new issue controls from the prototype', () => {
  render(<SecondaryNewIssuePage projects={projects} iterations={iterations} members={members} onCancel={vi.fn()} onCreate={vi.fn()} />)

  expect(screen.getByRole('heading', { name: '② 新建工单 · 需求/缺陷' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '需求' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '缺陷' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '任务' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '技术债' })).toBeInTheDocument()
  expect(screen.getByLabelText('标题')).toBeInTheDocument()
  expect(screen.getByLabelText('描述')).toBeInTheDocument()
  expect(screen.getByLabelText('验收标准')).toBeInTheDocument()
  expect(screen.getByLabelText('故事点')).toBeInTheDocument()
  expect(screen.getByLabelText('当前迭代')).toBeInTheDocument()
  expect(screen.getByLabelText('经办人')).toBeInTheDocument()
  expect(screen.getByLabelText('史诗/模块')).toBeInTheDocument()
  expect(screen.getByLabelText('标签')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '存为草稿' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '创建工单' })).toBeInTheDocument()
})

it('renders new document controls from the prototype', () => {
  render(<SecondaryNewDocPage projects={projects} directories={directories} issues={issues} members={members} onCancel={vi.fn()} onCreate={vi.fn()} />)

  expect(screen.getByRole('heading', { name: '③ 新建文档 · Markdown/脑图/Mermaid' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Markdown' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '脑图' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Mermaid' })).toBeInTheDocument()
  expect(screen.getByText('模板预览')).toBeInTheDocument()
  expect(screen.getByLabelText('标题')).toBeInTheDocument()
  expect(screen.getByLabelText('所属目录')).toBeInTheDocument()
  expect(screen.getByLabelText('成员')).toBeInTheDocument()
  expect(screen.getByLabelText('关联 Issue')).toBeInTheDocument()
  expect(screen.getByLabelText('同步飞书云文档')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '创建并编辑' })).toBeInTheDocument()
})

it('renders assignment controls from the prototype', () => {
  render(<SecondaryAssignPage issue={issue} workloadRows={workloadRows} members={members} onCancel={vi.fn()} onSave={vi.fn()} />)

  expect(screen.getByRole('heading', { name: '④ 分配 & 共担 · 负载感知' })).toBeInTheDocument()
  expect(screen.getByText(issue.key)).toBeInTheDocument()
  expect(screen.getByText(`${issue.story_points} pt`)).toBeInTheDocument()
  expect(screen.getByText('本迭代成员负载')).toBeInTheDocument()
  expect(screen.getByLabelText('经办人')).toBeInTheDocument()
  expect(screen.getByLabelText('共担成员')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '保存分配' })).toBeInTheDocument()
})

it('renders bot console controls from the prototype', () => {
  render(<SecondaryBotPage config={botConfig} onCancel={vi.fn()} onSave={vi.fn()} onTestMessage={vi.fn()} />)

  expect(screen.getByRole('heading', { name: '⑤ 群机器人控制台' })).toBeInTheDocument()
  expect(screen.getByText('机器人运行状态')).toBeInTheDocument()
  expect(screen.getByText('本周已推送')).toBeInTheDocument()
  expect(screen.getByText('关联飞书群')).toBeInTheDocument()
  expect(screen.getByText('定时摘要')).toBeInTheDocument()
  expect(screen.getByText('迭代周报')).toBeInTheDocument()
  expect(screen.getByText('风险告警')).toBeInTheDocument()
  expect(screen.getByLabelText('目标群')).toBeInTheDocument()
  expect(screen.getByText('飞书卡片预览')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '发送测试消息' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Write mutation callback tests**

Add one submit test per secondary page. The project submit test must use this pattern:

```ts
it('submits new project without a client id', async () => {
  const user = userEvent.setup()
  const onCreate = vi.fn()
  render(<SecondaryNewProjectPage members={members} onCancel={vi.fn()} onCreate={onCreate} />)

  await user.type(screen.getByLabelText('项目名称'), '运营平台')
  await user.type(screen.getByLabelText('标识字'), '运')
  await user.type(screen.getByLabelText('项目代号'), 'OPS')
  await user.click(screen.getByRole('button', { name: '双周' }))
  await user.click(screen.getByText('何川'))
  await user.click(screen.getByRole('button', { name: '创建项目' }))

  expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
    name: '运营平台',
    glyph: '运',
    code: 'OPS',
    cadence: '双周',
    template_key: 'scrum-board-burndown',
    member_ids: [members[0].id],
  }))
  expect(onCreate.mock.calls[0][0]).not.toHaveProperty('id')
})
```

The issue, document, assignment, and bot submit tests must assert these exact fields are sent and that no new primary `id` is created by the page:

- Issue: `project_id`, `iteration_id`, `type`, `title`, `description`, `acceptance_criteria`, `priority`, `story_points`, `handler_member_id`, `epic_name`, `labels`, `collaborator_member_ids`, `draft`.
- Document: `scope`, `project_id`, `directory_id`, `title`, `content_type`, `body`, `editor_member_id`, `linked_issue_ids`, `sync_feishu_doc`.
- Assignment: `handler_member_id`, `collaborator_member_ids`.
- Bot config: `project_id`, `groups`, `rules`; new groups and rules must not contain `id`, existing groups and rules may keep existing `id`.

- [ ] **Step 3: Run failing secondary page tests**

Run:

```bash
pnpm --filter @agilix/app test -- src/routes/SecondaryNewProjectPage.test.tsx src/routes/SecondaryNewIssuePage.test.tsx src/routes/SecondaryNewDocPage.test.tsx src/routes/SecondaryAssignPage.test.tsx src/routes/SecondaryBotPage.test.tsx
```

Expected: FAIL because the pages do not exist.

- [ ] **Step 4: Implement secondary page components**

Create the five page components. Match the prototype labels, order, grouping, and available actions. Import only `apps/agilix/src/styles/secondary-pages.css` for new visual rules. Do not import or modify `agilix.css` selectors.

- [ ] **Step 5: Bind existing main-page buttons to secondary routes**

Modify only existing button callbacks:

- Project overview new-project action routes to `/secondary/new-project`.
- Issues new-ticket action routes to `/secondary/new-issue`.
- Docs new-doc action routes to `/secondary/new-doc`.
- Workload assign action routes to `/secondary/assign`.
- Feishu bot console action routes to `/secondary/bot`.

Do not change button text, position, class names, or surrounding JSX.

- [ ] **Step 6: Run secondary page tests**

Run:

```bash
pnpm --filter @agilix/app test -- src/routes/SecondaryNewProjectPage.test.tsx src/routes/SecondaryNewIssuePage.test.tsx src/routes/SecondaryNewDocPage.test.tsx src/routes/SecondaryAssignPage.test.tsx src/routes/SecondaryBotPage.test.tsx src/routes/prototype-parity.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add apps/agilix/src/routes/Secondary* apps/agilix/src/styles/secondary-pages.css apps/agilix/src/App.tsx apps/agilix/src/routes/ProjectsPage.tsx apps/agilix/src/routes/IssuesPage.tsx apps/agilix/src/routes/DocsPage.tsx apps/agilix/src/routes/WorkloadPage.tsx apps/agilix/src/routes/FeishuPage.tsx
git commit -m "feat: add secondary operation pages"
```

---

## Task 7: Real API E2E And Prototype Visual Audit

**Files:**
- Create: `apps/agilix/e2e/secondary-pages-real-api.spec.ts`
- Create: `apps/agilix/e2e/no-api-mocks.spec.ts`
- Modify: `apps/agilix/e2e/prototype-visual.audit.ts`
- Modify: `apps/agilix/package.json`
- Modify: `apps/agilix/playwright.config.ts`
- Reuse: `docs/superpowers/plans/2026-06-09-agilix-e2e-ui-business-flow-plan.md`

- [ ] **Step 1: Write static e2e guard that forbids API mocks**

Create `apps/agilix/e2e/no-api-mocks.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const e2eRoot = join(process.cwd(), 'e2e')

test('e2e specs do not intercept or fulfill API requests', () => {
  for (const file of listTypeScriptFiles(e2eRoot)) {
    if (file.endsWith('no-api-mocks.spec.ts')) continue
    const content = readFileSync(file, 'utf8')
    expect(content, file).not.toMatch(/\bpage\.route\s*\(/)
    expect(content, file).not.toMatch(/\bcontext\.route\s*\(/)
    expect(content, file).not.toMatch(/\bbrowserContext\.route\s*\(/)
    expect(content, file).not.toMatch(/\broute\.fulfill\s*\(/)
    expect(content, file).not.toMatch(/\broute\.continue\s*\(/)
    expect(content, file).not.toMatch(/\bmock(Api|API|Response)?\b/)
  }
})

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name)
    if (entry.isDirectory()) return listTypeScriptFiles(fullPath)
    if (entry.isFile() && fullPath.endsWith('.ts')) return [fullPath]
    return []
  })
}
```

- [ ] **Step 2: Write secondary-page real API e2e flows**

Create `apps/agilix/e2e/secondary-pages-real-api.spec.ts` with these tests. Each test must reset the real local API with `POST http://127.0.0.1:8788/api/dev/reset`, perform the browser flow, wait for the real API response, and verify persisted state with `GET http://127.0.0.1:8788/api/app-state`.

```ts
test('creates a project through the new-project secondary page and persists it', async ({ page, request }) => {
  await request.post('http://127.0.0.1:8788/api/dev/reset')
  await page.goto('/secondary/new-project')
  await page.getByLabel('项目名称').fill('运营平台')
  await page.getByLabel('标识字').fill('运')
  await page.getByLabel('项目代号').fill('OPS')
  await page.getByRole('button', { name: '双周' }).click()
  await page.getByText('何川').click()
  const create = page.waitForResponse((response) => response.url().endsWith('/api/projects') && response.request().method() === 'POST')
  await page.getByRole('button', { name: '创建项目' }).click()
  expect((await create).status()).toBe(201)
  const state = await request.get('http://127.0.0.1:8788/api/app-state')
  expect(await state.json()).toEqual(expect.objectContaining({
    projects: expect.arrayContaining([expect.objectContaining({ code: 'OPS', name: '运营平台' })]),
  }))
})
```

The same file must also contain these four tests with the listed browser actions and persisted-state assertions:

- `test('creates an issue through the new-issue secondary page and persists it', ...)`: visit `/secondary/new-issue`, choose `需求`, fill `标题` with `搜索历史与收藏打通`, fill `描述` and `验收标准`, set `故事点` to `5`, choose the current iteration and `何川`, fill `史诗/模块` with `搜索平台`, fill `标签` with `Frontend`, click `创建工单`, wait for `POST /api/issues`, then assert `/api/app-state` contains an issue with title `搜索历史与收藏打通` and an `id` matching `/^\d+$/`.
- `test('creates a document through the new-doc secondary page and persists issue links', ...)`: visit `/secondary/new-doc`, choose `Markdown`, fill `标题` with `搜索接口说明`, choose a project directory, search and select issue `SRCH-186`, enable `同步飞书云文档`, click `创建并编辑`, wait for `POST /api/documents`, then assert `/api/app-state` contains document `搜索接口说明` and a `document_issue_links` row for that document and issue.
- `test('saves assignment through the assignment secondary page and persists collaborators', ...)`: visit `/secondary/assign`, choose `高远` as `经办人`, select `周然` as a共担 member, click `保存分配`, wait for a `PUT` response whose URL matches `/\/api\/issues\/\\d+\/assignment$/`, then assert `/api/app-state` contains the updated `handler_member_id` and an `issue_collaborators` row for `周然`.
- `test('saves bot config and sends a test message through the bot secondary page', ...)`: visit `/secondary/bot`, keep `AgiliX 团队群` as the target group for `风险告警`, click save, wait for `PUT /api/feishu/bot-config`, click `发送测试消息`, wait for `POST /api/feishu/test-message`, then assert `/api/app-state` contains a `feishu_notifications` row whose `target_group_id` is the selected group.

- [ ] **Step 3: Write visual audit checks for five secondary pages**

Modify `apps/agilix/e2e/prototype-visual.audit.ts` to use this exact artboard mapping from `飞书敏捷项目管理 · 编辑台账(单文件) (1).html`:

```ts
const secondaryArtboards = [
  { route: '/secondary/new-project', artboardId: 'new-project', label: '① 新建项目', width: 1100, height: 760 },
  { route: '/secondary/new-issue', artboardId: 'new-issue', label: '② 新建工单 · 需求/缺陷', width: 1240, height: 760 },
  { route: '/secondary/new-doc', artboardId: 'new-doc', label: '③ 新建文档 · Markdown/脑图/Mermaid', width: 1140, height: 820 },
  { route: '/secondary/assign', artboardId: 'assign', label: '④ 分配 & 共担 · 负载感知', width: 1080, height: 720 },
  { route: '/secondary/bot', artboardId: 'bot', label: '⑤ 群机器人控制台', width: 1440, height: 860 },
] as const
```

For each entry:

1. Open `file://${process.cwd()}/../../飞书敏捷项目管理 · 编辑台账(单文件) (1).html`.
2. Locate the prototype content iframe with `[id="${artboardId}"] iframe.ab-frame`.
3. Screenshot that iframe element only; do not screenshot the artboard label, canvas section, post-it notes, or outer frame.
4. Open the app `route` with the viewport set to the same `width` and `height`.
5. Screenshot the whole viewport.
6. Compare screenshots with `pixelmatch` and `pngjs`; assert `diffPixels / totalPixels <= 0.01`.

Add these dev dependencies to `apps/agilix/package.json` before implementing the visual audit:

```json
"pixelmatch": "^7.1.0",
"pngjs": "^7.0.0"
```

Run:

```bash
pnpm install
```

Expected: PASS and `pnpm-lock.yaml` includes `pixelmatch` and `pngjs` under `@agilix/app`.

- [ ] **Step 4: Run failing e2e and visual tests**

Run:

```bash
pnpm --filter @agilix/app e2e -- no-api-mocks.spec.ts
pnpm --filter @agilix/app e2e -- secondary-pages-real-api.spec.ts
pnpm --filter @agilix/app visual:audit
```

Expected: FAIL until secondary routes and visual parity are fully implemented.

- [ ] **Step 5: Configure real frontend and API servers**

Modify `apps/agilix/playwright.config.ts` to start:

- `pnpm --filter @agilix/api dev` with `AGILIX_ENABLE_E2E_RESET=1`
- `pnpm --filter @agilix/app dev`

Use one worker for real shared API state.

- [ ] **Step 6: Run e2e and visual tests**

Run:

```bash
pnpm --filter @agilix/app e2e -- no-api-mocks.spec.ts
pnpm --filter @agilix/app e2e -- secondary-pages-real-api.spec.ts
pnpm --filter @agilix/app visual:audit
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add apps/agilix/e2e/no-api-mocks.spec.ts apps/agilix/e2e/secondary-pages-real-api.spec.ts apps/agilix/e2e/prototype-visual.audit.ts apps/agilix/package.json apps/agilix/playwright.config.ts pnpm-lock.yaml
git commit -m "test: cover secondary pages with real api e2e"
```

---

## Task 8: Full Verification Gate

**Files:**
- Modify only if tests expose a defect in earlier tasks.

- [ ] **Step 1: Run contract, API, frontend, and e2e suites**

Run:

```bash
pnpm test
pnpm --filter @agilix/app e2e
pnpm --filter @agilix/app visual:audit
pnpm --filter @agilix/app build
pnpm --filter @agilix/api build
```

Expected: all commands PASS.

- [ ] **Step 2: Run static checks for forbidden patterns**

Run:

```bash
rg "references\\(" apps/agilix-api/src/db apps/agilix-api/src/schema.ts
rg "page\\.route|route\\.fulfill|api mock|mock api" apps/agilix/e2e apps/agilix/src
rg "owner|responsible|approval|permission|team_id|version" packages/agilix-contract apps/agilix-api/src apps/agilix/src
rg "Math\\.random\\(\\)|crypto\\.randomUUID\\(" apps/agilix/src
```

Expected:

- First command has no matches.
- Second command has no matches except the explicit test guard if retained.
- Third command has no product-model matches introducing forbidden concepts; existing Chinese UI text unrelated to data semantics must be reviewed case by case.
- Fourth command has no frontend primary ID generation matches.

- [ ] **Step 3: Inspect git diff for red-line violations**

Run:

```bash
git diff -- apps/agilix/src/styles/agilix.css apps/agilix/src/routes/ProjectsPage.tsx apps/agilix/src/routes/IssuesPage.tsx apps/agilix/src/routes/DocsPage.tsx apps/agilix/src/routes/WorkloadPage.tsx apps/agilix/src/routes/FeishuPage.tsx
```

Expected: no existing CSS visual rule changes; route changes are limited to invisible data construction, callback signatures, and navigation binding to secondary pages.

- [ ] **Step 4: Commit final verification fixes**

If Step 1, Step 2, or Step 3 required corrections, commit only those corrections:

```bash
git add <changed-files>
git commit -m "fix: satisfy agilix implementation gates"
```

---

## Spec Coverage Self-Review

- Current frontend remains the product contract: covered by Tasks 5, 6, 7, and 8.
- Five secondary pages from the new prototype: covered by Tasks 6 and 7.
- Shared TypeScript contract: covered by Task 1.
- Backend-generated Snowflake IDs: covered by Task 2 and repository/API assertions in Tasks 3 and 4.
- No database foreign keys: covered by Task 2 and Task 8 static checks.
- Programmatic relation validation in transactions: covered by Task 3.
- Full API boundary: covered by Task 4.
- Frontend data layer without main-page redesign: covered by Task 5 and Task 8 diff inspection.
- Real API e2e without mocks: covered by Task 7 and the existing e2e business-flow plan.
- Visual parity within 1%: covered by Task 7.
- No permissions, approvals, owners, responsible persons, teams, or document version system: covered by static checks and the schema/contract scope in Tasks 1, 2, and 8.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-09-agilix-current-frontend-implementation-plan.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, faster independent iteration.

**2. Inline Execution** - Execute tasks in this session using `superpowers:executing-plans`, with checkpoints after each task.
