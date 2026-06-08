import { describe, expect, expectTypeOf, it } from 'vitest'
import { createDbClient } from './client'
import * as schema from './schema'
import type { TransactionDatabase } from './transaction'

describe('AgiliX relational schema', () => {
  it('defines every table needed by the full product', () => {
    expect(Object.keys(schema).sort()).toEqual([
      'docComments',
      'docIssueLinks',
      'documents',
      'feishuNotifications',
      'feishuQueries',
      'issueEvents',
      'issues',
      'iterations',
      'members',
      'milestones',
      'projects',
      'standupItems',
      'standups',
    ])
  })

  it('exposes an explicit transaction-capable database port', () => {
    type Client = ReturnType<typeof createDbClient>

    expectTypeOf<Client>().toEqualTypeOf<TransactionDatabase>()
  })
})
