import type { DrizzleD1Database } from 'drizzle-orm/d1'
import * as schema from './schema'

type DrizzleDatabase = DrizzleD1Database<typeof schema>

export type RepositoryTx = Pick<DrizzleDatabase, 'select' | 'insert' | 'update' | 'delete'>

export type TransactionDatabase = RepositoryTx & Pick<DrizzleDatabase, 'batch'>

export function createTransactionDatabase(db: TransactionDatabase): TransactionDatabase {
  return db
}
