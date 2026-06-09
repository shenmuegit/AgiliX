# AgiliX 当前前端数据模型设计

## 目标

重新设计 AgiliX 的数据库表结构和持久化关系，使其严格满足当前前端已经展示的数据、用户操作流程和业务逻辑，同时为文档增加真实的版本系统。

## 硬性约束

- 不改变当前前端用户操作流程。
- 不改变当前前端展示样式。
- 不改变当前前端业务逻辑。
- 不引入权限。
- 不引入审批。
- 不引入负责人或责任人概念。
- 不引入团队概念。
- 不为猜测性的未来协作能力设计数据库。
- 保持 `/api/bootstrap` 与当前前端 `SeedData` 数据形状兼容。
- 保持当前 mutation API 的语义与现有前端调用兼容。

## 产品契约

当前前端是数据模型的唯一真实契约。数据库必须是当前前端已经表达的数据关系的关系型实现，覆盖这些页面和业务面：

- 团队工作台。
- 项目总览。
- 需求与缺陷。
- 看板、表格、时间线视图。
- 迭代统计。
- 文档。
- 成员负载。
- 每日站会。
- 排期甘特。
- 飞书通知和查询命令。

数据库可以比前端数据形状更关系化，但 repository 必须把数据投影回当前前端契约，且不能改变 UI 行为。

## 推荐数据模型

### 项目

`projects` 仍然是顶层项目容器。

必需字段：

- `id`
- `name`
- `glyph`
- `color`
- `active_iteration_id`

关系规则：

- 一个项目有多个迭代。
- 一个项目有多个 Issue。
- 一个项目有多个项目文档。
- 一个项目有多个站会。
- 一个项目有多个里程碑。
- `active_iteration_id` 必须引用同一项目下的迭代。

### 迭代

迭代是项目内单位，不与项目平级。

必需字段：

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

辅助表：

- `iteration_calendar_weeks`

`iteration_calendar_weeks` 必需字段：

- `id`
- `iteration_id`
- `sort_order`
- `label`
- `range_label`

辅助表：

- `iteration_calendar_days`

`iteration_calendar_days` 必需字段：

- `id`
- `week_id`
- `sort_order`
- `label`

当前前端已经把周和日期当成结构化迭代数据展示，因此这里用显式子表替代 JSON 日历字段。

### 成员

成员代表当前前端中可见的人：用于成员负载、站会、Issue 当前处理人、评论作者和在线头像展示。成员不是团队，也不代表权限。

必需字段：

- `id`
- `name`
- `display_name`
- `role`
- `capacity`
- `avatar_url`
- `feishu_open_id`
- `feishu_union_id`
- `online_sort_order`

关系规则：

- Issue 可以引用成员作为当前处理人。
- 评论可以引用成员作为作者。
- 站会条目引用成员。
- 里程碑可以引用成员作为参与者，以兼容当前前端展示，但 UI 不得把它表达为负责人概念。

### Issue

Issue 表示当前前端列表和看板中展示的需求、缺陷、任务和技术事项。

必需字段：

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

关系规则：

- `project_id` 必须引用 Issue 所属项目。
- `iteration_id` 必须引用同一项目下的迭代。
- `handler_member_id` 引用 `members.id`，含义是当前处理人，不是负责人。

辅助表：

- `issue_events`

`issue_events` 必需字段：

- `id`
- `issue_key`
- `event_type`
- `actor_member_id`
- `message`
- `created_at`

保留事件表是因为现有 schema 已经存在 Issue 事件，并且当前 UI 的状态流转、阻塞等概念需要持久化记录。它不是全局动态流。

### 文档

文档必须支持当前前端已经表达的全局/项目范围、目录树、关联 Issue、评论、Markdown 渲染、Mermaid 渲染、Diagram 渲染、脑图渲染，以及新增要求的版本系统。

必需字段：

- `id`
- `scope`
- `project_id`
- `directory_id`
- `title`
- `content_type`
- `current_version_id`
- `created_at`
- `updated_at`

允许的 `scope` 值：

- `global`
- `project`

允许的 `content_type` 值：

- `markdown`
- `mermaid`
- `diagram`
- `mindmap`

关系规则：

- 全局文档不能有 `project_id`。
- 项目文档必须有 `project_id`。
- `directory_id` 必须引用范围和项目匹配的目录。
- `current_version_id` 必须引用该文档当前使用的版本。

### 文档目录

目录必须是一等数据，因为当前前端已经表达了新建目录、重命名、删除、多级选择和目录树行为。

必需字段：

- `id`
- `scope`
- `project_id`
- `parent_id`
- `name`
- `sort_order`
- `created_at`
- `updated_at`

关系规则：

- 全局目录不能有 `project_id`。
- 项目目录必须有 `project_id`。
- 子目录必须与父目录拥有相同的 `scope` 和 `project_id`。
- 当前前端展示的目录路径由祖先目录和 `name` 投影生成。
- 只有目录下没有文档且没有子目录时，才允许删除目录。

### 文档版本

文档版本是必需能力，即使当前前端暂时还没有版本 UI。当前可见的文档正文必须来自文档的当前版本，因此现有前端仍然只看到一个 `body` 字符串。

必需字段：

- `id`
- `doc_id`
- `version_number`
- `body`
- `created_by_member_id`
- `created_at`

关系规则：

- 每个文档至少有一个版本。
- `documents.current_version_id` 引用同一文档下的某一个版本。
- 创建文档时创建版本 `1`。
- 更新文档正文时创建新版本，并移动 `current_version_id`。
- 当前前端投影中的 `Doc.body` 来自当前版本。
- 当前前端投影中的 `Doc.updatedAtLabel` 由 `documents.updated_at` 格式化得到。

### 文档与 Issue 关联

文档与 Issue 的关联保持显式建模。

必需字段：

- `doc_id`
- `issue_key`

关系规则：

- `doc_id` 和 `issue_key` 组合必须唯一。
- 关联关系同时投影为 `Doc.linkedIssueKeys` 和 `Issue.linkedDocIds`。

### 文档评论

文档评论仍然只归属于文档。

必需字段：

- `id`
- `doc_id`
- `author_member_id`
- `body`
- `resolved`
- `created_at`

投影规则：

- `author_member_id` 投影为当前前端的 `authorId`。
- `created_at` 投影为当前前端的 `createdAtLabel`。

### 站会

站会保持项目维度，用于支持当前每日站会页面。

必需字段：

- `id`
- `project_id`
- `date`
- `date_label`
- `weekday_label`
- `time_label`
- `calendar_label`

辅助表：

- `standup_items`

`standup_items` 必需字段：

- `id`
- `standup_id`
- `member_id`
- `sort_order`
- `yesterday_text`
- `today_text`
- `blockers_text`

投影规则：

- 文本字段按行拆分后投影为当前前端需要的字符串数组。
- 空文本投影为空数组。

### 里程碑

里程碑保持项目和迭代维度，用于当前排期甘特页面。

必需字段：

- `id`
- `project_id`
- `iteration_id`
- `title`
- `start_day`
- `end_day`
- `status`
- `participant_member_id`

关系规则：

- `iteration_id` 必须引用同一项目下的迭代。
- `participant_member_id` 引用成员，用于兼容当前前端展示，不代表负责人。

投影规则：

- 在单独批准前端契约改名之前，`participant_member_id` 投影为现有前端字段 `ownerId`。

### 飞书

飞书数据必须支持当前通知按钮、查询命令按钮和在线成员身份展示。

必需表：

- `feishu_member_profiles`

必需字段：

- `member_id`
- `open_id`
- `union_id`
- `avatar_url`
- `display_name`
- `last_seen_at`

必需表：

- `feishu_notifications`

必需字段：

- `id`
- `trigger`
- `target_group`
- `payload_json`
- `status`
- `created_at`

必需表：

- `feishu_queries`

必需字段：

- `id`
- `command`
- `response_title`
- `response_body_json`
- `created_at`

投影规则：

- 当前前端的 `feishu.groups`、`feishu.queryCommands` 和 `feishu.notificationTriggers` 继续由 repository 投影提供。
- 成员头像和展示名投影进当前成员数据，不改变页面布局。

## API 兼容性

现有 API 路由语义保持稳定：

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

repository 可以使用新的内部表，但路由 payload 必须继续接受当前前端 client 的数据契约。

## 投影契约

repository 必须输出当前前端需要的数据形状：

- `Project.activeIterationCode` 由 `projects.active_iteration_id -> iterations.code` 派生。
- `Iteration.calendarWeeks` 由 `iteration_calendar_weeks` 和 `iteration_calendar_days` 组装。
- `Issue.assigneeId` 由 `issues.handler_member_id` 投影。
- `Issue.linkedDocIds` 由 `document_issue_links` 组装。
- `Doc.directory` 由 `doc_directories` 祖先路径派生。
- `Doc.body` 通过 `documents.current_version_id` 从 `document_versions` 读取。
- `Doc.linkedIssueKeys` 由 `document_issue_links` 组装。
- `Doc.comments` 由 `doc_comments` 组装。
- `Doc.updatedAtLabel` 由 `documents.updated_at` 派生。
- `DocComment.authorId` 由 `doc_comments.author_member_id` 投影。
- `DocComment.createdAtLabel` 由 `doc_comments.created_at` 派生。
- `Milestone.ownerId` 仅为兼容，由 `milestones.participant_member_id` 投影。

## 测试策略

实施必须 TDD 先行。

必须覆盖的红绿循环：

- schema 测试证明新表和关系存在。
- repository conformance 测试证明 seed、load、创建项目、移动 Issue、创建文档、创建文档版本、创建评论、保存站会、保存里程碑、飞书通知和飞书查询都能正确持久化。
- API 测试证明现有路由 payload 和响应形状保持兼容。
- 前端 route 测试证明当前页面继续渲染，行为不变。
- 视觉审计证明当前样式不变。
- 真实 API e2e 测试证明不使用 Playwright API mock。

## 非目标

- 不做权限模型。
- 不做审批流。
- 不做负责人或责任人模型。
- 不做团队模型。
- 不做 UI 重设计。
- 不做前端操作流程重设计。
- 不做猜测性的协作动态流。
- 不做超出当前文档创建和评论行为之外的文档编辑 UI。

## 实施说明

- 当前前端已经把某些数据当作结构化行使用时，实施可以从 JSON 字段迁移为规范化子表。
- 在单独批准前端契约变更前，API 投影边界必须保留 `assigneeId`、`ownerId` 等兼容字段名。
- 即使当前前端只消费当前文档正文，版本系统也必须在持久化层真实存在。
