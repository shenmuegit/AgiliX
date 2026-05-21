import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { schema } from '../db'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'

const app = new Hono<AppContext>()
app.use(authMiddleware)

// List milestones for a project
app.get('/projects/:projectId/milestones', async (c) => {
  const db = c.get('db')
  const milestones = await db.query.milestones.findMany({
    where: eq(schema.milestones.projectId, c.req.param('projectId')),
    with: {
      issues: {
        columns: { id: true, statusId: true },
        with: { status: { columns: { category: true } } },
      },
    },
  })

  const data = milestones.map((m) => ({
    ...m,
    totalIssues: m.issues.length,
    doneIssues: m.issues.filter((i) => i.status.category === 'DONE').length,
  }))

  return c.json({ data })
})

// Create milestone
app.post('/projects/:projectId/milestones', async (c) => {
  const db = c.get('db')
  const { name, description, gitRef } = await c.req.json<{ name: string; description?: string; gitRef?: string }>()

  const [milestone] = await db.insert(schema.milestones)
    .values({
      projectId: c.req.param('projectId'),
      name,
      description: description || null,
      gitRef: gitRef || null,
    })
    .returning()

  return c.json({ data: milestone }, 201)
})

// Update milestone
app.patch('/milestones/:id', async (c) => {
  const db = c.get('db')
  const body = await c.req.json<{ name?: string; description?: string; status?: string; gitRef?: string }>()

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (body.name !== undefined) updates.name = body.name
  if (body.description !== undefined) updates.description = body.description || null
  if (body.status !== undefined) updates.status = body.status
  if (body.gitRef !== undefined) updates.gitRef = body.gitRef || null

  const [updated] = await db.update(schema.milestones)
    .set(updates)
    .where(eq(schema.milestones.id, c.req.param('id')))
    .returning()

  return c.json({ data: updated })
})

// Delete milestone
app.delete('/milestones/:id', async (c) => {
  await c.get('db').delete(schema.milestones)
    .where(eq(schema.milestones.id, c.req.param('id')))
  return c.body(null, 204)
})

export { app as milestoneRoutes }
