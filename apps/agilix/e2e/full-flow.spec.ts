import { expect, test, type Page } from '@playwright/test'
import { seedData } from '../src/domain/fixtures'

async function mockAgiliXApi(page: Page) {
  await page.route('**/api/bootstrap', async (route) => {
    await route.fulfill({ json: seedData })
  })
  await page.route('**/api/issues/*/status', async (route) => {
    await route.fulfill({ status: 204 })
  })
  await page.route('**/api/docs/*/comments', async (route) => {
    await route.fulfill({
      status: 201,
      json: {
        id: 'comment-e2e',
        docId: 'doc-result-card',
        authorId: 'zhou',
        body: '浏览器流程评论',
        resolved: false,
        createdAtLabel: '刚刚',
      },
    })
  })
  await page.route('**/api/docs', async (route) => {
    const createdDoc = route.request().postDataJSON()
    await route.fulfill({
      status: 201,
      json: createdDoc,
    })
  })
  await page.route('**/api/standups/*', async (route) => {
    await route.fulfill({ status: 204 })
  })
  await page.route('**/api/milestones/*', async (route) => {
    await route.fulfill({ status: 204 })
  })
  await page.route('**/api/feishu/query', async (route) => {
    await route.fulfill({ json: { title: '团队状态', lines: ['Issue 7', '文档 3'] } })
  })
  await page.route('**/api/feishu/notifications', async (route) => {
    await route.fulfill({ status: 201, json: { id: 'notification-e2e', trigger: '站会摘要' } })
  })
}

test('full AgiliX product navigation and core workflows', async ({ page }) => {
  await mockAgiliXApi(page)

  await page.goto('/')

  for (const label of [
    '团队工作台',
    '项目总览',
    '需求 & 缺陷',
    '看板',
    '迭代统计',
    '文档',
    '成员负载',
    '每日站会',
    '排期甘特',
    '群机器人',
  ]) {
    await expect(page.getByRole('link', { name: label })).toBeVisible()
  }

  await page.getByRole('link', { name: '文档' }).click()
  await expect(page.getByRole('heading', { name: '文档', exact: true })).toBeVisible()
  await expect(page.getByText('统一目录、评论与关联 Issue')).toBeVisible()
  await expect(page.getByRole('button', { name: '全局文档' })).toBeVisible()

  await page.getByRole('link', { name: '看板' }).click()
  await expect(page.getByText('SRCH-198')).toBeVisible()

  await page.getByRole('link', { name: '每日站会' }).click()
  await expect(page.getByText('关联飞书日历 · 每日 10:00')).toBeVisible()

  await page.getByRole('link', { name: '群机器人' }).click()
  await expect(page.getByText('/team', { exact: true })).toBeVisible()
  const notificationRequest = page.waitForRequest(
    (request) => request.url().includes('/api/feishu/notifications') && request.method() === 'POST',
  )
  await page.getByRole('button', { name: '记录 站会摘要' }).click()
  expect((await notificationRequest).postDataJSON()).toMatchObject({
    trigger: '站会摘要',
    targetGroup: 'AgiliX 团队群',
    payload: { standupId: 'standup-search-today' },
  })
  await page.getByRole('button', { name: '查询 /team' }).click()
  await expect(page.getByText('团队状态')).toBeVisible()
  await expect(page.getByText('审批流')).toHaveCount(0)
})

test('core action buttons remain clickable across product flows', async ({ page }) => {
  await mockAgiliXApi(page)
  await page.goto('/')

  await page.getByRole('button', { name: /查看阻塞/ }).click()
  await expect(page.getByRole('heading', { name: '需求 & 缺陷', exact: true })).toBeVisible()

  await page.getByRole('link', { name: '团队工作台' }).click()
  await page.getByRole('button', { name: /打开文档/ }).click()
  await expect(page.getByRole('heading', { name: '文档', exact: true })).toBeVisible()

  await page.getByRole('link', { name: '团队工作台' }).click()
  await page.getByRole('button', { name: /更新我的状态/ }).click()
  await expect(page.getByRole('heading', { name: '每日站会', exact: true })).toBeVisible()

  await page.getByRole('link', { name: '看板' }).click()
  await page.getByRole('button', { name: '表格' }).click()
  await expect(page.getByRole('table', { name: '看板表格视图' })).toBeVisible()
  await page.getByRole('button', { name: '时间线' }).click()
  await expect(page.getByRole('list', { name: '看板状态时间线' })).toBeVisible()
  await page.getByRole('button', { name: '看板' }).click()
  await page.getByRole('button', { name: '搜索' }).click()
  await page.getByLabel('搜索看板工单').fill('SRCH-209')
  await expect(page.getByText('空格 query 命中率骤降')).toBeVisible()
  await page.getByRole('button', { name: '新建' }).click()
  await expect(page.getByRole('heading', { name: '需求 & 缺陷', exact: true })).toBeVisible()

  await page.getByRole('link', { name: '文档' }).click()
  await page.getByRole('searchbox', { name: '搜索文档' }).fill('结果卡片')
  await expect(page.getByRole('heading', { name: '结果卡片重设计方案', exact: true })).toBeVisible()
  const commentRequest = page.waitForRequest(
    (request) =>
      request.url().includes('/api/docs/doc-result-card/comments') && request.method() === 'POST',
  )
  await page.getByLabel('新增评论内容').fill('从 AgiliX 文档页补充的评论')
  await page.getByRole('button', { name: '提交评论' }).click()
  expect((await commentRequest).postDataJSON()).toMatchObject({
    docId: 'doc-result-card',
    body: '从 AgiliX 文档页补充的评论',
  })
  const docRequest = page.waitForRequest(
    (request) => request.url().endsWith('/api/docs') && request.method() === 'POST',
  )
  await page.getByRole('button', { name: '新建文档' }).click()
  await page.getByLabel('文档标题').fill('新建全局文档')
  await page.getByRole('textbox', { name: '文档内容' }).fill('浏览器流程创建')
  await page.getByRole('button', { name: '创建文档' }).click()
  expect((await docRequest).postDataJSON()).toMatchObject({
    scope: 'global',
    title: '新建全局文档',
  })

  await page.getByRole('link', { name: '每日站会' }).click()
  const standupRequest = page.waitForRequest(
    (request) =>
      request.url().includes('/api/standups/standup-search-today') && request.method() === 'PUT',
  )
  await page.getByRole('button', { name: '保存站会' }).click()
  expect((await standupRequest).postDataJSON()).toMatchObject({
    id: 'standup-search-today',
    weekdayLabel: '星期五',
    calendarLabel: '每日 10:00',
  })

  await page.getByRole('link', { name: '排期甘特' }).click()
  await page.getByRole('button', { name: '同步飞书日历' }).click()
  await expect(page.getByRole('heading', { name: '飞书通知与查询', exact: true })).toBeVisible()
  await page.getByRole('link', { name: '排期甘特' }).click()
  const milestoneRequest = page.waitForRequest(
    (request) => request.url().includes('/api/milestones/ms-beta') && request.method() === 'PUT',
  )
  await page.getByRole('button', { name: '保存 Beta 开关接入' }).click()
  expect((await milestoneRequest).postDataJSON()).toMatchObject({
    id: 'ms-beta',
    title: 'Beta 开关接入',
  })

  await page.getByRole('link', { name: '群机器人' }).click()
  await page.getByRole('button', { name: '同步群配置' }).click()
  await expect(page.getByText('群配置已同步')).toBeVisible()
  await page.getByRole('button', { name: '打开机器人控制台' }).click()
  await expect(page.getByText('机器人控制台未配置')).toBeVisible()
  await page.getByRole('button', { name: '记录 阻塞提醒' }).click()
  await page.getByRole('button', { name: '记录 文档评论' }).click()
  await page.getByRole('button', { name: '查询 /blockers' }).click()
  await expect(page.getByText('团队状态')).toBeVisible()
  await page.getByRole('button', { name: '查询 /docs 结果卡片' }).click()
  await expect(page.getByText('文档 3')).toBeVisible()
})

test('document create modal supports directories, issue search, and typed previews', async ({ page }) => {
  await mockAgiliXApi(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('link', { name: '文档' }).click()
  await expect(page.getByRole('heading', { name: '文档', exact: true })).toBeVisible()

  await page.getByRole('button', { name: '新建文档' }).click()
  const dialog = page.getByRole('dialog', { name: '新建文档' })
  await expect(dialog.getByLabel('文档内容区')).toBeVisible()

  await dialog.getByRole('button', { name: '配置目录与关联' }).click()
  await expect(dialog.getByLabel('文档配置页')).toBeVisible()
  await dialog.getByRole('button', { name: '创建为项目文档' }).click()
  await dialog.getByRole('button', { name: '选择项目 搜索平台' }).click()
  await dialog.getByRole('button', { name: '选择目录 方案' }).click()
  await dialog.getByRole('button', { name: '新建子目录' }).click()
  await dialog.getByLabel('新目录名称').fill('增长实验')
  await dialog.getByRole('button', { name: '保存目录' }).click()
  await expect(dialog.getByRole('button', { name: '选择目录 增长实验' })).toHaveClass(/on/)

  await dialog.getByLabel('搜索关联 Issue').fill('收藏')
  await expect(dialog.getByRole('checkbox', { name: '关联 Issue SRCH-186 搜索历史与收藏打通' })).toBeVisible()
  await expect(dialog.getByRole('checkbox', { name: '关联 Issue SRCH-198 向量召回 beta 开关接入' })).toHaveCount(0)
  await dialog.getByRole('checkbox', { name: '关联 Issue SRCH-186 搜索历史与收藏打通' }).check()
  await dialog.getByRole('button', { name: '返回正文' }).click()

  await dialog.getByRole('button', { name: '文档类型 Markdown' }).click()
  await dialog.getByRole('textbox', { name: '文档内容' }).fill(
    ['# 发布说明', '', '```mermaid', 'graph TD', 'A[开始] --> B[完成]', '```'].join('\n'),
  )
  await expect(dialog.getByRole('heading', { name: '发布说明' })).toBeVisible()
  await expect(dialog.getByLabel('Mermaid 图表').getByText('开始')).toBeVisible()
  await expect(dialog.getByLabel('Mermaid 图表').getByText('完成')).toBeVisible()

  await dialog.getByRole('textbox', { name: '文档内容' }).fill('AgiliX\n  文档\n  看板')
  await dialog.getByRole('button', { name: '文档类型 脑图' }).click()
  await expect(dialog.getByLabel('脑图').getByText('AgiliX')).toBeVisible()
  await expect(dialog.getByLabel('脑图').getByText('看板')).toBeVisible()

  await dialog.getByRole('textbox', { name: '文档内容' }).fill('入口 -> 服务 -> 数据库')
  await dialog.getByRole('button', { name: '文档类型 Diagram' }).click()
  await expect(dialog.getByLabel('Diagram 图').getByText('入口')).toBeVisible()
  await expect(dialog.getByLabel('Diagram 图').getByText('数据库')).toBeVisible()

  const docRequest = page.waitForRequest(
    (request) => request.url().endsWith('/api/docs') && request.method() === 'POST',
  )
  await dialog.getByLabel('文档标题').fill('搜索流程图')
  await dialog.getByRole('button', { name: '创建文档' }).click()
  expect((await docRequest).postDataJSON()).toMatchObject({
    scope: 'project',
    projectId: 'search',
    title: '搜索流程图',
    directory: '项目文档/搜索平台/方案/增长实验',
    body: ['```diagram', '入口 -> 服务 -> 数据库', '```'].join('\n'),
    linkedIssueKeys: ['SRCH-186'],
  })
})
