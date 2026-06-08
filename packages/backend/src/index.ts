import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { AppContext } from './types'
import { dbMiddleware } from './middleware/db'
import { authRoutes } from './routes/auth.routes'
import { projectRoutes } from './routes/project.routes'
import { issueRoutes } from './routes/issue.routes'
import { milestoneRoutes } from './routes/milestone.routes'
import { boardRoutes } from './routes/board.routes'
import { commentRoutes } from './routes/comment.routes'
import { timelogRoutes } from './routes/timelog.routes'
import { sprintRoutes } from './routes/sprint.routes'
import { webhookRoutes } from './routes/webhook.routes'
import { gitRoutes } from './routes/git.routes'
import { gitWebhookRoutes } from './routes/git-webhook.routes'

const app = new Hono<AppContext>()

app.use('*', async (c, next) => {
  const allowed = c.env.FRONTEND_URL || '*'
  const corsMiddleware = cors({
    origin: (reqOrigin) => {
      if (allowed === '*') return reqOrigin
      if (reqOrigin === allowed) return reqOrigin
      if (reqOrigin.endsWith('.pages.dev') && allowed.endsWith('.pages.dev')) return reqOrigin
      return ''
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
  return corsMiddleware(c, next)
})

app.use('*', dbMiddleware)

app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Webhook routes first — no auth required
app.route('/api/git/webhook', gitWebhookRoutes)
app.route('/api/feishu', webhookRoutes)

// Auth-protected routes
app.route('/api/auth', authRoutes)
app.route('/api/projects', projectRoutes)
app.route('/api', issueRoutes)
app.route('/api', milestoneRoutes)
app.route('/api', boardRoutes)
app.route('/api', commentRoutes)
app.route('/api', timelogRoutes)
app.route('/api', sprintRoutes)
app.route('/api', gitRoutes)

export default app
