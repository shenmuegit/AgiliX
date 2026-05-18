import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { AppContext } from './types'
import { dbMiddleware } from './middleware/db'
import { authRoutes } from './routes/auth.routes'
import { projectRoutes } from './routes/project.routes'
import { issueRoutes } from './routes/issue.routes'
import { sprintRoutes } from './routes/sprint.routes'
import { boardRoutes } from './routes/board.routes'
import { commentRoutes } from './routes/comment.routes'
import { timelogRoutes } from './routes/timelog.routes'
import { webhookRoutes } from './routes/webhook.routes'

const app = new Hono<AppContext>()

app.use('*', async (c, next) => {
  const corsMiddleware = cors({ origin: c.env.FRONTEND_URL || '*', credentials: true })
  return corsMiddleware(c, next)
})

app.use('*', dbMiddleware)

app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.route('/api/auth', authRoutes)
app.route('/api/projects', projectRoutes)
app.route('/api', issueRoutes)
app.route('/api', sprintRoutes)
app.route('/api', boardRoutes)
app.route('/api', commentRoutes)
app.route('/api', timelogRoutes)
app.route('/api/feishu', webhookRoutes)

export default app
