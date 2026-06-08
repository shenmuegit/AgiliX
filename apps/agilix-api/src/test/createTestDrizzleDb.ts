import Database from 'better-sqlite3'
import { sql, type SQL } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../db/schema'
import { createTransactionDatabase, type TransactionDatabase } from '../db/transaction'

export function createTestDrizzleDb() {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  const run = db.run.bind(db)
  const runBatch = sqlite.transaction((statements: readonly { run(): unknown }[]) =>
    statements.map((statement) => statement.run()),
  )
  const transactionDb = Object.assign(db, {
    batch(queries: readonly unknown[]) {
      return runBatch(queries as readonly { run(): unknown }[])
    },
  })

  db.run(
    sql`create table projects (id text primary key, name text not null, glyph text not null, color text not null, active_iteration_code text not null)`,
  )
  db.run(
    sql`create table members (id text primary key, name text not null, role text not null, capacity integer not null)`,
  )
  db.run(
    sql`create table iterations (id text primary key, project_id text not null references projects(id) on delete cascade, code text not null, name text not null, date_range_label text not null, calendar_title text not null, calendar_weeks_json text not null, day integer not null, total_days integer not null, goal text not null, velocity integer not null, unique(project_id, code))`,
  )
  db.run(
    sql`create table issues (key text primary key, project_id text not null references projects(id) on delete cascade, iteration_id text not null references iterations(id) on delete cascade, type text not null, title text not null, status text not null, priority text not null, assignee_id text not null references members(id), story_points integer not null, blocker_reason text)`,
  )
  db.run(
    sql`create table issue_events (id text primary key, issue_key text not null references issues(key) on delete cascade, type text not null, actor_id text references members(id), message text not null, created_at text not null)`,
  )
  db.run(
    sql`create table documents (id text primary key, scope text not null, project_id text references projects(id) on delete cascade, title text not null, directory text not null, body text not null, updated_at_label text not null)`,
  )
  db.run(
    sql`create table doc_issue_links (doc_id text not null references documents(id) on delete cascade, issue_key text not null references issues(key) on delete cascade, unique(doc_id, issue_key))`,
  )
  db.run(
    sql`create table doc_comments (id text primary key, doc_id text not null references documents(id) on delete cascade, author_id text not null references members(id), body text not null, resolved integer not null, created_at_label text not null)`,
  )
  db.run(
    sql`create table standups (id text primary key, project_id text not null references projects(id) on delete cascade, date_label text not null, weekday_label text not null, time_label text not null, calendar_label text not null)`,
  )
  db.run(
    sql`create table standup_items (id text primary key, standup_id text not null references standups(id) on delete cascade, member_id text not null references members(id), yesterday_json text not null, today_json text not null, blockers_json text not null)`,
  )
  db.run(
    sql`create table milestones (id text primary key, project_id text not null references projects(id) on delete cascade, iteration_id text not null references iterations(id) on delete cascade, title text not null, start_day integer not null, end_day integer not null, status text not null, owner_id text not null references members(id))`,
  )
  db.run(
    sql`create table feishu_notifications (id text primary key, trigger text not null, target_group text not null, payload_json text not null, status text not null, created_at text not null)`,
  )
  db.run(
    sql`create table feishu_queries (id text primary key, command text not null, response_title text not null, response_body_json text not null, created_at text not null)`,
  )

  return Object.assign(createTransactionDatabase(transactionDb as unknown as TransactionDatabase), {
    run(statement: SQL) {
      run(statement)
    },
    corrupt(statement: SQL) {
      sqlite.pragma('foreign_keys = OFF')
      try {
        run(statement)
      } finally {
        sqlite.pragma('foreign_keys = ON')
      }
    },
  })
}
