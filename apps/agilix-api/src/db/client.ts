import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'
import { createTransactionDatabase } from './transaction'

export function createDbClient(db: D1Database) {
  return createTransactionDatabase(drizzle(db, { schema }))
}
