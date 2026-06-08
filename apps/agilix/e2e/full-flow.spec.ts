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
    await route.fulfill({
      status: 201,
      json: {
        id: 'doc-e2e',
        scope: 'global',
        title: '浏览器流程文档',
        directory: '全局文档/待整理',
        body: '浏览器流程创建',
        linkedIssueKeys: [],
        comments: [],
        updatedAtLabel: '刚刚',
      },
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
  await expect(page.getByRole('list', { name: '看板时间线视图' })).toBeVisible()
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
  await page.getByRole('button', { name: '新增评论' }).click()
  expect((await commentRequest).postDataJSON()).toMatchObject({
    docId: 'doc-result-card',
    body: '从 AgiliX 文档页补充的评论',
  })
  const docRequest = page.waitForRequest(
    (request) => request.url().endsWith('/api/docs') && request.method() === 'POST',
  )
  await page.getByRole('button', { name: '新建文档' }).click()
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
