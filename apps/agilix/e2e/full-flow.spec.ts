import { expect, test } from '@playwright/test'
import { seedData } from '../src/domain/fixtures'

test('full AgiliX product navigation and core workflows', async ({ page }) => {
  await page.route('**/api/bootstrap', async (route) => {
    await route.fulfill({ json: seedData })
  })
  await page.route('**/api/feishu/query', async (route) => {
    await route.fulfill({ json: { title: '团队状态', lines: ['Issue 7', '文档 3'] } })
  })
  await page.route('**/api/feishu/notifications', async (route) => {
    await route.fulfill({ status: 201, json: { id: 'notification-e2e', trigger: '站会摘要' } })
  })

  await page.goto('/')

  for (const label of ['团队工作台', '项目总览', 'Issues', '看板', '迭代统计', '文档', '成员负载', '每日站会', '排期甘特', '飞书']) {
    await expect(page.getByRole('link', { name: label })).toBeVisible()
  }

  await page.getByRole('link', { name: '文档' }).click()
  await expect(page.getByRole('heading', { name: '文档', exact: true })).toBeVisible()
  await expect(page.getByText('全局文档', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: '看板' }).click()
  await expect(page.getByText('SRCH-198')).toBeVisible()

  await page.getByRole('link', { name: '每日站会' }).click()
  await expect(page.getByText('关联飞书日历 · 每日 10:00')).toBeVisible()

  await page.getByRole('link', { name: '飞书' }).click()
  await expect(page.getByText('/team', { exact: true })).toBeVisible()
  const notificationRequest = page.waitForRequest((request) => request.url().includes('/api/feishu/notifications') && request.method() === 'POST')
  await page.getByRole('button', { name: '记录 站会摘要' }).click()
  expect((await notificationRequest).postDataJSON()).toMatchObject({ trigger: '站会摘要', targetGroup: 'AgiliX 团队群', payload: { standupId: 'standup-search-today' } })
  await page.getByRole('button', { name: '查询 /team' }).click()
  await expect(page.getByText('团队状态')).toBeVisible()
  await expect(page.getByText('审批流')).toHaveCount(0)
})
