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
- 不使用数据库外键；所有数据关系由 repository 在事务中通过程序逻辑校验。
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
- `active_iteration_id` 存储当前迭代 id；repository 必须在创建、更新和 seed 事务中校验该迭代属于同一项目。

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
- `role`
- `capacity`
- `online_sort_order`

关系规则：

- Issue 可以存储成员 id 作为当前处理人。
- 评论可以存储成员 id 作为作者。
- 站会条目存储成员 id。
- 里程碑可以存储成员 id 作为参与者，以兼容当前前端展示，但 UI 不得把它表达为负责人概念。

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

- `project_id` 存储 Issue 所属项目 id；repository 必须在事务中校验项目存在。
- `iteration_id` 存储迭代 id；repository 必须在事务中校验该迭代属于同一项目。
- `handler_member_id` 存储成员 id，含义是当前处理人，不是负责人；repository 必须在事务中校验成员存在。

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
- `diagram`
- `mindmap`

关系规则：

- 全局文档不能有 `project_id`。
- 项目文档必须有 `project_id`。
- `directory_id` 存储目录 id；repository 必须在事务中校验目录范围和项目与文档匹配。
- `current_version_id` 存储当前版本 id；repository 必须在事务中校验该版本属于同一文档。

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
- 子目录的 `parent_id` 存储父目录 id；repository 必须在事务中校验父子目录拥有相同的 `scope` 和 `project_id`。
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
- `documents.current_version_id` 存储同一文档下的某一个版本 id，由 repository 在事务中校验。
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

- `iteration_id` 存储迭代 id；repository 必须在事务中校验该迭代属于同一项目。
- `participant_member_id` 存储成员 id，用于兼容当前前端展示，不代表负责人；repository 必须在事务中校验成员存在。

投影规则：

- 在单独批准前端契约改名之前，`participant_member_id` 投影为现有前端字段 `ownerId`。

### 飞书

飞书数据必须支持当前通知按钮、查询命令按钮和在线成员身份展示。飞书身份字段只存储在 `feishu_member_profiles`，`members` 不重复存储飞书 open id、union id、头像或飞书昵称。

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

## 关系校验策略

数据库表不声明任何外键。所有跨表关系必须由 repository 在事务中校验，并在校验失败时拒绝整次写入。

必须由程序逻辑校验的关系：

- 项目的 `active_iteration_id` 必须指向同一项目下的迭代。
- 迭代日历周必须归属于存在的迭代。
- 迭代日历日必须归属于存在的迭代周。
- Issue 的 `project_id` 必须存在。
- Issue 的 `iteration_id` 必须归属于同一项目。
- Issue 的 `handler_member_id` 必须存在。
- 文档目录的父目录必须存在，且 `scope` 和 `project_id` 必须一致。
- 文档的 `directory_id` 必须存在，且 `scope` 和 `project_id` 必须匹配。
- 文档的 `current_version_id` 必须归属于同一文档。
- 文档版本的 `doc_id` 必须存在。
- 文档评论的 `doc_id` 和 `author_member_id` 必须存在。
- 文档与 Issue 关联中的 `doc_id` 和 `issue_key` 必须存在。
- 站会条目的 `standup_id` 和 `member_id` 必须存在。
- 里程碑的 `project_id` 必须存在。
- 里程碑的 `iteration_id` 必须归属于同一项目。
- 里程碑的 `participant_member_id` 必须存在。
- 飞书成员资料的 `member_id` 必须存在。

事务要求：

- seed 必须在单个事务中校验并写入全部表。
- 创建项目和首个迭代必须在单个事务中完成，并在事务内校验 `active_iteration_id`。
- 创建文档、创建版本 `1`、设置 `current_version_id`、创建 Issue 关联必须在单个事务中完成。
- 更新文档正文时，创建新版本和移动 `current_version_id` 必须在单个事务中完成。
- 保存站会时，站会主记录和站会条目替换必须在单个事务中完成。
- 保存里程碑时，关系校验和更新必须在单个事务中完成。
- 飞书通知写入前必须在同一事务中校验 payload 中引用的 standup、issue、document 或 comment。

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

当前不新增目录 API。当前前端新建文档弹窗里的目录新建、重命名、删除仍然是提交文档前的本地草稿行为；只有创建文档时，repository 才通过 `POST /api/docs` 在同一事务中创建或复用所需目录。独立持久化空目录、独立重命名已存在目录、独立删除已存在目录都不属于本次数据模型实施范围，因为这些能力会要求新增前端操作流程。

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

- schema 测试证明新表和关系字段存在，并证明表结构不声明数据库外键。
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
