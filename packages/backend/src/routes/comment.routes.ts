import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { schema } from '../db'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'

const app = new Hono<AppContext>()
app.use(authMiddleware)

app.get('/issues/:issueId/comments', async (c) => {
  const db = c.get('db')
  const comments = await db.query.comments.findMany({
    where: eq(schema.comments.issueId, c.req.param('issueId')),
    with: { author: true },
  })
  return c.json({ data: comments })
})

app.post('/issues/:issueId/comments', async (c) => {
  const db = c.get('db')
  const { content } = await c.req.json<{ content: string }>()
  const userId = c.get('user').userId

  const [comment] = await db.insert(schema.comments)
    .values({ issueId: c.req.param('issueId'), authorId: userId, content })
    .returning()

  await db.insert(schema.activityLogs)
    .values({ issueId: c.req.param('issueId'), userId, action: 'commented' })

  const full = await db.query.comments.findFirst({
    where: eq(schema.comments.id, comment.id),
    with: { author: true },
  })
  return c.json({ data: full }, 201)
})

app.patch('/comments/:id', async (c) => {
  const db = c.get('db')
  const { content } = await c.req.json<{ content: string }>()
  const [comment] = await db.update(schema.comments)
    .set({ content, updatedAt: new Date().toISOString() })
    .where(eq(schema.comments.id, c.req.param('id')))
    .returning()
  return c.json({ data: comment })
})

app.delete('/comments/:id', async (c) => {
  await c.get('db').delete(schema.comments).where(eq(schema.comments.id, c.req.param('id')))
  return c.body(null, 204)
})

export { app as commentRoutes }
