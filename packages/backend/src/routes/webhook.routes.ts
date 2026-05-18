import { Hono } from 'hono'
import type { AppContext } from '../types'

const app = new Hono<AppContext>()

app.post('/events', async (c) => {
  const body = await c.req.json<Record<string, unknown>>()

  if (body.type === 'url_verification') {
    return c.json({ challenge: body.challenge })
  }

  // TODO: Process Feishu events
  console.log('Feishu event:', JSON.stringify(body))
  return c.json({ ok: true })
})

app.post('/card', async (c) => {
  const body = await c.req.json<Record<string, unknown>>()

  // TODO: Handle interactive card callbacks
  console.log('Feishu card callback:', JSON.stringify(body))
  return c.json({})
})

export { app as webhookRoutes }
