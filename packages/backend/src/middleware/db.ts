import { createMiddleware } from 'hono/factory'
import { createDb } from '../db'
import type { AppContext } from '../types'

export const dbMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const db = createDb(c.env.DB)
  c.set('db', db)
  await next()
})
