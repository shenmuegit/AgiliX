import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { seedData } from './domain/fixtures'
import { createInMemoryClient } from './test/createInMemoryClient'

describe('App API wiring', () => {
  afterEach(() => cleanup())

  it('loads the main pages from shared contract app-state before rendering', async () => {
    const client = createInMemoryClient()

    render(<App client={client} />)

    expect(await screen.findByText('SRCH-198')).toBeInTheDocument()
    expect(client.loadAppStateCount()).toBe(1)
    expect(client.loadCount()).toBe(0)
  })

  it('loads data and persists core route mutations through the client', async () => {
    const client = createInMemoryClient()

    render(<App client={client} />)

    expect(await screen.findByText('SRCH-198')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: '看板' }))
    await userEvent.click(await screen.findByRole('button', { name: 'SRCH-186 完成' }))
    expect((await client.loadData()).issues.find((issue) => issue.key === 'SRCH-186')?.status).toBe(
      'done',
    )

    await userEvent.click(screen.getByRole('link', { name: '项目总览' }))
    await userEvent.click(await screen.findByRole('button', { name: '新建项目' }))
    await userEvent.clear(screen.getByLabelText('项目 ID'))
    await userEvent.type(screen.getByLabelText('项目 ID'), 'growth')
    await userEvent.clear(screen.getByLabelText('项目名称'))
    await userEvent.type(screen.getByLabelText('项目名称'), '增长实验')
    await userEvent.clear(screen.getByLabelText('迭代 ID'))
    await userEvent.type(screen.getByLabelText('迭代 ID'), 'growth-s01')
    await userEvent.click(screen.getByRole('button', { name: '创建项目' }))
    await waitFor(async () =>
      expect(
        (await client.loadData()).projects.find((project) => project.id === 'growth')?.name,
      ).toBe('增长实验'),
    )

    await userEvent.click(screen.getByRole('link', { name: '文档' }))
    await userEvent.type(await screen.findByLabelText('新增评论内容'), '补充验收标准')
    await userEvent.click(await screen.findByRole('button', { name: '提交评论' }))
    expect(
      (await client.loadData()).docs.find((doc) => doc.id === 'doc-result-card')?.comments.length,
    ).toBeGreaterThan(2)
    await userEvent.click(await screen.findByRole('button', { name: '新建文档' }))
    const createDocDialog = screen.getByRole('dialog', { name: '新建文档' })
    await userEvent.click(within(createDocDialog).getByRole('button', { name: '配置目录与关联' }))
    await userEvent.click(within(createDocDialog).getByRole('button', { name: '新建同级目录' }))
    await userEvent.type(within(createDocDialog).getByLabelText('新目录名称'), '增长实验')
    await userEvent.click(within(createDocDialog).getByRole('button', { name: '保存目录' }))
    await userEvent.click(within(createDocDialog).getByRole('button', { name: '返回正文' }))
    await userEvent.type(within(createDocDialog).getByLabelText('文档标题'), '增长实验说明')
    await userEvent.type(
      within(createDocDialog).getByLabelText('文档内容'),
      '从表单创建的文档',
    )
    await userEvent.click(within(createDocDialog).getByRole('button', { name: '创建文档' }))
    await waitFor(async () =>
      expect(
        (await client.loadData()).docs.find((doc) => doc.title === '增长实验说明')?.directory,
      ).toBe('全局文档/增长实验'),
    )

    await userEvent.click(screen.getByRole('link', { name: '每日站会' }))
    const standupLoadCount = client.loadAppStateCount()
    await userEvent.click(await screen.findByRole('button', { name: '保存站会' }))
    expect(client.recordedStandupSaves()).toContain('standup-search-today')
    await waitFor(() => expect(client.loadAppStateCount()).toBeGreaterThan(standupLoadCount))

    await userEvent.click(screen.getByRole('link', { name: '排期甘特' }))
    const milestoneLoadCount = client.loadAppStateCount()
    await userEvent.click(await screen.findByRole('button', { name: '保存 Beta 开关接入' }))
    expect(client.recordedMilestoneSaves()).toContain('ms-beta')
    await waitFor(() => expect(client.loadAppStateCount()).toBeGreaterThan(milestoneLoadCount))

    await userEvent.click(screen.getByRole('link', { name: '群机器人' }))
    await userEvent.click(await screen.findByRole('button', { name: '记录 站会摘要' }))
    expect(client.recordedFeishuNotifications()).toContain('站会摘要')

    await userEvent.click(await screen.findByRole('button', { name: '查询 /team' }))
    expect(client.recordedFeishuQueries()).toContain('/team')
  }, 10000)

  it('rejects missing mutation targets and invalid document references in the in-memory client', async () => {
    const client = createInMemoryClient()

    await expect(client.moveIssue('MISSING-1', 'done')).rejects.toThrow('Issue not found')
    await expect(
      client.addDocComment('missing-doc', {
        id: 'comment-missing',
        docId: 'missing-doc',
        authorId: 'zhou',
        body: 'Missing doc comment',
        resolved: false,
        createdAtLabel: '刚刚',
      }),
    ).rejects.toThrow('Document not found')
    await expect(
      client.addDocComment('doc-result-card', {
        id: 'comment-mismatch',
        docId: 'other-doc',
        authorId: 'zhou',
        body: 'Mismatched doc id comment',
        resolved: false,
        createdAtLabel: '刚刚',
      }),
    ).rejects.toThrow('Comment docId must match document id')
    await expect(client.createDoc({ ...seedData.docs[0], comments: [] })).rejects.toThrow(
      'Document already exists',
    )
    await expect(
      client.createDoc({
        id: 'doc-invalid-linked-issue',
        scope: 'project',
        projectId: 'search',
        title: 'Invalid linked issue doc',
        directory: '项目文档/搜索平台/结果页',
        body: 'Linked issue must exist.',
        linkedIssueKeys: ['MISSING-1'],
        comments: [],
        updatedAtLabel: '刚刚',
      }),
    ).rejects.toThrow('Linked issue not found')
    await expect(
      client.createDoc({
        id: 'doc-duplicate-linked-issue',
        scope: 'project',
        projectId: 'search',
        title: 'Duplicate linked issue doc',
        directory: '项目文档/搜索平台/结果页',
        body: 'Linked issue keys must be unique.',
        linkedIssueKeys: ['SRCH-186', 'SRCH-186'],
        comments: [],
        updatedAtLabel: '刚刚',
      }),
    ).rejects.toThrow('Duplicate linked issue')
    await expect(
      client.createDoc({
        id: 'doc-create-with-comment',
        scope: 'project',
        projectId: 'search',
        title: 'Create doc with comment',
        directory: '项目文档/搜索平台/结果页',
        body: 'Comments must use addDocComment.',
        linkedIssueKeys: [],
        comments: [
          // @ts-expect-error createDoc only accepts an empty comments array
          {
            id: 'comment-create-doc',
            docId: 'doc-create-with-comment',
            authorId: 'zhou',
            body: 'Comment must use the comment endpoint.',
            resolved: false,
            createdAtLabel: '刚刚',
          },
        ],
        updatedAtLabel: '刚刚',
      }),
    ).rejects.toThrow('Document comments must be empty on create')
    await expect(
      client.saveStandup({ ...seedData.standups[0], id: 'missing-standup' }),
    ).rejects.toThrow('Standup not found')
    await expect(
      client.saveMilestone({ ...seedData.milestones[1], id: 'missing-milestone' }),
    ).rejects.toThrow('Milestone not found')
    await expect(
      client.recordFeishuNotification({
        id: 'notification-missing-standup',
        trigger: '站会摘要',
        targetGroup: 'AgiliX 团队群',
        payload: { standupId: 'missing-standup' },
        status: 'queued',
        createdAt: '2026-06-06T10:00:00.000Z',
      }),
    ).rejects.toThrow('Standup not found')
    await expect(
      client.recordFeishuNotification({
        id: 'notification-missing-issue',
        trigger: '阻塞提醒',
        targetGroup: 'AgiliX 团队群',
        payload: { issueKeys: ['MISSING-1'] },
        status: 'queued',
        createdAt: '2026-06-06T10:00:00.000Z',
      }),
    ).rejects.toThrow('Issue not found')
    await expect(
      client.recordFeishuNotification({
        id: 'notification-missing-comment',
        trigger: '文档评论',
        targetGroup: 'AgiliX 团队群',
        payload: { docId: 'doc-result-card', commentId: 'missing-comment' },
        status: 'queued',
        createdAt: '2026-06-06T10:00:00.000Z',
      }),
    ).rejects.toThrow('Comment not found')
  })
})
