# AgiliX Full Product Master Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full AgiliX small-team work management product from the current `原型/` screens, with shared persistence and TDD before every behavior change.

**Architecture:** Do not continue the old formal `packages/frontend` and `packages/backend` path for this work. Create a lean but complete app under `apps/agilix` plus a thin API under `apps/agilix-api`; React screens talk to typed API clients, API routes validate with Zod, and persistence uses relational SQLite/D1-compatible tables. AgiliX remains the source of truth; Feishu is one-team notification and query only.

**Tech Stack:** pnpm workspace, TypeScript, React, Vite, Vitest, Testing Library, Playwright, Hono, Zod, Drizzle ORM, SQLite/D1-compatible persistence, CSS copied from the prototype design system.

---

## Product Decisions

- The user target is a 5-10 person team.
- The product does not need permissions, approval flow, or multiple Feishu groups.
- Projects are filters and reporting dimensions, not separate workspaces.
- The primary navigation is flat: `团队工作台`, `项目总览`, `Issues`, `看板`, `迭代统计`, `文档`, `成员负载`, `每日站会`, `排期甘特`, `飞书`.
- Each detailed function can filter by project, iteration, assignee, status, and keyword where useful.
- AgiliX owns data entry and editing. Feishu only receives notifications and answers query commands.
- Full scope includes all prototype-backed modules, not a reduced slice.
- No fallback behavior is allowed. Protocol values, payload shapes, query parameters, and project-scoped page state must be explicitly modeled, validated, or rejected.
- The legacy `packages/frontend`, `packages/backend`, and `packages/shared` code path is excluded from this product line: do not import it, deploy it, or treat its defaults and integrations as acceptable behavior for the new `apps/agilix` implementation. If that path is revived later, it needs a separate no-fallback cleanup plan before use.

## Prototype Coverage

- `原型/screen-team.html`: team workbench, attention list, completion, pending issues, recent docs, Feishu examples.
- `原型/screen-projects.html`: project portfolio, active iterations, completion, members, issue counts, velocity.
- `原型/screen-ledger.html`: requirements and defects ledger.
- `原型/screen-kanban.html`: board lanes, cards, status, assignees, review, Feishu tag.
- `原型/screen-stats.html`: iteration statistics, burndown, velocity, distribution.
- `原型/screen-docs.html`: global/project documents, directory, search, comments, linked issues.
- `原型/screen-workload.html`: member workload, capacity, assigned issues.
- `原型/screen-standup.html`: daily standup, yesterday/today/blockers, Feishu daily notification.
- `原型/screen-gantt.html`: schedule, milestones, timeline.
- `原型/shell.js`: shared navigation and project list.

## Data Model

Use relational tables rather than a single JSON snapshot:

- `projects`: project id, name, color, glyph, active iteration code.
- `members`: member id, name, role, capacity.
- `iterations`: iteration id, project id, code, name, day, total days, goal, velocity.
- `issues`: key, project id, iteration id, title, type, status, priority, assignee, story points, blocker reason.
- `issue_events`: issue key, event type, actor, message, created time.
- `documents`: doc id, scope, project id, title, directory path, body, updated label.
- `doc_issue_links`: doc id, issue key.
- `doc_comments`: comment id, doc id, author, body, resolved, created label.
- `standups`: standup id, project id, date label, time label.
- `standup_items`: standup id, member id, yesterday, today, blockers.
- `milestones`: milestone id, project id, iteration id, title, start day, end day, status, owner.
- `feishu_notifications`: notification id, trigger, target group, trigger-specific payload, status, created time.
- `feishu_queries`: query id, command, response title, response body, created time.

## File Structure

- Create `apps/agilix/package.json`: app scripts and dependencies.
- Create `apps/agilix/vite.config.ts`: Vite and Vitest config.
- Create `apps/agilix/index.html`: Vite entry.
- Create `apps/agilix/src/main.tsx`: React bootstrap.
- Create `apps/agilix/src/App.tsx`: route shell and navigation state.
- Create `apps/agilix/src/domain/types.ts`: domain types.
- Create `apps/agilix/src/domain/fixtures.ts`: deterministic seed data from prototypes.
- Create `apps/agilix/src/domain/issues.ts`: issue filters, status moves, board grouping.
- Create `apps/agilix/src/domain/docs.ts`: directory tree, search, comments, links.
- Create `apps/agilix/src/domain/workbench.ts`: attention summary and current team snapshot.
- Create `apps/agilix/src/domain/iterations.ts`: completion, burndown, velocity, distribution.
- Create `apps/agilix/src/domain/workload.ts`: member capacity and load calculations.
- Create `apps/agilix/src/domain/standup.ts`: daily standup summary.
- Create `apps/agilix/src/domain/gantt.ts`: schedule rows, milestones, date window.
- Create `apps/agilix/src/domain/feishu.ts`: command parser, reply builder, notification builder.
- Create `apps/agilix/src/api/client.ts`: typed browser API client.
- Create `apps/agilix/src/components/Shell.tsx`: flat navigation and shared layout.
- Create `apps/agilix/src/components/ProjectFilter.tsx`: project filter control.
- Create `apps/agilix/src/routes/TeamPage.tsx`: team workbench.
- Create `apps/agilix/src/routes/ProjectsPage.tsx`: project overview.
- Create `apps/agilix/src/routes/IssuesPage.tsx`: work item ledger.
- Create `apps/agilix/src/routes/BoardPage.tsx`: Kanban board.
- Create `apps/agilix/src/routes/StatsPage.tsx`: iteration statistics.
- Create `apps/agilix/src/routes/DocsPage.tsx`: document management.
- Create `apps/agilix/src/routes/WorkloadPage.tsx`: member workload.
- Create `apps/agilix/src/routes/StandupPage.tsx`: daily standup.
- Create `apps/agilix/src/routes/GanttPage.tsx`: schedule gantt.
- Create `apps/agilix/src/routes/FeishuPage.tsx`: notification and query simulator.
- Create `apps/agilix/src/styles/agilix.css`: prototype visual baseline.
- Create `apps/agilix/src/test/createInMemoryClient.ts`: UI persistence test client.
- Create `apps/agilix/e2e/full-flow.spec.ts`: browser smoke and workflow checks.
- Create `apps/agilix-api/package.json`: API scripts and dependencies.
- Create `apps/agilix-api/src/app.ts`: Hono app factory.
- Create `apps/agilix-api/src/schema.ts`: request validation schemas.
- Create `apps/agilix-api/src/repository.ts`: repository interface.
- Create `apps/agilix-api/src/db/schema.ts`: Drizzle SQLite/D1 schema.
- Create `apps/agilix-api/src/db/client.ts`: D1 Drizzle client factory.
- Create `apps/agilix-api/src/drizzleRepository.ts`: Drizzle repository implementation.
- Create `apps/agilix-api/drizzle.config.ts`: Drizzle migration config.
- Create `apps/agilix-api/src/seed.ts`: seed import from prototype fixtures.
- Create `apps/agilix-api/src/test/createTestDrizzleDb.ts`: repository test database.
- Create `apps/agilix-api/src/test/memoryRepository.ts`: API route test repository.

## Global TDD Rule

Every task follows this loop:

1. Write one failing test for one visible behavior.
2. Run that test and confirm it fails for the expected reason.
3. Write the smallest code that makes it pass.
4. Run the focused test and the package test suite.
5. Refactor only after green.

No production code is written before its failing test.

## Detailed Phase Plans

This master roadmap defines the full product scope and sequencing. The work is executed through smaller TDD plans so each plan remains reviewable and directly actionable:

- Phase 1: [Foundation and Domain Plan](./2026-06-06-agilix-phase-1-foundation-domain-plan.md) — app scaffold, shared types, prototype fixtures, pure domain behavior, shell.
- Phase 2: [Persistence and API Plan](./2026-06-06-agilix-phase-2-persistence-api-plan.md) — Drizzle schema, repository, seed import, validated Hono routes.
- Phase 3: [Core Workflows Plan](./2026-06-06-agilix-phase-3-core-workflows-plan.md) — workbench, project overview, Issues ledger, Kanban.
- Phase 4: [Planning Views Plan](./2026-06-06-agilix-phase-4-planning-views-plan.md) — iteration stats, workload, standup, gantt.
- Phase 5: [Documents and Feishu Plan](./2026-06-06-agilix-phase-5-docs-feishu-plan.md) — full document management, comments, linked issues, one-group Feishu notification/query.
- Phase 6: [App Wiring and Browser QA Plan](./2026-06-06-agilix-phase-6-app-wiring-browser-qa-plan.md) — API client wiring, persistent mutations, browser workflow coverage.

## Roadmap Sequence

### Phase 1: Foundation and Domain

Detailed plan: [Foundation and Domain Plan](./2026-06-06-agilix-phase-1-foundation-domain-plan.md)

Deliverables:
- New `apps/agilix` package in the workspace.
- Full flat navigation shell.
- Typed seed data covering every prototype module.
- Pure domain modules for Issues, docs, workbench, iterations, workload, standup, gantt, and Feishu replies.

Exit evidence:
- `pnpm --filter @agilix/app test` passes.
- `pnpm --filter @agilix/app build` passes.
- No references to permissions, approval flow, multiple Feishu groups, or project-first workspaces appear in app shell tests.

### Phase 2: Persistence and API

Detailed plan: [Persistence and API Plan](./2026-06-06-agilix-phase-2-persistence-api-plan.md)

Deliverables:
- New `apps/agilix-api` package.
- Drizzle SQLite/D1 schema for projects, members, iterations, issues, issue events, documents, doc links, doc comments, standups, standup items, milestones, Feishu notifications, and Feishu queries.
- Repository contract and Drizzle implementation.
- Seed import from Phase 1 fixtures.
- Hono API routes with Zod validation.

Exit evidence:
- API repository tests prove data survives reload-like repository recreation.
- API route tests cover every product module endpoint.
- Invalid mutation payloads return validation errors.

### Phase 3: Core Workflows

Detailed plan: [Core Workflows Plan](./2026-06-06-agilix-phase-3-core-workflows-plan.md)

Deliverables:
- Team workbench route.
- Project overview route.
- Issues ledger route with project/status/assignee/keyword filters.
- Kanban route with status moves.

Exit evidence:
- UI tests prove team attention, project portfolio, filtered ledger, and board moves.
- API-backed mutation tests prove Issue changes persist through the repository.

### Phase 4: Planning and Reporting Views

Detailed plan: [Planning Views Plan](./2026-06-06-agilix-phase-4-planning-views-plan.md)

Deliverables:
- Iteration statistics route.
- Member workload route.
- Daily standup route.
- Gantt schedule route.

Exit evidence:
- UI tests prove each reporting view renders from shared domain/API data.
- Standup save and milestone save mutations persist.
- Derived metrics match the pure domain calculation tests.

### Phase 5: Documents and Feishu

Detailed plan: [Documents and Feishu Plan](./2026-06-06-agilix-phase-5-docs-feishu-plan.md)

Deliverables:
- Full document management route with global/project directories, search, detail, linked issues, comments, and new document action.
- Feishu route with one-group notification record action and query command simulator.
- API mutations for document creation, document comments, Feishu query records, and Feishu notification records.

Exit evidence:
- UI tests prove doc search, comment creation, linked issue display, and one-group Feishu behavior.
- API tests prove document creation, comments, Feishu query logs, and Feishu notification records persist.
- Tests continue to exclude approval flow, permissions, and multi-group Feishu.

### Phase 6: App Wiring and Browser QA

Detailed plan: [App Wiring and Browser QA Plan](./2026-06-06-agilix-phase-6-app-wiring-browser-qa-plan.md)

Deliverables:
- Typed app API client wired into `App`.
- Persistent state refresh after Issue moves, doc comments, standup saves, and milestone saves; Feishu notification recording and queries go through the API client.
- Playwright browser workflow coverage for all top-level modules.

Exit evidence:
- `pnpm --filter @agilix/app test` passes.
- `pnpm --filter @agilix/api test` passes.
- `pnpm --filter @agilix/app e2e` passes.
- Browser checks cover navigation, docs, board, planning views, Feishu notification recording, and Feishu query behavior.

## Verification Matrix

- Unit domain tests: `pnpm --filter @agilix/app test -- src/domain`
- API tests: `pnpm --filter @agilix/api test`
- UI tests: `pnpm --filter @agilix/app test`
- Browser tests: `pnpm --filter @agilix/app e2e`
- Full workspace build: `pnpm --filter @agilix/app build`

## Exclusions

- No permission model.
- No approval flow.
- No multiple Feishu groups.
- No Feishu-side editing as source of truth.
- No project-first workspace split.

## Self-Review

- Spec coverage: Every current prototype screen is mapped to at least one implementation task.
- Scope check: This is a full product plan for the small-team version, not a reduced slice.
- TDD check: Every task starts with a concrete failing test and RED command.
- Persistence check: The plan uses relational persistence instead of a temporary snapshot.
- Complexity check: Full scope includes all product modules, while still excluding permissions, approvals, multi-group Feishu, and project-first workspaces per user direction.
- Placeholder scan: No unresolved placeholder markers or unfilled sections remain.
