import { Hono } from 'hono'
import { eq, desc } from 'drizzle-orm'
import { createTimeLogSchema, updateTimeLogSchema } from '@agilix/shared'
import { schema } from '../db'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'

const app = new Hono<AppContext>()
app.use(authMiddleware)

app.get('/issues/:issueId/timelogs', async (c) => {
  const db = c.get('db')
  const timelogs = await db.query.timeLogs.findMany({
    where: eq(schema.timeLogs.issueId, c.req.param('issueId')),
    with: { user: true },
    orderBy: desc(schema.timeLogs.logDate),
  })
  return c.json({ data: timelogs })
})

app.post('/issues/:issueId/timelogs', async (c) => {
  const db = c.get('db')
  const input = createTimeLogSchema.parse(await c.req.json())
  const userId = c.get('user').userId

  const [timelog] = await db.insert(schema.timeLogs)
    .values({
      issueId: c.req.param('issueId'),
      userId,
      minutes: input.minutes,
      description: input.description,
      logDate: input.logDate,
    })
    .returning()

  await db.insert(schema.activityLogs)
    .values({
      issueId: c.req.param('issueId'),
      userId,
      action: 'logged_time',
      detail: JSON.stringify({ minutes: input.minutes }),
    })

  return c.json({ data: timelog }, 201)
})

app.patch('/timelogs/:id', async (c) => {
  const db = c.get('db')
  const input = updateTimeLogSchema.parse(await c.req.json())
  const [timelog] = await db.update(schema.timeLogs)
    .set(input)
    .where(eq(schema.timeLogs.id, c.req.param('id')))
    .returning()
  return c.json({ data: timelog })
})

app.delete('/timelogs/:id', async (c) => {
  await c.get('db').delete(schema.timeLogs).where(eq(schema.timeLogs.id, c.req.param('id')))
  return c.body(null, 204)
})

export { app as timelogRoutes }
