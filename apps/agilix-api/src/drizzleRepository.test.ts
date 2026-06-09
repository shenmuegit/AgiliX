import { seedData } from '@agilix/app/domain/fixtures'
import { sql } from 'drizzle-orm'
import { expect, it } from 'vitest'
import { createDrizzleRepository } from './drizzleRepository'
import { createTestDrizzleDb } from './test/createTestDrizzleDb'
import { describeRepositoryConformance } from './test/repositoryConformance'

describeRepositoryConformance('drizzle repository', () =>
  createDrizzleRepository(createTestDrizzleDb()),
)

it('rejects invalid persisted issue status values', async () => {
  const db = createTestDrizzleDb()
  const repository = createDrizzleRepository(db)
  await repository.seed(seedData)
  db.run(
    sql`insert into issues (id, key, project_id, iteration_id, type, title, status, priority, handler_member_id, story_points, blocker_reason, description, acceptance_criteria, epic_name, draft)
        select 'bad-issue-status', 'BAD-1', projects.id, iterations.id, 'task', 'Bad issue status', 'unknown', 'medium', members.id, 1, null, '', '', '', 0
        from projects, iterations, members
        limit 1`,
  )

  await expect(
    repository.listIssues({ projectId: 'search', status: 'all', assigneeId: 'all', keyword: '' }),
  ).rejects.toThrow()
})

it('rejects invalid persisted issue project ids before applying filters', async () => {
  const db = createTestDrizzleDb()
  const repository = createDrizzleRepository(db)
  await repository.seed(seedData)
  db.corrupt(
    sql`insert into issues (id, key, project_id, iteration_id, type, title, status, priority, handler_member_id, story_points, blocker_reason, description, acceptance_criteria, epic_name, draft)
        select 'bad-issue-project', 'BAD-2', 'missing', iterations.id, 'task', 'Bad issue project', 'todo', 'medium', members.id, 1, null, '', '', '', 0
        from iterations, members
        limit 1`,
  )

  await expect(
    repository.listIssues({ projectId: 'search', status: 'all', assigneeId: 'all', keyword: '' }),
  ).rejects.toThrow()
})

it('rejects invalid persisted document scopes before applying filters', async () => {
  const db = createTestDrizzleDb()
  const repository = createDrizzleRepository(db)
  await repository.seed(seedData)
  db.run(
    sql`insert into documents (id, scope, project_id, directory_id, title, content_type, body, editor_member_id, sync_feishu_doc, created_at, updated_at)
        select 'doc-bad-scope', 'unknown', projects.id, document_directories.id, 'Bad doc scope', 'markdown', 'Bad document scope', members.id, 0, '刚刚', '刚刚'
        from projects, document_directories, members
        limit 1`,
  )

  await expect(repository.listDocs({ projectId: 'search', query: '' })).rejects.toThrow()
})

it('rejects invalid persisted planning project ids before applying filters', async () => {
  const db = createTestDrizzleDb()
  const repository = createDrizzleRepository(db)
  await repository.seed(seedData)
  db.corrupt(
    sql`insert into standups (id, project_id, date, date_label, weekday_label, time_label, calendar_label) values ('standup-bad-project', 'missing', '2026-06-06', '06 / 06', '星期五', '10:00-10:15', '每日 10:00')`,
  )
  db.corrupt(
    sql`insert into milestones (id, project_id, iteration_id, title, start_day, end_day, status, participant_member_id)
        select 'milestone-bad-project', 'missing', iterations.id, 'Bad milestone project', 1, 2, 'planned', members.id
        from iterations, members
        limit 1`,
  )

  await expect(repository.listStandups({ projectId: 'search' })).rejects.toThrow()
  await expect(repository.listMilestones({ projectId: 'search' })).rejects.toThrow()
})

it('rejects invalid persisted Feishu response lines', async () => {
  const db = createTestDrizzleDb()
  const repository = createDrizzleRepository(db)
  await repository.seed(seedData)
  db.run(
    sql`insert into feishu_queries (id, command, response_title, response_body_json, created_at) values ('query-bad-lines', '/team', '团队状态', '{"line":1}', '2026-06-06T10:01:00.000Z')`,
  )

  await expect(repository.listFeishuQueries()).rejects.toThrow()
})
