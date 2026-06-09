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
- 不修改现有已实现页面的 CSS 样式。
- 允许为新增子级操作页添加作用域 CSS；新增样式不得改变现有主页面视觉。

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
- 子级操作页：新建项目、新建工单、新建文档、分配与共担、群机器人控制台。

数据库、后端 API、前端 domain 类型和 API client 可以重新设计，但现有页面组件拿到业务数据后的用户可感知行为必须保持不变。数据适配允许发生在前端数据层，不要求后端保持旧首屏数据契约。

## 原型来源

新增子级操作页以根目录下的 `飞书敏捷项目管理 · 编辑台账(单文件) (1).html` 为视觉和交互契约。

必须 1:1 还原的子级操作页：

- `newProject`：`① 新建项目`，画板尺寸 `1100x760`。
- `newIssue`：`② 新建工单 · 需求/缺陷`，画板尺寸 `1240x760`。
- `newDoc`：`③ 新建文档 · Markdown/脑图/Mermaid`，画板尺寸 `1140x820`。
- `assign`：`④ 分配 & 共担 · 负载感知`，画板尺寸 `1080x720`。
- `bot`：`⑤ 群机器人控制台`，画板尺寸 `1440x860`。

原型中出现的成员选择、经办、共担和群配置只代表当前操作需要的成员关系和通知关系，不引入权限、审批、负责人、责任人或团队模型。原型外层文案中出现的版本历史不纳入实施范围，文档仍不做版本系统。

### 子级操作页契约

`新建项目` 子级页必须覆盖：

- 项目名称。
- 标识字和主色。
- 项目代号，用于生成可见 Issue 编号前缀。
- 迭代节律：`1 周`、`双周`、`3 周`、`自定义`。
- 初始模板：`Scrum · 看板+迭代+燃尽`。
- 从飞书通讯录选择成员。
- 取消和创建项目。

`新建工单` 子级页必须覆盖：

- 类型：需求、缺陷、任务、技术债。
- 标题、描述和验收标准。
- 优先级：高、中、低。
- 故事点步进器。
- 当前迭代。
- 经办人。
- 史诗/模块。
- 标签。
- 存为草稿和创建工单。
- 创建后飞书 @ 经办人。

`新建文档` 子级页必须覆盖：

- 文档类型：Markdown、脑图、Mermaid。
- 模板预览区域。
- 标题。
- 所属目录。
- 成员选择。该字段按原型展示，但数据语义是文档编辑通知成员，不是负责人或责任人。
- 可搜索并关联 Issue。
- 同步飞书云文档开关。
- 取消和创建并编辑。

`分配 & 共担` 子级页必须覆盖：

- 当前 Issue 摘要、可见编号和故事点。
- 本迭代成员负载列表。
- 经办人选择。
- 共担成员选择。
- 取消和保存分配。
- 保存后飞书 @ 相关成员。

`群机器人控制台` 子级页必须覆盖：

- 机器人运行状态。
- 本周已推送数量。
- 关联飞书群列表。
- 定时摘要、迭代周报、风险告警三类触发推送规则。
- 目标群配置。
- 飞书卡片预览。
- 发送测试消息。

## 统一契约

前端和后端必须使用同一份 TypeScript 契约定义数据结构、请求体、响应体和枚举值。

契约要求：

- 契约定义放在 `packages/agilix-contract` 共享 TypeScript 包中，由前端和后端共同导入。
- 不允许前端和后端分别维护重复的请求/响应类型。
- 不允许前端和后端分别维护重复的枚举值。
- 契约包必须同时导出 TypeScript 类型和运行时 schema，API 入参、API 出参和前端 API client 校验都必须使用这些 schema。
- API schema 校验必须从同一份契约派生，避免协议兜底和格式兜底。
- 前端不得定义独立的 API request/response 类型；只能导入契约包类型。
- 后端不得定义独立的 API request/response 类型；只能导入契约包类型。
- 契约包必须有类型测试和 schema 测试，证明前后端导入的是同一份定义。
- 前端页面组件可以继续使用适合展示的数据结构，但这些结构也必须定义在同一份 TypeScript 契约中。

## ID 规则

所有数据库主键和跨表关系字段统一使用后端生成的雪花 ID 字符串。

规则：

- 所有名为 `id` 的字段都是雪花 ID。
- 所有以 `_id` 结尾的关系字段都存储雪花 ID。
- 创建类 API 不接受客户端提交主键 id。
- 前端表单和页面组件不得生成主键 id。
- repository 在事务内生成新记录 id。
- 用户可见的项目标识、Issue 编号、迭代编号不是主键，只作为业务展示字段。
- 当前前端可见的 Issue 编号可以继续显示为类似 `SRCH-186` 的格式，但数据库关系必须使用 Issue 的雪花 `id`。
- 当前前端项目创建表单中的“项目标识”不是项目主键，存储为项目 `code`。
- 纯关系表允许使用复合主键；复合主键字段仍必须引用后端生成的雪花 ID。

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
- `cadence`
- `template_key`

关系规则：

- 一个项目有多个迭代。
- 一个项目有多个 Issue。
- 一个项目有多个项目文档。
- 一个项目有多个站会。
- 一个项目有多个里程碑。
- 一个项目有多个成员关系，用于新建项目页选择的飞书通讯录成员；这不是团队模型。
- `active_iteration_id` 存储当前迭代 id；repository 必须在创建、更新和 seed 事务中校验该迭代属于同一项目。

辅助表：

- `project_members`

`project_members` 必需字段：

- `project_id`
- `member_id`
- `sort_order`

关系规则：

- 该表允许使用 `project_id` 和 `member_id` 作为复合主键，不需要额外 `id` 字段。
- `project_members` 只表达项目参与成员，不表达权限、负责人或团队归属。

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
- `description`
- `acceptance_criteria`
- `epic_name`
- `draft`

关系规则：

- `project_id` 存储 Issue 所属项目 id；repository 必须在事务中校验项目存在。
- `iteration_id` 存储迭代 id；repository 必须在事务中校验该迭代属于同一项目。
- `handler_member_id` 存储成员 id，含义是当前处理人，不是负责人；repository 必须在事务中校验成员存在。

辅助表：

- `issue_events`
- `issue_labels`
- `issue_collaborators`

`issue_events` 必需字段：

- `id`
- `issue_id`
- `event_type`
- `actor_member_id`
- `message`
- `created_at`

保留事件表是因为现有 schema 已经存在 Issue 事件，并且当前 UI 的状态流转、阻塞等概念需要持久化记录。它不是全局动态流。

`issue_labels` 必需字段：

- `issue_id`
- `label`
- `sort_order`

`issue_collaborators` 必需字段：

- `issue_id`
- `member_id`
- `sort_order`

关系规则：

- `issue_labels` 允许使用 `issue_id` 和 `label` 作为复合主键。
- `issue_collaborators` 允许使用 `issue_id` 和 `member_id` 作为复合主键。
- 共担成员只表示协作参与，不表示负责人、责任人、审批人或权限。

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
- `editor_member_id`
- `sync_feishu_doc`
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
- `directory_id` 存储目录 id；repository 必须在事务中校验目录范围和项目与文档匹配。
- `editor_member_id` 存储新建文档页成员选择，用于通知和展示，不表示负责人或责任人。

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
- 该表允许使用 `doc_id` 和 `issue_id` 作为复合主键，不需要额外 `id` 字段。
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

必需表：

- `feishu_groups`

必需字段：

- `id`
- `project_id`
- `name`
- `purpose`
- `member_count_label`
- `status`
- `sort_order`

必需表：

- `feishu_bot_rules`

必需字段：

- `id`
- `project_id`
- `rule_type`
- `title`
- `description`
- `schedule_label`
- `target_group_id`
- `enabled`
- `sort_order`

前端数据规则：

- 飞书群、查询命令和通知触发器必须继续驱动当前飞书页面按钮和查询结果。
- 成员头像和展示名来自 `feishu_member_profiles`，用于当前在线成员展示，不改变页面布局。
- 群机器人控制台必须从 `feishu_groups` 和 `feishu_bot_rules` 得到关联群、触发规则、运行状态和卡片预览所需数据。

## 关系校验策略

数据库表不声明任何外键。所有跨表关系必须由 repository 在事务中校验，并在校验失败时拒绝整次写入。

必须由程序逻辑校验的关系：

- 项目的 `active_iteration_id` 必须指向同一项目下的迭代。
- 迭代日历周必须归属于存在的迭代。
- 迭代日历日必须归属于存在的迭代周。
- 项目成员关系中的 `project_id` 和 `member_id` 必须存在。
- Issue 的 `project_id` 必须存在。
- Issue 的 `iteration_id` 必须归属于同一项目。
- Issue 的 `handler_member_id` 必须存在。
- Issue 标签的 `issue_id` 必须存在。
- Issue 共担关系中的 `issue_id` 和 `member_id` 必须存在。
- 文档目录的父目录必须存在，且 `scope` 和 `project_id` 必须一致。
- 文档的 `directory_id` 必须存在，且 `scope` 和 `project_id` 必须匹配。
- 文档的 `editor_member_id` 必须存在。
- 文档评论的 `doc_id` 和 `author_member_id` 必须存在。
- 文档与 Issue 关联中的 `doc_id` 和 `issue_id` 必须存在。
- 站会条目的 `standup_id` 和 `member_id` 必须存在。
- 里程碑的 `project_id` 必须存在。
- 里程碑的 `iteration_id` 必须归属于同一项目。
- 里程碑的 `participant_member_id` 必须存在。
- 飞书成员资料的 `member_id` 必须存在。
- 飞书群的 `project_id` 必须存在。
- 飞书机器人规则的 `project_id` 和 `target_group_id` 必须存在，且目标群必须归属于同一项目。

事务要求：

- seed 必须在单个事务中校验并写入全部表。
- 创建项目、首个迭代、默认目录、默认看板数据和项目成员关系必须在单个事务中完成，并在事务内校验 `active_iteration_id`。
- 创建工单、标签、共担成员、事件和飞书通知必须在单个事务中完成。
- 保存分配时，Issue 经办人、共担成员替换、事件和飞书通知必须在单个事务中完成。
- 创建文档和创建 Issue 关联必须在单个事务中完成。
- 创建、重命名、移动或删除目录必须在单个事务中完成。
- 保存站会时，站会主记录和站会条目替换必须在单个事务中完成。
- 保存里程碑时，关系校验和更新必须在单个事务中完成。
- 保存飞书机器人配置必须在单个事务中校验群和规则。
- 飞书通知写入前必须在同一事务中校验 payload 中引用的 standup、issue、document 或 comment。

## API 设计边界

后端 API 可以重新设计，不要求保持旧 `/api/bootstrap` 或旧 mutation payload 形状。前端 `api/client`、domain 类型和 `App.tsx` 数据编排可以随新 API 修改，但页面组件的用户可感知流程、展示样式和业务逻辑不能改变。

推荐 API 边界：

- `GET /api/app-state`：返回当前应用首屏所需数据。
- `GET /api/projects`：返回项目列表。
- `POST /api/projects`：创建项目和首个迭代。
- `GET /api/issues`：按项目、状态、成员、关键词查询 Issue。
- `POST /api/issues`：创建工单。
- `PATCH /api/issues/:id/status`：移动 Issue 状态。
- `PUT /api/issues/:id/assignment`：保存经办人与共担成员。
- `GET /api/documents`：查询文档列表。
- `POST /api/documents`：创建文档和 Issue 关联。
- `GET /api/documents/:id`：读取文档详情。
- `POST /api/documents/:id/comments`：创建文档评论。
- `POST /api/document-directories`：创建目录。
- `PATCH /api/document-directories/:id`：重命名目录或调整父目录。
- `DELETE /api/document-directories/:id`：删除空目录。
- `GET /api/standups`：查询站会。
- `PUT /api/standups/:id`：保存站会。
- `GET /api/milestones`：查询里程碑。
- `PUT /api/milestones/:id`：保存里程碑。
- `GET /api/feishu/bot-config`：读取群机器人控制台配置。
- `PUT /api/feishu/bot-config`：保存群机器人控制台配置。
- `POST /api/feishu/test-message`：发送测试消息并记录通知。
- `POST /api/feishu/query`：执行飞书查询命令。
- `POST /api/feishu/notifications`：记录飞书通知。

创建 API 的 id 生成规则：

- `POST /api/projects` 不接收项目 id、迭代 id 或项目成员关系 id；后端在同一事务中生成项目雪花 id、首个迭代雪花 id，并把项目 `active_iteration_id` 设置为该迭代 id。
- `POST /api/issues` 不接收 Issue id、事件 id 或通知 id；后端生成 Issue 雪花 id、事件雪花 id、通知雪花 id 和可见 Issue 编号。
- `POST /api/documents` 不接收文档 id 或评论 id；后端生成文档雪花 id，并按请求中的目录 id 校验目录范围。
- `POST /api/document-directories` 不接收目录 id；后端生成目录雪花 id。
- `POST /api/documents/:id/comments` 不接收评论 id；后端生成评论雪花 id。
- 飞书群、机器人规则、通知和查询记录 id 由后端生成。

目录 API 契约：

- 创建目录请求必须包含 `scope`、`project_id`、`parent_id` 和 `name`；全局目录的 `project_id` 必须为空，根目录的 `parent_id` 必须为空。
- 重命名目录请求必须包含 `name`。
- 调整父目录请求必须包含 `parent_id`。
- 删除目录必须只允许空目录；存在子目录或文档时必须拒绝。
- 所有目录写入必须在事务中校验 `scope`、`project_id`、`parent_id` 和唯一目录路径。

前端创建文档契约：

- 前端创建文档请求不得包含 `id`。
- 前端创建文档请求使用 `directory_id` 指向已存在目录。
- 前端创建文档请求可以包含 `content_type`、`editor_member_id`、`linked_issue_ids` 和 `sync_feishu_doc`。
- 前端页面可以保留当前目录选择、目录新建、目录重命名和目录删除的用户操作流程，但提交到 API 时必须拆成对应目录 API 和文档 API 请求。
- 为移除前端生成 id，允许修改 route 内不可见的数据构造代码；不允许改变页面结构、按钮含义、操作顺序、展示样式或业务语义。

前端创建工单契约：

- 前端创建工单请求不得包含 `id` 或 `key`。
- 前端创建工单请求必须包含 `project_id`、`iteration_id`、`type`、`title`、`description`、`acceptance_criteria`、`priority`、`story_points`、`handler_member_id`、`epic_name`、`labels`、`collaborator_member_ids` 和 `draft`。
- 后端根据项目 `code` 生成可见 Issue 编号。
- `存为草稿` 和 `创建工单` 使用同一契约，通过 `draft` 区分。

前端分配契约：

- 前端保存分配请求必须包含 `handler_member_id` 和 `collaborator_member_ids`。
- `collaborator_member_ids` 不得包含 `handler_member_id`。
- 保存分配必须返回更新后的 Issue 和成员负载所需数据。

飞书机器人控制台契约：

- bot 配置请求不得包含新建群或新建规则 id。
- 定时摘要、迭代周报和风险告警规则必须明确 `rule_type`，不允许使用自由文本推断。
- 发送测试消息必须写入 `feishu_notifications`，并返回可渲染的飞书卡片预览数据。

## 前端不变边界

允许修改：

- `src/api/client.ts`
- `src/domain/types.ts`
- `src/domain/*`
- `src/App.tsx`
- `src/routes/*Page.tsx` 中不可见的数据构造、API request 构造和回调参数类型。
- `src/routes/*Page.tsx` 中已有按钮到子级操作页的跳转绑定；只允许绑定导航，不允许改变按钮位置、文案、样式或主页面信息结构。
- 新增子级操作页 route、组件和作用域 CSS。
- 前端测试中的数据构造和 API 断言

不允许修改：

- `src/routes/*Page.tsx` 中除上述子级页跳转绑定之外的页面结构、操作流程、筛选语义、按钮含义、信息组织方式和展示样式。
- `src/components/*` 中当前用户可感知的展示和交互。
- `src/styles/agilix.css` 中已有选择器的视觉规则。
- 任何导致主页面视觉审计或现有页面业务行为改变的代码。

## 测试策略

实施必须 TDD 先行。

必须覆盖的红绿循环：

- schema 测试证明新表和关系字段存在，并证明表结构不声明数据库外键。
- repository conformance 测试证明 seed、load、创建项目、创建工单、移动 Issue、保存分配、创建文档、创建目录、创建评论、保存站会、保存里程碑、保存机器人配置、飞书测试消息、飞书通知和飞书查询都能正确持久化。
- API 测试证明新 API 满足当前页面业务数据需要。
- 契约测试证明前端 API client 和后端 route 使用 `packages/agilix-contract` 的同一份类型和 schema。
- API 测试证明创建项目、创建工单、创建文档、创建目录、创建评论、飞书群和机器人规则请求不接受客户端主键 id。
- 前端 route 测试证明当前页面继续渲染，用户可感知行为不变。
- 视觉审计证明当前样式不变，并证明五个子级操作页与 `飞书敏捷项目管理 · 编辑台账(单文件) (1).html` 对应画板的像素级差距不超过 1%。
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
