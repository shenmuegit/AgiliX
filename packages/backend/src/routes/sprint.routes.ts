import { Hono } from 'hono'
import { eq, and, ne, desc, inArray } from 'drizzle-orm'
import { createSprintSchema, updateSprintSchema } from '@agilix/shared'
import { schema } from '../db'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'
import { notifySprintStarted } from '../services/notify'

const app = new Hono<AppContext>()
app.use(authMiddleware)

app.get('/projects/:projectId/sprints', async (c) => {
  const db = c.get('db')
  const sprints = await db.query.sprints.findMany({
    where: eq(schema.sprints.projectId, c.req.param('projectId')),
    orderBy: desc(schema.sprints.createdAt),
  })
  return c.json({ data: sprints })
})

app.post('/projects/:projectId/sprints', async (c) => {
  const db = c.get('db')
  const input = createSprintSchema.parse(await c.req.json())
  const [sprint] = await db.insert(schema.sprints)
    .values({ projectId: c.req.param('projectId'), ...input })
    .returning()
  return c.json({ data: sprint }, 201)
})

app.get('/sprints/:id', async (c) => {
  const db = c.get('db')
  const sprint = await db.query.sprints.findFirst({
    where: eq(schema.sprints.id, c.req.param('id')),
    with: { issues: { with: { status: true } } },
  })
  if (!sprint) return c.json({ error: 'Not found', message: 'Sprint not found' }, 404)
  return c.json({ data: sprint })
})

app.patch('/sprints/:id', async (c) => {
  const db = c.get('db')
  const input = updateSprintSchema.parse(await c.req.json())
  const [sprint] = await db.update(schema.sprints)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(eq(schema.sprints.id, c.req.param('id')))
    .returning()
  return c.json({ data: sprint })
})

app.post('/sprints/:id/start', async (c) => {
  const db = c.get('db')
  const sprint = await db.query.sprints.findFirst({
    where: eq(schema.sprints.id, c.req.param('id')),
  })
  if (!sprint) return c.json({ error: 'Not found' }, 404)
  if (sprint.status !== 'PLANNED') {
    return c.json({ error: 'Bad request', message: 'Sprint is not in PLANNED state' }, 400)
  }

  const active = await db.query.sprints.findFirst({
    where: and(eq(schema.sprints.projectId, sprint.projectId), eq(schema.sprints.status, 'ACTIVE')),
  })
  if (active) {
    return c.json({ error: 'Conflict', message: 'An active sprint already exists' }, 409)
  }

  const now = new Date().toISOString()
  const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const [updated] = await db.update(schema.sprints)
    .set({
      status: 'ACTIVE',
      startDate: sprint.startDate || now,
      endDate: sprint.endDate || twoWeeksLater,
      updatedAt: now,
    })
    .where(eq(schema.sprints.id, c.req.param('id')))
    .returning()

  const sprintIssues = await db.query.issues.findMany({
    where: eq(schema.issues.sprintId, updated.id),
  })
  const totalPts = sprintIssues.reduce((s, i) => s + (i.storyPoints ?? 0), 0)
  notifySprintStarted(c.env, db, schema, updated, sprintIssues.length, totalPts).catch(() => {})

  return c.json({ data: updated })
})

app.post('/sprints/:id/complete', async (c) => {
  const db = c.get('db')
  const sprint = await db.query.sprints.findFirst({
    where: eq(schema.sprints.id, c.req.param('id')),
  })
  if (!sprint) return c.json({ error: 'Not found' }, 404)
  if (sprint.status !== 'ACTIVE') {
    return c.json({ error: 'Bad request', message: 'Sprint is not active' }, 400)
  }

  const body = await c.req.json<{ moveToSprintId?: string }>().catch(() => ({} as { moveToSprintId?: string }))
  const moveToSprintId = body.moveToSprintId

  await db.update(schema.sprints)
    .set({ status: 'COMPLETED', updatedAt: new Date().toISOString() })
    .where(eq(schema.sprints.id, c.req.param('id')))

  // Move incomplete issues
  const incompleteIssues = await db.query.issues.findMany({
    where: and(
      eq(schema.issues.sprintId, c.req.param('id')),
    ),
    with: { status: true },
  })

  const toMove = incompleteIssues.filter((i) => i.status.category !== 'DONE')
  if (toMove.length > 0) {
    await db.update(schema.issues)
      .set({ sprintId: moveToSprintId || null, updatedAt: new Date().toISOString() })
      .where(inArray(schema.issues.id, toMove.map((i) => i.id)))
  }

  return c.json({ data: { completed: true } })
})

app.post('/sprints/:id/issues', async (c) => {
  const db = c.get('db')
  const { issueIds } = await c.req.json<{ issueIds: string[] }>()
  const now = new Date().toISOString()
  for (const issueId of issueIds) {
    await db.update(schema.issues)
      .set({ sprintId: c.req.param('id'), updatedAt: now })
      .where(eq(schema.issues.id, issueId))
  }
  return c.json({ data: { added: issueIds.length } })
})

app.get('/sprints/:id/burndown', async (c) => {
  const db = c.get('db')
  const snapshots = await db.query.sprintSnapshots.findMany({
    where: eq(schema.sprintSnapshots.sprintId, c.req.param('id')),
  })
  return c.json({ data: snapshots })
})

export { app as sprintRoutes }
