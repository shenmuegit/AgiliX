# AgiliX Current Frontend Data Model Design

## Goal

Redesign the AgiliX database schema and persistence relationships so they strictly satisfy the current frontend's displayed data, user flows, and business logic, while adding document versions as a persisted document capability.

## Hard Constraints

- Do not change current frontend user operation flows.
- Do not change current frontend display style.
- Do not change current frontend business logic.
- Do not introduce permissions.
- Do not introduce approvals.
- Do not introduce owner or responsible-person concepts.
- Do not introduce team concepts.
- Do not design for speculative future collaboration features.
- Keep `/api/bootstrap` compatible with the current frontend `SeedData` shape.
- Keep current mutation semantics compatible with existing frontend calls.

## Product Contract

The current frontend is the source of truth. The database must be a relational expression of the data already represented by these frontend surfaces:

- Team workbench.
- Project overview.
- Issues and defects.
- Board, table, and timeline views.
- Iteration statistics.
- Documents.
- Member workload.
- Daily standup.
- Gantt schedule.
- Feishu notifications and query commands.

The database may be more normalized than the frontend data shape, but the repository must project data back into the current frontend contract without changing UI behavior.

## Recommended Data Model

### Projects

`projects` remains the top-level project container.

Required fields:

- `id`
- `name`
- `glyph`
- `color`
- `active_iteration_id`

Relationship rules:

- A project has many iterations.
- A project has many issues.
- A project has many project-scoped documents.
- A project has many standups.
- A project has many milestones.
- `active_iteration_id` must reference an iteration belonging to the same project.

### Iterations

Iterations are project-internal units, not peers of projects.

Required fields:

- `id`
- `project_id`
- `code`
- `name`
- `date_range_label`
- `calendar_title`
- `day`
- `total_days`
- `goal`
- `velocity`

Supporting table:

- `iteration_calendar_weeks`

`iteration_calendar_weeks` required fields:

- `id`
- `iteration_id`
- `sort_order`
- `label`
- `range_label`

Supporting table:

- `iteration_calendar_days`

`iteration_calendar_days` required fields:

- `id`
- `week_id`
- `sort_order`
- `label`

This replaces JSON calendar storage with explicit rows because the current frontend treats weeks and days as structured iteration data.

### Members

Members represent people visible in workload, standup, issue handling, comments, and online avatar display. They are not teams and do not imply permissions.

Required fields:

- `id`
- `name`
- `display_name`
- `role`
- `capacity`
- `avatar_url`
- `feishu_open_id`
- `feishu_union_id`
- `online_sort_order`

Relationship rules:

- Issues can reference a member as current handler.
- Comments can reference a member as author.
- Standup items reference members.
- Milestones can reference a member as participant for current frontend compatibility, but UI must not present this as an owner concept.

### Issues

Issues represent需求、缺陷、任务、技术事项 exactly as current frontend boards and lists display them.

Required fields:

- `key`
- `project_id`
- `iteration_id`
- `type`
- `title`
- `status`
- `priority`
- `handler_member_id`
- `story_points`
- `blocker_reason`

Relationship rules:

- `project_id` must reference the issue's project.
- `iteration_id` must reference an iteration in the same project.
- `handler_member_id` references `members.id` and is a current handler, not a responsible owner.

Supporting table:

- `issue_events`

`issue_events` required fields:

- `id`
- `issue_key`
- `event_type`
- `actor_member_id`
- `message`
- `created_at`

Events are retained because the existing schema already has issue events, and current UI concepts such as status movement and blockers need a durable audit trail. They are not a global activity feed.

### Documents

Documents must support the current frontend's global/project scopes, directory tree, linked issues, comments, Markdown rendering, Mermaid rendering, diagram rendering, mindmap rendering, and the newly required version system.

Required fields:

- `id`
- `scope`
- `project_id`
- `directory_id`
- `title`
- `content_type`
- `current_version_id`
- `created_at`
- `updated_at`

Allowed `scope` values:

- `global`
- `project`

Allowed `content_type` values:

- `markdown`
- `mermaid`
- `diagram`
- `mindmap`

Relationship rules:

- Global documents must not have `project_id`.
- Project documents must have `project_id`.
- `directory_id` must reference a directory with matching scope and project.
- `current_version_id` must reference the latest active document version for that document.

### Document Directories

Directories are first-class data because the current frontend expresses create, rename, delete, multi-level selection, and directory tree behavior.

Required fields:

- `id`
- `scope`
- `project_id`
- `parent_id`
- `name`
- `sort_order`
- `created_at`
- `updated_at`

Relationship rules:

- Global directories must not have `project_id`.
- Project directories must have `project_id`.
- Child directories must share the same `scope` and `project_id` as their parent.
- Directory path shown to the current frontend is projected from ancestors and `name`.
- Deleting a directory is allowed only when no document or child directory remains under it.

### Document Versions

Document versions are required even though the current frontend does not yet expose a version UI. The current visible document body must come from the document's current version so the existing frontend still sees one `body` string.

Required fields:

- `id`
- `doc_id`
- `version_number`
- `body`
- `created_by_member_id`
- `created_at`

Relationship rules:

- Each document has one or more versions.
- `documents.current_version_id` references one version belonging to the same document.
- Creating a document creates version `1`.
- Updating document body creates a new version and moves `current_version_id`.
- The current frontend projection exposes `Doc.body` from the current version.
- The current frontend projection exposes `Doc.updatedAtLabel` by formatting `documents.updated_at`.

### Document Issue Links

Document-to-Issue links remain explicit.

Required fields:

- `doc_id`
- `issue_key`

Relationship rules:

- The pair must be unique.
- Links project into both `Doc.linkedIssueKeys` and `Issue.linkedDocIds`.

### Document Comments

Document comments remain scoped to documents.

Required fields:

- `id`
- `doc_id`
- `author_member_id`
- `body`
- `resolved`
- `created_at`

Projection rules:

- `author_member_id` projects to current frontend `authorId`.
- `created_at` projects to current frontend `createdAtLabel`.

### Standups

Standups remain project-scoped and support the current daily standup page.

Required fields:

- `id`
- `project_id`
- `date`
- `date_label`
- `weekday_label`
- `time_label`
- `calendar_label`

Supporting table:

- `standup_items`

`standup_items` required fields:

- `id`
- `standup_id`
- `member_id`
- `sort_order`
- `yesterday_text`
- `today_text`
- `blockers_text`

Projection rules:

- Text fields project to the current frontend string arrays by splitting stored lines.
- Empty text projects to an empty array.

### Milestones

Milestones remain project and iteration scoped for the current Gantt page.

Required fields:

- `id`
- `project_id`
- `iteration_id`
- `title`
- `start_day`
- `end_day`
- `status`
- `participant_member_id`

Relationship rules:

- `iteration_id` must reference an iteration in the same project.
- `participant_member_id` references a member for current frontend display compatibility, not ownership.

Projection rules:

- `participant_member_id` projects to the existing frontend `ownerId` field until the frontend contract is renamed in a separate approved change.

### Feishu

Feishu data must support the current notification buttons, command query buttons, and online member identity display.

Required table:

- `feishu_member_profiles`

Required fields:

- `member_id`
- `open_id`
- `union_id`
- `avatar_url`
- `display_name`
- `last_seen_at`

Required table:

- `feishu_notifications`

Required fields:

- `id`
- `trigger`
- `target_group`
- `payload_json`
- `status`
- `created_at`

Required table:

- `feishu_queries`

Required fields:

- `id`
- `command`
- `response_title`
- `response_body_json`
- `created_at`

Projection rules:

- Current frontend `feishu.groups`, `feishu.queryCommands`, and `feishu.notificationTriggers` remain available from repository projection.
- Member avatar and display name are projected into current member data without changing page layout.

## API Compatibility

Existing API routes remain semantically stable:

- `GET /api/bootstrap`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/issues`
- `PATCH /api/issues/:key/status`
- `GET /api/docs`
- `POST /api/docs`
- `GET /api/docs/:id`
- `POST /api/docs/:id/comments`
- `GET /api/standups`
- `PUT /api/standups/:id`
- `GET /api/milestones`
- `PUT /api/milestones/:id`
- `POST /api/feishu/query`
- `POST /api/feishu/notifications`

The repository may use new internal tables, but route payloads must continue to accept the current frontend client contract.

## Projection Contract

The repository must expose current frontend shapes:

- `Project.activeIterationCode` is derived from `projects.active_iteration_id -> iterations.code`.
- `Iteration.calendarWeeks` is assembled from `iteration_calendar_weeks` and `iteration_calendar_days`.
- `Issue.assigneeId` is projected from `issues.handler_member_id`.
- `Issue.linkedDocIds` is assembled from `document_issue_links`.
- `Doc.directory` is derived from `doc_directories` ancestor path.
- `Doc.body` is read from `document_versions` through `documents.current_version_id`.
- `Doc.linkedIssueKeys` is assembled from `document_issue_links`.
- `Doc.comments` is assembled from `doc_comments`.
- `Doc.updatedAtLabel` is derived from `documents.updated_at`.
- `DocComment.authorId` is projected from `doc_comments.author_member_id`.
- `DocComment.createdAtLabel` is derived from `doc_comments.created_at`.
- `Milestone.ownerId` is projected from `milestones.participant_member_id` for compatibility only.

## Test Strategy

Implementation must be TDD-first.

Required red-green coverage:

- Schema tests prove the new tables and relations exist.
- Repository conformance tests prove seed, load, create project, move issue, create document, document version creation, comment creation, standup save, milestone save, Feishu notification, and Feishu query all persist correctly.
- API tests prove existing route payloads and response shapes stay compatible.
- Frontend route tests prove current pages continue to render without behavior changes.
- Visual audit proves current style remains unchanged.
- Real API e2e tests prove no Playwright API mocks are used.

## Non-Goals

- No permission model.
- No approval flow.
- No owner or responsible-person model.
- No team model.
- No UI redesign.
- No frontend operation-flow redesign.
- No speculative collaboration feed.
- No document editing UI beyond current document creation and comment behavior.

## Open Implementation Notes

- The implementation can migrate from JSON fields to normalized child tables where the current frontend already treats data as structured rows.
- The implementation must keep compatibility names such as `assigneeId` and `ownerId` at the API projection boundary until a separate frontend contract change is explicitly approved.
- The version system must be real in persistence even if the current frontend only consumes the current document body.
