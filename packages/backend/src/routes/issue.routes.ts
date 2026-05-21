import { Hono } from 'hono'
import { eq, and, or, desc, like, sql } from 'drizzle-orm'
import { createIssueSchema, updateIssueSchema, moveIssueSchema } from '@agilix/shared'
import { schema } from '../db'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'
import { notifyStatusChange } from '../services/notify'
import { pushIssueToGit } from '../services/issue-sync'

const app = new Hono<AppContext>()
app.use(authMiddleware)

// List issues for a project
app.get('/projects/:projectId/issues', async (c) => {
  const db = c.get('db')
  const projectId = c.req.param('projectId')
  const { type, priority, milestoneId } = c.req.query()

  let conditions = [eq(schema.issues.projectId, projectId)]
  if (type) conditions.push(eq(schema.issues.type, type as any))
  if (priority) conditions.push(eq(schema.issues.priority, priority as any))
  if (milestoneId) conditions.push(eq(schema.issues.milestoneId, milestoneId))

  const issues = await db.query.issues.findMany({
    where: and(...conditions),
    with: { status: true, labels: { with: { label: true } } },
    orderBy: desc(schema.issues.updatedAt),
  })

  return c.json({ data: issues })
})

// Create issue
app.post('/projects/:projectId/issues', async (c) => {
  const db = c.get('db')
  const input = createIssueSchema.parse(await c.req.json())
  const projectId = c.req.param('projectId')
  const userId = c.get('user').userId

  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.id, projectId),
    with: { workflows: { with: { statuses: true } } },
  })
  if (!project) return c.json({ error: 'Not found', message: 'Project not found' }, 404)

  const defaultStatus = project.workflows[0]?.statuses?.sort((a, b) => a.order - b.order)[0]
  if (!defaultStatus) return c.json({ error: 'Config error', message: 'No workflow status found' }, 500)

  const board = await db.query.boards.findFirst({
    where: eq(schema.boards.projectId, projectId),
    with: { columns: true },
  })
  const defaultColumn = board?.columns.find((c) => c.statusId === defaultStatus.id)

  // Get next sequence number
  const [last] = await db.select({ max: sql<number>`max(${schema.issues.sequenceNum})` })
    .from(schema.issues)
    .where(eq(schema.issues.projectId, projectId))
  const sequenceNum = (last?.max ?? 0) + 1

  const [issue] = await db.insert(schema.issues)
    .values({
      projectId,
      key: `${project.key}-${sequenceNum}`,
      sequenceNum,
      title: input.title,
      description: input.description,
      type: input.type,
      priority: input.priority,
      statusId: defaultStatus.id,
      boardColumnId: defaultColumn?.id,
      reporterId: userId,
      parentId: input.parentId,
      milestoneId: input.milestoneId,
      dueDate: input.dueDate,
    })
    .returning()

  await db.insert(schema.activityLogs)
    .values({
      issueId: issue.id,
      userId,
      action: 'created',
      detail: JSON.stringify({ type: issue.type, priority: issue.priority }),
    })

  pushIssueToGit(db, issue.id).catch(() => {})

  const full = await db.query.issues.findFirst({
    where: eq(schema.issues.id, issue.id),
    with: { status: true },
  })

  return c.json({ data: full }, 201)
})

// Get issue detail
app.get('/issues/:id', async (c) => {
  const db = c.get('db')
  const issue = await db.query.issues.findFirst({
    where: eq(schema.issues.id, c.req.param('id')),
    with: {
      status: true,
      labels: { with: { label: true } },
      children: { with: { status: true } },
      mergeRequests: true,
      gitBranches: true,
    },
  })
  if (!issue) return c.json({ error: 'Not found', message: 'Issue not found' }, 404)
  return c.json({ data: issue })
})

// Update issue
app.patch('/issues/:id', async (c) => {
  const db = c.get('db')
  const input = updateIssueSchema.parse(await c.req.json())
  const userId = c.get('user').userId

  const oldIssue = await db.query.issues.findFirst({
    where: eq(schema.issues.id, c.req.param('id')),
    with: { status: true },
  })

  const [issue] = await db.update(schema.issues)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(eq(schema.issues.id, c.req.param('id')))
    .returning()

  if (input.statusId && oldIssue && input.statusId !== oldIssue.statusId) {
    const newStatus = await db.query.workflowStatuses.findFirst({
      where: eq(schema.workflowStatuses.id, input.statusId),
    })
    await db.insert(schema.activityLogs).values({
      issueId: issue.id,
      userId,
      action: 'status_changed',
      detail: JSON.stringify({ from: oldIssue.status.name, to: newStatus?.name }),
    })
    if (newStatus) {
      notifyStatusChange(c.env, db, schema, issue, oldIssue.status.name, newStatus.name, c.get('user').name).catch(() => {})
    }
  } else {
    await db.insert(schema.activityLogs).values({
      issueId: issue.id,
      userId,
      action: 'updated',
      detail: JSON.stringify(input),
    })
  }

  pushIssueToGit(db, issue.id).catch(() => {})

  const full = await db.query.issues.findFirst({
    where: eq(schema.issues.id, issue.id),
    with: { status: true },
  })
  return c.json({ data: full })
})

// Move issue (drag & drop)
app.patch('/issues/:id/move', async (c) => {
  const db = c.get('db')
  const input = moveIssueSchema.parse(await c.req.json())
  const userId = c.get('user').userId

  const column = await db.query.boardColumns.findFirst({
    where: eq(schema.boardColumns.id, input.boardColumnId),
  })
  if (!column) return c.json({ error: 'Not found', message: 'Column not found' }, 404)

  const [issue] = await db.update(schema.issues)
    .set({
      boardColumnId: input.boardColumnId,
      columnOrder: input.columnOrder,
      statusId: column.statusId,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.issues.id, c.req.param('id')))
    .returning()

  await db.insert(schema.activityLogs)
    .values({
      issueId: issue.id,
      userId,
      action: 'moved',
      detail: JSON.stringify({ columnOrder: input.columnOrder }),
    })

  pushIssueToGit(db, issue.id).catch(() => {})

  const full = await db.query.issues.findFirst({
    where: eq(schema.issues.id, issue.id),
    with: { status: true },
  })
  return c.json({ data: full })
})

// Search issues
app.get('/projects/:projectId/search', async (c) => {
  const db = c.get('db')
  const q = c.req.query('q')?.trim()
  if (!q) return c.json({ data: [] })

  const pattern = `%${q}%`
  const issues = await db.query.issues.findMany({
    where: and(
      eq(schema.issues.projectId, c.req.param('projectId')),
      or(
        like(schema.issues.key, pattern),
        like(schema.issues.title, pattern),
      ),
    ),
    with: { status: true },
    orderBy: desc(schema.issues.updatedAt),
    limit: 20,
  })
  return c.json({ data: issues })
})

// Delete issue
app.delete('/issues/:id', async (c) => {
  await c.get('db').delete(schema.issues).where(eq(schema.issues.id, c.req.param('id')))
  return c.body(null, 204)
})

// Activity log
app.get('/issues/:id/activity', async (c) => {
  const db = c.get('db')
  const activities = await db.query.activityLogs.findMany({
    where: eq(schema.activityLogs.issueId, c.req.param('id')),
    with: { user: true },
    orderBy: desc(schema.activityLogs.createdAt),
    limit: 50,
  })
  return c.json({ data: activities })
})

export { app as issueRoutes }
