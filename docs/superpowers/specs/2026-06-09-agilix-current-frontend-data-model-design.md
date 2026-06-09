# AgiliX 当前前端数据模型设计

## 目标

重新设计 AgiliX 的数据库表结构和持久化关系，使其严格满足当前前端已经展示的数据、用户操作流程和业务逻辑。

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
- 前后端使用同一份 TypeScript 契约。
- 所有主键 id 和关系 id 统一使用后端生成的雪花 ID。
- 后端 API 可以重新设计。
- 前端 domain 类型和 API client 可以跟随新 API 修改。
- `App.tsx` 可以修改数据加载、数据编排和页面 props 传递。
- 测试数据和测试断言可以跟随新数据结构修改。
- 不修改 `src/routes/*Page.tsx` 中当前用户可感知的页面流程、展示样式和业务行为。
- 不修改 CSS 样式。

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

数据库、后端 API、前端 domain 类型和 API client 可以重新设计，但现有页面组件拿到业务数据后的用户可感知行为必须保持不变。数据适配允许发生在前端数据层，不要求后端保持旧首屏数据契约。

## 统一契约

前端和后端必须使用同一份 TypeScript 契约定义数据结构、请求体、响应体和枚举值。

契约要求：

- 契约定义放在共享 TypeScript 模块中，由前端和后端共同导入。
- 不允许前端和后端分别维护重复的请求/响应类型。
- 不允许前端和后端分别维护重复的枚举值。
- API schema 校验必须从同一份契约派生，避免协议兜底和格式兜底。
- 前端页面组件可以继续使用适合展示的数据结构，但这些结构也必须定义在同一份 TypeScript 契约中。

## ID 规则

所有数据库主键和跨表关系字段统一使用后端生成的雪花 ID 字符串。

规则：

- 所有名为 `id` 的字段都是雪花 ID。
- 所有以 `_id` 结尾的关系字段都存储雪花 ID。
- 创建类 API 不接受客户端提交主键 id。
- repository 在事务内生成新记录 id。
- 用户可见的项目标识、Issue 编号、迭代编号不是主键，只作为业务展示字段。
- 当前前端可见的 Issue 编号可以继续显示为类似 `SRCH-186` 的格式，但数据库关系必须使用 Issue 的雪花 `id`。
- 当前前端项目创建表单中的“项目标识”不是项目主键，存储为项目 `code`。

## 推荐数据模型

### 项目

`projects` 仍然是顶层项目容器。

必需字段：

- `id`
- `code`
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
- 里程碑可以存储成员 id 作为参与者，用于当前甘特页面成员展示，但 UI 不得把它表达为负责人概念。

### Issue

Issue 表示当前前端列表和看板中展示的需求、缺陷、任务和技术事项。

必需字段：

- `id`
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
- `issue_id`
- `event_type`
- `actor_member_id`
- `message`
- `created_at`

保留事件表是因为现有 schema 已经存在 Issue 事件，并且当前 UI 的状态流转、阻塞等概念需要持久化记录。它不是全局动态流。

### 文档

文档必须支持当前前端已经表达的全局/项目范围、目录树、关联 Issue、评论、Markdown 渲染、Mermaid 渲染、Diagram 渲染和脑图渲染。

必需字段：

- `id`
- `scope`
- `project_id`
- `directory_id`
- `title`
- `content_type`
- `body`
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
- 当前前端展示的目录路径由祖先目录和 `name` 生成。
- 只有目录下没有文档且没有子目录时，才允许删除目录。

### 文档与 Issue 关联

文档与 Issue 的关联保持显式建模。

必需字段：

- `doc_id`
- `issue_id`

关系规则：

- `doc_id` 和 `issue_id` 组合必须唯一。
- 前端数据层必须能从关联关系得到文档关联 Issue 和 Issue 关联文档。

### 文档评论

文档评论仍然只归属于文档。

必需字段：

- `id`
- `doc_id`
- `author_member_id`
- `body`
- `resolved`
- `created_at`

前端数据规则：

- 评论作者来自 `author_member_id` 对应成员。
- 评论时间展示来自 `created_at`。

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

前端数据规则：

- 昨日、今日、阻塞文本按行拆分后提供给当前站会页面。
- 空文本提供为空数组。

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

前端数据规则：

- `participant_member_id` 用于当前甘特页面展示成员，不引入负责人语义。

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

前端数据规则：

- 飞书群、查询命令和通知触发器必须继续驱动当前飞书页面按钮和查询结果。
- 成员头像和展示名来自 `feishu_member_profiles`，用于当前在线成员展示，不改变页面布局。

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
- 文档评论的 `doc_id` 和 `author_member_id` 必须存在。
- 文档与 Issue 关联中的 `doc_id` 和 `issue_id` 必须存在。
- 站会条目的 `standup_id` 和 `member_id` 必须存在。
- 里程碑的 `project_id` 必须存在。
- 里程碑的 `iteration_id` 必须归属于同一项目。
- 里程碑的 `participant_member_id` 必须存在。
- 飞书成员资料的 `member_id` 必须存在。

事务要求：

- seed 必须在单个事务中校验并写入全部表。
- 创建项目和首个迭代必须在单个事务中完成，并在事务内校验 `active_iteration_id`。
- 创建文档、创建目录和创建 Issue 关联必须在单个事务中完成。
- 保存站会时，站会主记录和站会条目替换必须在单个事务中完成。
- 保存里程碑时，关系校验和更新必须在单个事务中完成。
- 飞书通知写入前必须在同一事务中校验 payload 中引用的 standup、issue、document 或 comment。

## API 设计边界

后端 API 可以重新设计，不要求保持旧 `/api/bootstrap` 或旧 mutation payload 形状。前端 `api/client`、domain 类型和 `App.tsx` 数据编排可以随新 API 修改，但页面组件的用户可感知流程、展示样式和业务逻辑不能改变。

推荐 API 边界：

- `GET /api/app-state`：返回当前应用首屏所需数据。
- `GET /api/projects`：返回项目列表。
- `POST /api/projects`：创建项目和首个迭代。
- `GET /api/issues`：按项目、状态、成员、关键词查询 Issue。
- `PATCH /api/issues/:id/status`：移动 Issue 状态。
- `GET /api/documents`：查询文档列表。
- `POST /api/documents`：创建文档、目录和 Issue 关联。
- `GET /api/documents/:id`：读取文档详情。
- `POST /api/documents/:id/comments`：创建文档评论。
- `GET /api/standups`：查询站会。
- `PUT /api/standups/:id`：保存站会。
- `GET /api/milestones`：查询里程碑。
- `PUT /api/milestones/:id`：保存里程碑。
- `POST /api/feishu/query`：执行飞书查询命令。
- `POST /api/feishu/notifications`：记录飞书通知。

创建 API 的 id 生成规则：

- `POST /api/projects` 不接收项目 id 和迭代 id；后端在同一事务中生成项目雪花 id、首个迭代雪花 id，并把项目 `active_iteration_id` 设置为该迭代 id。
- `POST /api/documents` 不接收文档 id、目录 id 或评论 id；后端按提交的目录路径创建或复用目录，并生成所需雪花 id。
- `POST /api/documents/:id/comments` 不接收评论 id；后端生成评论雪花 id。
- 飞书通知和飞书查询记录 id 由后端生成。

## 前端不变边界

允许修改：

- `src/api/client.ts`
- `src/domain/types.ts`
- `src/domain/*`
- `src/App.tsx`
- 前端测试中的数据构造和 API 断言

不允许修改：

- `src/routes/*Page.tsx` 中的页面结构、操作流程、筛选语义、按钮含义、信息组织方式。
- `src/components/*` 中当前用户可感知的展示和交互。
- `src/styles/agilix.css`。
- 任何导致视觉审计或现有页面业务行为改变的代码。

## 测试策略

实施必须 TDD 先行。

必须覆盖的红绿循环：

- schema 测试证明新表和关系字段存在，并证明表结构不声明数据库外键。
- repository conformance 测试证明 seed、load、创建项目、移动 Issue、创建文档、创建目录、创建评论、保存站会、保存里程碑、飞书通知和飞书查询都能正确持久化。
- API 测试证明新 API 满足当前页面业务数据需要。
- 前端 route 测试证明当前页面继续渲染，用户可感知行为不变。
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
- 不做超出当前文档创建、目录管理和评论行为之外的文档编辑 UI。

## 实施说明

- 当前前端已经把某些数据当作结构化行使用时，实施可以从 JSON 字段迁移为规范化子表。
