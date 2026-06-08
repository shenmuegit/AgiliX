# AgiliX Phase 5 Documents and Feishu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build AgiliX document management and Feishu notification/query surfaces.

**Architecture:** Document and Feishu routes are data-driven React components. Document writes, Feishu notification records, and Feishu queries are exposed as callbacks; Phase 6 wires those callbacks to the API client. Feishu remains a single team group for notifications and queries only.

**Tech Stack:** TypeScript, React, Vitest, Testing Library, user-event.

---

## Scope

- Build full document management: global docs, project docs, directory, search, detail, linked issues, comments, new document action, add comment action.
- Build Feishu surface: one group, notification record action, query commands, reply preview.
- Exclude permissions, approval flow, multiple Feishu groups, and Feishu-side editing.

## Files

- Create `apps/agilix/src/routes/DocsPage.tsx`: document management.
- Create `apps/agilix/src/routes/docs.test.tsx`: document route tests.
- Create `apps/agilix/src/routes/FeishuPage.tsx`: Feishu notification/query surface.
- Create `apps/agilix/src/routes/feishu.test.tsx`: Feishu route tests.

### Task 1: Build Document Management

**Files:**
- Create: `apps/agilix/src/routes/DocsPage.tsx`
- Test: `apps/agilix/src/routes/docs.test.tsx`

- [ ] **Step 1: Write the failing document management test**

Create `apps/agilix/src/routes/docs.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { seedData } from '../domain/fixtures'
import { DocsPage } from './DocsPage'

describe('DocsPage', () => {
  it('shows global docs, project docs, directory, search, comments, linked issues, and document actions', async () => {
    const onAddComment = vi.fn()
    const onCreateDoc = vi.fn()

    render(<DocsPage data={seedData} projectId="all" onAddComment={onAddComment} onCreateDoc={onCreateDoc} />)

    expect(screen.getByRole('heading', { name: '文档' })).toBeInTheDocument()
    expect(screen.getByText('全局文档')).toBeInTheDocument()
    expect(screen.getByText('项目文档')).toBeInTheDocument()
    expect(screen.getByText('结果卡片重设计方案')).toBeInTheDocument()
    expect(screen.getByText('灰度发布检查清单')).toBeInTheDocument()
    expect(screen.getByText('SRCH-186')).toBeInTheDocument()
    expect(screen.getByText('评论')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('searchbox', { name: '搜索文档' }), '结果卡片')
    expect(screen.getByText('结果卡片重设计方案')).toBeInTheDocument()
    expect(screen.queryByText('灰度发布检查清单')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '新增评论' }))
    expect(onAddComment).toHaveBeenCalledWith('doc-result-card', expect.objectContaining({ body: '从 AgiliX 文档页补充的评论' }))

    await userEvent.click(screen.getByRole('button', { name: '新建文档' }))
    expect(onCreateDoc).toHaveBeenCalledWith(expect.objectContaining({ scope: 'global', title: '新建全局文档' }))
  })
})
```

- [ ] **Step 2: Run RED**

Run:

```bash
pnpm --filter @agilix/app test -- src/routes/docs.test.tsx
```

Expected: FAIL because `DocsPage.tsx` does not exist.

- [ ] **Step 3: Add document route code**

Create `apps/agilix/src/routes/DocsPage.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { buildDocDirectoryTree, filterDocs, searchDocs } from '../domain/docs'
import type { Doc, DocComment, ProjectId, SeedData } from '../domain/types'

export function DocsPage({
  data,
  projectId,
  onAddComment,
  onCreateDoc,
}: {
  data: SeedData
  projectId: ProjectId | 'all'
  onAddComment: (docId: string, comment: DocComment) => void | Promise<void>
  onCreateDoc: (doc: Doc) => void | Promise<void>
}) {
  const [query, setQuery] = useState('')
  const baseDocs = filterDocs(data.docs, projectId)
  const docs = query === '' ? baseDocs : searchDocs(baseDocs, query)
  const directories = buildDocDirectoryTree(baseDocs)
  const selected = docs[0]

  const linkedIssueTitles = useMemo(() => {
    if (!selected) return []
    return selected.linkedIssueKeys.map((key) => {
      const issue = data.issues.find((item) => item.key === key)
      if (!issue) throw new Error(`Linked issue not found: ${key}`)
      return issue.key
    })
  }, [data.issues, selected])

  return (
    <main>
      <header>
        <h1>文档</h1>
        <p>全局文档 + 项目文档</p>
        <button
          onClick={() => {
            void onCreateDoc({
              id: 'doc-global-created',
              scope: 'global',
              title: '新建全局文档',
              directory: '全局文档/待整理',
              body: '从 AgiliX 文档页创建的全局文档',
              linkedIssueKeys: [],
              comments: [],
              updatedAtLabel: '刚刚',
            })
          }}
        >
          新建文档
        </button>
      </header>
      <label>
        搜索文档
        <input aria-label="搜索文档" type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
      </label>
      <aside>
        <h2>目录</h2>
        {directories.map((directory) => (
          <div key={directory.name}>{directory.name}</div>
        ))}
      </aside>
      <section>
        {docs.map((doc) => (
          <article key={doc.id}>
            <h2>{doc.title}</h2>
            <p>{doc.directory}</p>
          </article>
        ))}
      </section>
      {selected ? (
        <aside>
          <h2>{selected.title}</h2>
          <h3>关联 Issue</h3>
          {linkedIssueTitles.map((key) => (
            <span key={key}>{key}</span>
          ))}
          <h3>评论</h3>
          {selected.comments.map((comment) => (
            <p key={comment.id}>{comment.body}</p>
          ))}
          <button
            onClick={() => {
              void onAddComment(selected.id, {
                id: 'comment-ui',
                docId: selected.id,
                authorId: 'zhou',
                body: '从 AgiliX 文档页补充的评论',
                resolved: false,
                createdAtLabel: '刚刚',
              })
            }}
          >
            新增评论
          </button>
        </aside>
      ) : null}
    </main>
  )
}
```

- [ ] **Step 4: Run GREEN**

Run:

```bash
pnpm --filter @agilix/app test -- src/routes/docs.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/agilix/src/routes/DocsPage.tsx apps/agilix/src/routes/docs.test.tsx
git commit -m "feat: add document management route"
```

### Task 2: Build Feishu Notification and Query Surface

**Files:**
- Create: `apps/agilix/src/routes/FeishuPage.tsx`
- Test: `apps/agilix/src/routes/feishu.test.tsx`

- [ ] **Step 1: Write the failing Feishu route test**

Create `apps/agilix/src/routes/feishu.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { seedData } from '../domain/fixtures'
import { FeishuPage } from './FeishuPage'

describe('FeishuPage', () => {
  it('supports one-group notifications and query-only commands', async () => {
    const onNotify = vi.fn(async () => undefined)
    const onQuery = vi.fn(async () => ({ title: '团队状态', lines: ['Issue 7', '文档 3'] }))

    render(<FeishuPage data={seedData} onNotify={onNotify} onQuery={onQuery} />)

    expect(screen.getByRole('heading', { name: '飞书' })).toBeInTheDocument()
    expect(screen.getByText('AgiliX 团队群')).toBeInTheDocument()
    expect(screen.getByText('站会摘要')).toBeInTheDocument()
    expect(screen.getByText('/team')).toBeInTheDocument()
    expect(screen.getByText('/blockers')).toBeInTheDocument()
    expect(screen.getByText('/docs 结果卡片')).toBeInTheDocument()
    expect(screen.queryByText('审批流')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '记录 站会摘要' }))
    expect(onNotify).toHaveBeenCalledWith('站会摘要')

    await userEvent.click(screen.getByRole('button', { name: '查询 /team' }))
    expect(onQuery).toHaveBeenCalledWith({ type: 'team' })
    expect(await screen.findByText('团队状态')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run RED**

Run:

```bash
pnpm --filter @agilix/app test -- src/routes/feishu.test.tsx
```

Expected: FAIL because `FeishuPage.tsx` does not exist.

- [ ] **Step 3: Add Feishu route code**

Create `apps/agilix/src/routes/FeishuPage.tsx`:

```tsx
import { useState } from 'react'
import { formatFeishuCommand } from '../domain/feishu'
import type { FeishuNotificationTrigger, FeishuQueryCommand, SeedData } from '../domain/types'

interface Reply {
  title: string
  lines: string[]
}

export function FeishuPage({
  data,
  onNotify,
  onQuery,
}: {
  data: SeedData
  onNotify: (trigger: FeishuNotificationTrigger) => Promise<void>
  onQuery: (command: FeishuQueryCommand) => Promise<Reply>
}) {
  const [reply, setReply] = useState<Reply | null>(null)

  async function runQuery(command: FeishuQueryCommand) {
    setReply(await onQuery(command))
  }

  return (
    <main>
      <h1>飞书</h1>
      <section>
        <h2>群</h2>
        {data.feishu.groups.map((group) => (
          <p key={group}>{group}</p>
        ))}
      </section>
      <section>
        <h2>通知</h2>
        {data.feishu.notificationTriggers.map((trigger) => (
          <article key={trigger}>
            <span>{trigger}</span>
            <button onClick={() => void onNotify(trigger)}>记录 {trigger}</button>
          </article>
        ))}
      </section>
      <section>
        <h2>查询命令</h2>
        {data.feishu.queryCommands.map((command) => (
          <article key={formatFeishuCommand(command)}>
            <code>{formatFeishuCommand(command)}</code>
            <button onClick={() => runQuery(command)}>查询 {formatFeishuCommand(command)}</button>
          </article>
        ))}
      </section>
      {reply ? (
        <section>
          <h2>{reply.title}</h2>
          {reply.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>
      ) : null}
    </main>
  )
}
```

- [ ] **Step 4: Run GREEN**

Run:

```bash
pnpm --filter @agilix/app test -- src/routes/feishu.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Run affected tests**

Run:

```bash
pnpm --filter @agilix/app test -- src/routes/docs.test.tsx src/routes/feishu.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/agilix/src/routes/FeishuPage.tsx apps/agilix/src/routes/feishu.test.tsx
git commit -m "feat: add Feishu notification and query route"
```

## Self-Review

- Spec coverage: Phase 5 covers document directories, global/project docs, search, detail, linked issues, comments, new document action, one-group Feishu notifications, and query commands.
- Scope check: API wiring and browser QA remain in Phase 6.
- TDD check: Each task starts with a failing test and RED command before production code.
- Type consistency: `DocComment`, `SeedData`, and Feishu reply signatures match tests and code snippets.
- Placeholder scan: No unresolved placeholder markers or unfilled sections remain.
