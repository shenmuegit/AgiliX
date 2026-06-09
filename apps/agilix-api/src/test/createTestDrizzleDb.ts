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

  const statements = [
    sql`create table projects (id text primary key, code text not null, name text not null, glyph text not null, color text not null, active_iteration_id text not null, cadence text not null, template_key text not null)`,
    sql`create table project_members (project_id text not null, member_id text not null, sort_order integer not null, primary key (project_id, member_id))`,
    sql`create table iterations (id text primary key, project_id text not null, code text not null, name text not null, date_range_label text not null, calendar_title text not null, day integer not null, total_days integer not null, goal text not null, velocity integer not null)`,
    sql`create table iteration_calendar_weeks (id text primary key, iteration_id text not null, sort_order integer not null, label text not null, range_label text not null)`,
    sql`create table iteration_calendar_days (id text primary key, week_id text not null, sort_order integer not null, label text not null)`,
    sql`create table members (id text primary key, name text not null, role text not null, capacity integer not null, online_sort_order integer not null)`,
    sql`create table issues (id text primary key, key text not null, project_id text not null, iteration_id text not null, type text not null, title text not null, status text not null, priority text not null, handler_member_id text not null, story_points integer not null, blocker_reason text, description text not null, acceptance_criteria text not null, epic_name text not null, draft integer not null)`,
    sql`create table issue_events (id text primary key, issue_id text not null, event_type text not null, actor_member_id text not null, message text not null, created_at text not null)`,
    sql`create table issue_labels (issue_id text not null, label text not null, sort_order integer not null, primary key (issue_id, label))`,
    sql`create table issue_collaborators (issue_id text not null, member_id text not null, sort_order integer not null, primary key (issue_id, member_id))`,
    sql`create table documents (id text primary key, scope text not null, project_id text, directory_id text not null, title text not null, content_type text not null, body text not null, editor_member_id text not null, sync_feishu_doc integer not null, created_at text not null, updated_at text not null)`,
    sql`create table document_directories (id text primary key, scope text not null, project_id text, parent_id text, name text not null, sort_order integer not null, created_at text not null, updated_at text not null)`,
    sql`create table document_issue_links (doc_id text not null, issue_id text not null, primary key (doc_id, issue_id))`,
    sql`create table document_comments (id text primary key, doc_id text not null, author_member_id text not null, body text not null, resolved integer not null, created_at text not null)`,
    sql`create table standups (id text primary key, project_id text not null, date text not null, date_label text not null, weekday_label text not null, time_label text not null, calendar_label text not null)`,
    sql`create table standup_items (id text primary key, standup_id text not null, member_id text not null, sort_order integer not null, yesterday_text text not null, today_text text not null, blockers_text text not null)`,
    sql`create table milestones (id text primary key, project_id text not null, iteration_id text not null, title text not null, start_day integer not null, end_day integer not null, status text not null, participant_member_id text not null)`,
    sql`create table feishu_member_profiles (member_id text primary key, open_id text not null, union_id text not null, avatar_url text not null, display_name text not null, last_seen_at text not null)`,
    sql`create table feishu_notifications (id text primary key, trigger text not null, target_group_id text not null, payload_json text not null, status text not null, created_at text not null)`,
    sql`create table feishu_queries (id text primary key, command text not null, response_title text not null, response_body_json text not null, created_at text not null)`,
    sql`create table feishu_groups (id text primary key, project_id text not null, name text not null, purpose text not null, member_count_label text not null, status text not null, sort_order integer not null)`,
    sql`create table feishu_bot_rules (id text primary key, project_id text not null, rule_type text not null, title text not null, description text not null, schedule_label text not null, target_group_id text not null, enabled integer not null, sort_order integer not null)`,
  ]

  for (const statement of statements) db.run(statement)

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
