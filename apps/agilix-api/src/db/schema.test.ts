import { getTableColumns, getTableName } from 'drizzle-orm'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { createDbClient } from './client'
import * as schema from './schema'
import type { TransactionDatabase } from './transaction'

const requiredTables = {
  projects: ['id', 'code', 'name', 'glyph', 'color', 'activeIterationId', 'cadence', 'templateKey'],
  projectMembers: ['projectId', 'memberId', 'sortOrder'],
  iterations: ['id', 'projectId', 'code', 'name', 'dateRangeLabel', 'calendarTitle', 'day', 'totalDays', 'goal', 'velocity'],
  iterationCalendarWeeks: ['id', 'iterationId', 'sortOrder', 'label', 'rangeLabel'],
  iterationCalendarDays: ['id', 'weekId', 'sortOrder', 'label'],
  members: ['id', 'name', 'role', 'capacity', 'onlineSortOrder'],
  issues: ['id', 'key', 'projectId', 'iterationId', 'type', 'title', 'status', 'priority', 'handlerMemberId', 'storyPoints', 'blockerReason', 'description', 'acceptanceCriteria', 'epicName', 'draft'],
  issueEvents: ['id', 'issueId', 'eventType', 'actorMemberId', 'message', 'createdAt'],
  issueLabels: ['issueId', 'label', 'sortOrder'],
  issueCollaborators: ['issueId', 'memberId', 'sortOrder'],
  documents: ['id', 'scope', 'projectId', 'directoryId', 'title', 'contentType', 'body', 'editorMemberId', 'syncFeishuDoc', 'createdAt', 'updatedAt'],
  documentDirectories: ['id', 'scope', 'projectId', 'parentId', 'name', 'sortOrder', 'createdAt', 'updatedAt'],
  documentIssueLinks: ['docId', 'issueId'],
  documentComments: ['id', 'docId', 'authorMemberId', 'body', 'resolved', 'createdAt'],
  standups: ['id', 'projectId', 'date', 'dateLabel', 'weekdayLabel', 'timeLabel', 'calendarLabel'],
  standupItems: ['id', 'standupId', 'memberId', 'sortOrder', 'yesterdayText', 'todayText', 'blockersText'],
  milestones: ['id', 'projectId', 'iterationId', 'title', 'startDay', 'endDay', 'status', 'participantMemberId'],
  feishuMemberProfiles: ['memberId', 'openId', 'unionId', 'avatarUrl', 'displayName', 'lastSeenAt'],
  feishuNotifications: ['id', 'trigger', 'targetGroupId', 'payloadJson', 'status', 'createdAt'],
  feishuQueries: ['id', 'command', 'responseTitle', 'responseBodyJson', 'createdAt'],
  feishuGroups: ['id', 'projectId', 'name', 'purpose', 'memberCountLabel', 'status', 'sortOrder'],
  feishuBotRules: ['id', 'projectId', 'ruleType', 'title', 'description', 'scheduleLabel', 'targetGroupId', 'enabled', 'sortOrder'],
} as const

describe('AgiliX relational schema', () => {
  it('defines every table and field required by the current frontend contract', () => {
    expect(Object.keys(schema).sort()).toEqual([...Object.keys(requiredTables)].sort())

    for (const [exportName, expectedColumns] of Object.entries(requiredTables)) {
      const table = schema[exportName as keyof typeof schema]
      expect(getTableName(table)).toBe(snakeCase(exportName))
      expect(Object.keys(getTableColumns(table)).sort()).toEqual([...expectedColumns].sort())
    }
  })

  it('does not declare database foreign keys', () => {
    const source = readFileSync(join(process.cwd(), 'src/db/schema.ts'), 'utf8')

    expect(source).not.toContain('.references(')
    expect(source).not.toContain(' references ')
    expect(source).not.toContain('REFERENCES')
  })

  it('exposes an explicit transaction-capable database port', () => {
    type Client = ReturnType<typeof createDbClient>

    expectTypeOf<Client>().toEqualTypeOf<TransactionDatabase>()
  })
})

function snakeCase(value: string) {
  return value.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)
}
