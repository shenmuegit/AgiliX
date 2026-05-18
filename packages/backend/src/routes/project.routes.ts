import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { createProjectSchema, updateProjectSchema } from '@agilix/shared'
import { schema } from '../db'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'

const app = new Hono<AppContext>()
app.use(authMiddleware)

app.get('/', async (c) => {
  const db = c.get('db')
  const userId = c.get('user').userId

  const memberships = await db.query.projectMembers.findMany({
    where: eq(schema.projectMembers.userId, userId),
    with: { project: true },
  })

  return c.json({ data: memberships.map((m) => m.project) })
})

app.post('/', async (c) => {
  const db = c.get('db')
  const input = createProjectSchema.parse(await c.req.json())
  const userId = c.get('user').userId

  const existing = await db.query.projects.findFirst({
    where: eq(schema.projects.key, input.key),
  })
  if (existing) {
    return c.json({ error: 'Conflict', message: `Project key "${input.key}" already exists` }, 409)
  }

  const [project] = await db.insert(schema.projects)
    .values({ key: input.key, name: input.name, description: input.description })
    .returning()

  await db.insert(schema.projectMembers)
    .values({ projectId: project.id, userId, role: 'OWNER' })

  // Create default workflow
  const [workflow] = await db.insert(schema.workflows)
    .values({ projectId: project.id, name: 'Default' })
    .returning()

  const statusDefs = [
    { name: 'To Do', category: 'TODO' as const, order: 0, color: '#6B7280' },
    { name: 'In Progress', category: 'IN_PROGRESS' as const, order: 1, color: '#3B82F6' },
    { name: 'In Review', category: 'IN_PROGRESS' as const, order: 2, color: '#8B5CF6' },
    { name: 'Done', category: 'DONE' as const, order: 3, color: '#10B981' },
  ]

  const statuses = await db.insert(schema.workflowStatuses)
    .values(statusDefs.map((s) => ({ ...s, workflowId: workflow.id })))
    .returning()

  // Create default board
  const [board] = await db.insert(schema.boards)
    .values({ projectId: project.id, name: 'Main Board' })
    .returning()

  await db.insert(schema.boardColumns)
    .values(statuses.map((s, i) => ({ boardId: board.id, statusId: s.id, order: i })))

  return c.json({ data: project }, 201)
})

app.get('/:id', async (c) => {
  const db = c.get('db')
  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.id, c.req.param('id')),
    with: {
      members: { with: { user: true } },
      workflows: { with: { statuses: true } },
    },
  })
  if (!project) return c.json({ error: 'Not found', message: 'Project not found' }, 404)
  return c.json({ data: project })
})

app.patch('/:id', async (c) => {
  const db = c.get('db')
  const input = updateProjectSchema.parse(await c.req.json())
  const [project] = await db.update(schema.projects)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(eq(schema.projects.id, c.req.param('id')))
    .returning()
  return c.json({ data: project })
})

app.delete('/:id', async (c) => {
  await c.get('db').delete(schema.projects).where(eq(schema.projects.id, c.req.param('id')))
  return c.body(null, 204)
})

// Members
app.get('/:id/members', async (c) => {
  const db = c.get('db')
  const members = await db.query.projectMembers.findMany({
    where: eq(schema.projectMembers.projectId, c.req.param('id')),
    with: { user: true },
  })
  return c.json({ data: members })
})

app.post('/:id/members', async (c) => {
  const db = c.get('db')
  const { feishuUserId, role } = await c.req.json<{ feishuUserId: string; role?: string }>()

  let user = await db.query.users.findFirst({
    where: eq(schema.users.feishuUserId, feishuUserId),
  })
  if (!user) {
    ;[user] = await db.insert(schema.users)
      .values({ feishuUserId, name: 'Feishu User' })
      .returning()
  }

  const [member] = await db.insert(schema.projectMembers)
    .values({
      projectId: c.req.param('id'),
      userId: user.id,
      role: (role as 'ADMIN' | 'MEMBER') || 'MEMBER',
    })
    .returning()

  return c.json({ data: member }, 201)
})

export { app as projectRoutes }
