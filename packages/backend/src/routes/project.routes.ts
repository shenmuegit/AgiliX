import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
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

// ──────────────── Workflow Status Management ────────────────

app.post('/:id/workflow-statuses', async (c) => {
  const db = c.get('db')
  const { name, category, color } = await c.req.json<{ name: string; category: 'TODO' | 'IN_PROGRESS' | 'DONE'; color: string }>()

  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.id, c.req.param('id')),
    with: { workflows: { with: { statuses: true } } },
  })
  if (!project) return c.json({ error: 'Not found' }, 404)

  const workflow = project.workflows[0]
  if (!workflow) return c.json({ error: 'No workflow' }, 500)

  const maxOrder = Math.max(...workflow.statuses.map((s) => s.order), -1)

  const [status] = await db.insert(schema.workflowStatuses)
    .values({ workflowId: workflow.id, name, category, order: maxOrder + 1, color })
    .returning()

  const board = await db.query.boards.findFirst({
    where: eq(schema.boards.projectId, c.req.param('id')),
  })
  if (board) {
    await db.insert(schema.boardColumns)
      .values({ boardId: board.id, statusId: status.id, order: maxOrder + 1 })
  }

  return c.json({ data: status }, 201)
})

app.patch('/:id/workflow-statuses/:statusId', async (c) => {
  const db = c.get('db')
  const input = await c.req.json<{ name?: string; category?: 'TODO' | 'IN_PROGRESS' | 'DONE'; color?: string; order?: number }>()

  const [status] = await db.update(schema.workflowStatuses)
    .set(input)
    .where(eq(schema.workflowStatuses.id, c.req.param('statusId')))
    .returning()

  return c.json({ data: status })
})

app.delete('/:id/workflow-statuses/:statusId', async (c) => {
  const db = c.get('db')
  const statusId = c.req.param('statusId')

  const issuesUsing = await db.query.issues.findFirst({
    where: eq(schema.issues.statusId, statusId),
  })
  if (issuesUsing) {
    return c.json({ error: 'Conflict', message: '该状态仍有关联的 Issue，无法删除' }, 409)
  }

  await db.delete(schema.boardColumns).where(eq(schema.boardColumns.statusId, statusId))
  await db.delete(schema.workflowStatuses).where(eq(schema.workflowStatuses.id, statusId))
  return c.body(null, 204)
})

app.put('/:id/workflow-statuses/reorder', async (c) => {
  const db = c.get('db')
  const { statuses } = await c.req.json<{ statuses: Array<{ id: string; order: number }> }>()

  for (const s of statuses) {
    await db.update(schema.workflowStatuses)
      .set({ order: s.order })
      .where(eq(schema.workflowStatuses.id, s.id))
  }

  const board = await db.query.boards.findFirst({
    where: eq(schema.boards.projectId, c.req.param('id')),
    with: { columns: true },
  })
  if (board) {
    for (const s of statuses) {
      const col = board.columns.find((c) => c.statusId === s.id)
      if (col) {
        await db.update(schema.boardColumns)
          .set({ order: s.order })
          .where(eq(schema.boardColumns.id, col.id))
      }
    }
  }

  return c.json({ ok: true })
})

// ──────────────── Board Column WIP Limits ────────────────

app.patch('/:id/board-columns/:columnId', async (c) => {
  const db = c.get('db')
  const { wipLimit } = await c.req.json<{ wipLimit: number | null }>()

  const [col] = await db.update(schema.boardColumns)
    .set({ wipLimit })
    .where(eq(schema.boardColumns.id, c.req.param('columnId')))
    .returning()

  return c.json({ data: col })
})

// ──────────────── Feishu Group Association ────────────────

app.patch('/:id/feishu-group', async (c) => {
  const db = c.get('db')
  const { feishuGroupId } = await c.req.json<{ feishuGroupId: string | null }>()

  const [project] = await db.update(schema.projects)
    .set({ feishuGroupId, updatedAt: new Date().toISOString() })
    .where(eq(schema.projects.id, c.req.param('id')))
    .returning()

  return c.json({ data: project })
})

export { app as projectRoutes }
