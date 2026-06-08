import { seedData } from '@agilix/app/domain/fixtures'
import { sql } from 'drizzle-orm'
import { expect, it } from 'vitest'
import { createDrizzleRepository } from './drizzleRepository'
import { createTestDrizzleDb } from './test/createTestDrizzleDb'
import { describeRepositoryConformance } from './test/repositoryConformance'

describeRepositoryConformance('drizzle repository', () => createDrizzleRepository(createTestDrizzleDb()))

it('rejects invalid persisted issue status values', async () => {
  const db = createTestDrizzleDb()
  const repository = createDrizzleRepository(db)
  await repository.seed(seedData)
  db.run(sql`insert into issues (key, project_id, iteration_id, type, title, status, priority, assignee_id, story_points, blocker_reason) values ('BAD-1', 'search', 'search-s24', 'task', 'Bad issue status', 'unknown', 'medium', 'gao', 1, null)`)

  await expect(repository.listIssues({ projectId: 'search', status: 'all', assigneeId: 'all', keyword: '' })).rejects.toThrow()
})

it('rejects invalid persisted issue project ids before applying filters', async () => {
  const db = createTestDrizzleDb()
  const repository = createDrizzleRepository(db)
  await repository.seed(seedData)
  db.corrupt(sql`insert into issues (key, project_id, iteration_id, type, title, status, priority, assignee_id, story_points, blocker_reason) values ('BAD-2', 'missing', 'search-s24', 'task', 'Bad issue project', 'todo', 'medium', 'gao', 1, null)`)

  await expect(repository.listIssues({ projectId: 'search', status: 'all', assigneeId: 'all', keyword: '' })).rejects.toThrow()
})

it('rejects invalid persisted document scopes before applying filters', async () => {
  const db = createTestDrizzleDb()
  const repository = createDrizzleRepository(db)
  await repository.seed(seedData)
  db.run(sql`insert into documents (id, scope, project_id, title, directory, body, updated_at_label) values ('doc-bad-scope', 'unknown', 'data', 'Bad doc scope', '坏数据', 'Bad document scope', '刚刚')`)

  await expect(repository.listDocs({ projectId: 'search', query: '' })).rejects.toThrow()
})

it('rejects invalid persisted planning project ids before applying filters', async () => {
  const db = createTestDrizzleDb()
  const repository = createDrizzleRepository(db)
  await repository.seed(seedData)
  db.corrupt(sql`insert into standups (id, project_id, date_label, time_label) values ('standup-bad-project', 'missing', '星期五', '10:00-10:15')`)
  db.corrupt(sql`insert into milestones (id, project_id, iteration_id, title, start_day, end_day, status, owner_id) values ('milestone-bad-project', 'missing', 'search-s24', 'Bad milestone project', 1, 2, 'planned', 'gao')`)

  await expect(repository.listStandups({ projectId: 'search' })).rejects.toThrow()
  await expect(repository.listMilestones({ projectId: 'search' })).rejects.toThrow()
})

it('rejects invalid persisted Feishu response lines', async () => {
  const db = createTestDrizzleDb()
  const repository = createDrizzleRepository(db)
  await repository.seed(seedData)
  db.run(sql`insert into feishu_queries (id, command, response_title, response_body_json, created_at) values ('query-bad-lines', '/team', '团队状态', '{"line":1}', '2026-06-06T10:01:00.000Z')`)

  await expect(repository.listFeishuQueries()).rejects.toThrow()
})
