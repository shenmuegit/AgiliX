import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { schema } from '../db'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'

const app = new Hono<AppContext>()
app.use(authMiddleware)

app.get('/projects/:projectId/board', async (c) => {
  const db = c.get('db')
  const board = await db.query.boards.findFirst({
    where: eq(schema.boards.projectId, c.req.param('projectId')),
    with: {
      columns: {
        with: {
          issues: {
            with: {
              status: true,
              assignee: true,
              labels: { with: { label: true } },
            },
          },
        },
      },
    },
  })

  if (board) {
    board.columns.sort((a, b) => a.order - b.order)
    for (const col of board.columns) {
      col.issues.sort((a, b) => a.columnOrder - b.columnOrder)
    }
  }

  return c.json({ data: board })
})

app.patch('/boards/:id/columns/:colId', async (c) => {
  const db = c.get('db')
  const { wipLimit, order } = await c.req.json<{ wipLimit?: number; order?: number }>()
  const updates: Record<string, unknown> = {}
  if (wipLimit !== undefined) updates.wipLimit = wipLimit
  if (order !== undefined) updates.order = order

  const [column] = await db.update(schema.boardColumns)
    .set(updates)
    .where(eq(schema.boardColumns.id, c.req.param('colId')))
    .returning()
  return c.json({ data: column })
})

export { app as boardRoutes }
