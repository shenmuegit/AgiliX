import { Hono } from 'hono'
import * as jose from 'jose'
import { eq } from 'drizzle-orm'
import { schema } from '../db'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'

const app = new Hono<AppContext>()

app.post('/feishu/callback', async (c) => {
  const { code } = await c.req.json<{ code: string }>()
  const db = c.get('db')

  // Exchange code for access token
  const tokenRes = await fetch('https://open.feishu.cn/open-apis/authen/v1/oidc/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getTenantToken(c.env.FEISHU_APP_ID, c.env.FEISHU_APP_SECRET)}`,
    },
    body: JSON.stringify({ grant_type: 'authorization_code', code }),
  })
  const tokenData = await tokenRes.json() as { code: number; data?: { access_token: string } }

  if (tokenData.code !== 0 || !tokenData.data) {
    return c.json({ error: 'Auth failed', message: 'Invalid Feishu auth code' }, 401)
  }

  // Get user info
  const userRes = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
    headers: { Authorization: `Bearer ${tokenData.data.access_token}` },
  })
  const userData = await userRes.json() as {
    code: number
    data?: { open_id: string; union_id?: string; name?: string; email?: string; avatar_url?: string }
  }

  if (userData.code !== 0 || !userData.data) {
    return c.json({ error: 'Auth failed', message: 'Failed to get user info' }, 401)
  }

  const feishuUser = userData.data
  const now = new Date().toISOString()

  // Upsert user
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.feishuUserId, feishuUser.open_id),
  })

  let user
  if (existing) {
    ;[user] = await db.update(schema.users)
      .set({
        name: feishuUser.name || existing.name,
        email: feishuUser.email || existing.email,
        avatarUrl: feishuUser.avatar_url || existing.avatarUrl,
        feishuUnionId: feishuUser.union_id || existing.feishuUnionId,
        updatedAt: now,
      })
      .where(eq(schema.users.id, existing.id))
      .returning()
  } else {
    ;[user] = await db.insert(schema.users)
      .values({
        feishuUserId: feishuUser.open_id,
        feishuUnionId: feishuUser.union_id,
        name: feishuUser.name || 'Unknown',
        email: feishuUser.email,
        avatarUrl: feishuUser.avatar_url,
      })
      .returning()
  }

  const secret = new TextEncoder().encode(c.env.JWT_SECRET)
  const token = await new jose.SignJWT({
    userId: user.id,
    feishuUserId: user.feishuUserId,
    name: user.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(secret)

  return c.json({ data: { token, user } })
})

// Dev-only: login as demo user without Feishu
app.post('/dev-login', async (c) => {
  const db = c.get('db')
  let user = await db.query.users.findFirst({
    where: eq(schema.users.feishuUserId, 'demo_user'),
  })
  if (!user) {
    ;[user] = await db.insert(schema.users)
      .values({ feishuUserId: 'demo_user', name: 'Demo User', email: 'demo@agilix.dev' })
      .returning()
  }

  const secret = new TextEncoder().encode(c.env.JWT_SECRET)
  const token = await new jose.SignJWT({
    userId: user.id,
    feishuUserId: user.feishuUserId,
    name: user.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(secret)

  return c.json({ data: { token, user } })
})

app.get('/me', authMiddleware, async (c) => {
  const db = c.get('db')
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, c.get('user').userId),
  })
  return c.json({ data: user })
})

async function getTenantToken(appId: string, appSecret: string): Promise<string> {
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  })
  const data = await res.json() as { tenant_access_token: string }
  return data.tenant_access_token
}

export { app as authRoutes }
