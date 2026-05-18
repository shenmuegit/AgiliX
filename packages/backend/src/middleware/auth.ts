import { createMiddleware } from 'hono/factory'
import * as jose from 'jose'
import type { AppContext } from '../types'

export const authMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', message: 'Missing token' }, 401)
  }

  try {
    const token = authHeader.slice(7)
    const secret = new TextEncoder().encode(c.env.JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret)
    c.set('user', {
      userId: payload.userId as string,
      feishuUserId: payload.feishuUserId as string,
      name: payload.name as string,
    })
  } catch {
    return c.json({ error: 'Unauthorized', message: 'Invalid token' }, 401)
  }

  await next()
})
