import { seedData } from '@agilix/app/domain/fixtures'
import { describe, expect, it } from 'vitest'
import { createApp } from './app'
import { createMemoryRepository } from './test/memoryRepository'

describe('AgiliX API app', () => {
  it('serves every full product module', async () => {
    const app = createApp(createMemoryRepository(seedData))

    expect((await app.request('/api/bootstrap')).status).toBe(200)
    expect((await app.request('/api/projects')).status).toBe(200)
    expect((await app.request('/api/issues?projectId=search&status=all&assigneeId=all&keyword=')).status).toBe(200)
    expect((await app.request('/api/docs?projectId=all&query=%E7%BB%93%E6%9E%9C%E5%8D%A1%E7%89%87')).status).toBe(200)
    expect((await app.request('/api/standups?projectId=search')).status).toBe(200)
    expect((await app.request('/api/milestones?projectId=search')).status).toBe(200)
  })

  it('persists issue moves, document creation and comments, standup edits, milestones, and Feishu records through the repository', async () => {
    const repository = createMemoryRepository(seedData)
    const app = createApp(repository)

    expect(
      (
        await app.request('/api/issues/SRCH-186/status', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'done' }),
        })
      ).status,
    ).toBe(204)
    expect((await repository.listIssues({ projectId: 'search', status: 'all', assigneeId: 'all', keyword: '' })).find((issue) => issue.key === 'SRCH-186')?.status).toBe('done')

    expect(
      (
        await app.request('/api/docs/doc-result-card/comments', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: 'comment-api',
            docId: 'doc-result-card',
            authorId: 'zhou',
            body: 'API 新增评论',
            resolved: false,
            createdAtLabel: '刚刚',
          }),
        })
      ).status,
    ).toBe(201)
    expect((await repository.getDoc('doc-result-card'))?.comments.map((comment) => comment.body)).toContain('API 新增评论')

    const createdDoc = {
      id: 'doc-api-created',
      scope: 'global' as const,
      title: 'API 创建文档',
      directory: '全局文档/待整理',
      body: '通过 API 创建的明确文档结构',
      linkedIssueKeys: [],
      comments: [],
      updatedAtLabel: '刚刚',
    }
    expect(
      (
        await app.request('/api/docs', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(createdDoc),
        })
      ).status,
    ).toBe(201)
    expect((await repository.getDoc('doc-api-created'))?.title).toBe('API 创建文档')

    const editedStandup = {
      ...seedData.standups[0],
      items: seedData.standups[0].items.map((item) => (item.memberId === 'gao' ? { ...item, today: ['更新后的站会计划'], blockers: [] } : item)),
    }

    expect(
      (
        await app.request('/api/standups/standup-search-today', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(editedStandup),
        })
      ).status,
    ).toBe(204)
    expect((await repository.listStandups({ projectId: 'search' }))[0].items.find((item) => item.memberId === 'gao')?.today).toEqual(['更新后的站会计划'])

    expect(
      (
        await app.request('/api/milestones/ms-beta', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...seedData.milestones[1], status: 'doing' }),
        })
      ).status,
    ).toBe(204)
    expect((await repository.listMilestones({ projectId: 'search' })).find((milestone) => milestone.id === 'ms-beta')?.status).toBe('doing')

    const queryResponse = await app.request('/api/feishu/query', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ command: { type: 'team' } }),
    })
    expect(queryResponse.status).toBe(200)
    expect(((await queryResponse.json()) as { title: string }).title).toBe('团队状态')
    expect((await repository.listFeishuQueries()).map((query) => query.command)).toEqual([{ type: 'team' }])

    expect(
      (
        await app.request('/api/feishu/notifications', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: 'notification-standup',
            trigger: '站会摘要',
            targetGroup: 'AgiliX 团队群',
            payload: { standupId: 'standup-search-today' },
            status: 'queued',
            createdAt: '2026-06-06T10:00:00.000Z',
          }),
        })
      ).status,
    ).toBe(201)
    expect((await repository.listFeishuNotifications()).map((notification) => notification.trigger)).toEqual(['站会摘要'])
  })

  it('rejects invalid mutation payloads, id mismatches, missing documents, and invalid document references', async () => {
    const app = createApp(createMemoryRepository(seedData))

    expect(
      (
        await app.request('/api/issues/SRCH-186/status', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'done', extra: true }),
        })
      ).status,
    ).toBe(400)

    expect(
      (
        await app.request('/api/issues/SRCH-186/status', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'invalid' }),
        })
      ).status,
    ).toBe(400)

    expect(
      (
        await app.request('/api/issues/SRCH-186/status', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: '{"status":',
        })
      ).status,
    ).toBe(400)

    expect(
      (
        await app.request('/api/issues/MISSING-1/status', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'done' }),
        })
      ).status,
    ).toBe(404)

    expect((await app.request('/api/issues?projectId=missing&status=all&assigneeId=all&keyword=')).status).toBe(400)
    expect((await app.request('/api/issues?projectId=search&status=invalid&assigneeId=all&keyword=')).status).toBe(400)
    expect((await app.request('/api/issues?projectId=search&status=all&assigneeId=all')).status).toBe(400)
    expect((await app.request('/api/issues?projectId=search&status=all&assigneeId=all&keyword=&extra=1')).status).toBe(400)
    expect((await app.request('/api/docs?projectId=missing&query=')).status).toBe(400)
    expect((await app.request('/api/docs?projectId=all')).status).toBe(400)
    expect((await app.request('/api/standups?projectId=missing')).status).toBe(400)
    expect((await app.request('/api/standups?projectId=search&extra=1')).status).toBe(400)
    expect((await app.request('/api/milestones?projectId=missing')).status).toBe(400)

    expect(
      (
        await app.request('/api/docs', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: 'doc-result-card',
            scope: 'project',
            projectId: 'search',
            title: '重复文档',
            directory: '项目文档/搜索平台/结果页',
            body: '重复 ID 不允许创建。',
            linkedIssueKeys: [],
            comments: [],
            updatedAtLabel: '刚刚',
          }),
        })
      ).status,
    ).toBe(409)

    expect(
      (
        await app.request('/api/docs', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: 'doc-invalid-linked-issue',
            scope: 'project',
            projectId: 'search',
            title: '无效关联 Issue',
            directory: '项目文档/搜索平台/结果页',
            body: '关联的 issue 必须已经存在。',
            linkedIssueKeys: ['MISSING-1'],
            comments: [],
            updatedAtLabel: '刚刚',
          }),
        })
      ).status,
    ).toBe(400)

    expect(
      (
        await app.request('/api/docs', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: 'doc-duplicate-linked-issue',
            scope: 'project',
            projectId: 'search',
            title: '重复关联 Issue',
            directory: '项目文档/搜索平台/结果页',
            body: '同一文档不能重复关联同一个 issue。',
            linkedIssueKeys: ['SRCH-186', 'SRCH-186'],
            comments: [],
            updatedAtLabel: '刚刚',
          }),
        })
      ).status,
    ).toBe(400)

    expect(
      (
        await app.request('/api/docs', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: 'doc-create-with-comment',
            scope: 'project',
            projectId: 'search',
            title: '创建时携带评论',
            directory: '项目文档/搜索平台/结果页',
            body: '文档创建时不能携带评论。',
            linkedIssueKeys: [],
            comments: [
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
        })
      ).status,
    ).toBe(400)

    expect(
      (
        await app.request('/api/docs/other-doc/comments', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: 'comment-api',
            docId: 'doc-result-card',
            authorId: 'zhou',
            body: 'API 新增评论',
            resolved: false,
            createdAtLabel: '刚刚',
          }),
        })
      ).status,
    ).toBe(400)

    expect(
      (
        await app.request('/api/docs/missing-doc/comments', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: 'comment-missing',
            docId: 'missing-doc',
            authorId: 'zhou',
            body: 'Missing doc comment',
            resolved: false,
            createdAtLabel: '刚刚',
          }),
        })
      ).status,
    ).toBe(404)

    expect(
      (
        await app.request('/api/standups/wrong-standup', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(seedData.standups[0]),
        })
      ).status,
    ).toBe(400)

    expect(
      (
        await app.request('/api/standups/missing-standup', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...seedData.standups[0], id: 'missing-standup' }),
        })
      ).status,
    ).toBe(404)

    expect(
      (
        await app.request('/api/milestones/wrong-milestone', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(seedData.milestones[1]),
        })
      ).status,
    ).toBe(400)

    expect(
      (
        await app.request('/api/milestones/missing-milestone', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...seedData.milestones[1], id: 'missing-milestone' }),
        })
      ).status,
    ).toBe(404)

    expect(
      (
        await app.request('/api/milestones/ms-beta', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...seedData.milestones[1], iterationId: 'missing-iteration' }),
        })
      ).status,
    ).toBe(400)

    expect(
      (
        await app.request('/api/feishu/query', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ command: { type: 'unknown' } }),
        })
      ).status,
    ).toBe(400)

    expect(
      (
        await app.request('/api/feishu/query', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ command: { type: 'docs', query: '   ' } }),
        })
      ).status,
    ).toBe(400)

    expect(
      (
        await app.request('/api/feishu/query', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ command: { type: 'docs', query: ' 结果卡片' } }),
        })
      ).status,
    ).toBe(400)

    expect(
      (
        await app.request('/api/feishu/query', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ command: { type: 'team' }, extra: true }),
        })
      ).status,
    ).toBe(400)

    expect(
      (
        await app.request('/api/feishu/notifications', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: 'notification-invalid',
            trigger: '站会摘要',
            targetGroup: 'AgiliX 团队群',
            payload: { trigger: '站会摘要' },
            status: 'queued',
            createdAt: '2026-06-06T10:00:00.000Z',
          }),
        })
      ).status,
    ).toBe(400)

    expect(
      (
        await app.request('/api/feishu/notifications', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: 'notification-extra',
            trigger: '站会摘要',
            targetGroup: 'AgiliX 团队群',
            payload: { standupId: 'standup-search-today' },
            status: 'queued',
            createdAt: '2026-06-06T10:00:00.000Z',
            extra: true,
          }),
        })
      ).status,
    ).toBe(400)

    expect(
      (
        await app.request('/api/feishu/notifications', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: 'notification-missing-standup',
            trigger: '站会摘要',
            targetGroup: 'AgiliX 团队群',
            payload: { standupId: 'missing-standup' },
            status: 'queued',
            createdAt: '2026-06-06T10:00:00.000Z',
          }),
        })
      ).status,
    ).toBe(400)

    expect(
      (
        await app.request('/api/feishu/notifications', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: 'notification-empty-blockers',
            trigger: '阻塞提醒',
            targetGroup: 'AgiliX 团队群',
            payload: { issueKeys: [] },
            status: 'queued',
            createdAt: '2026-06-06T10:00:00.000Z',
          }),
        })
      ).status,
    ).toBe(400)

    expect(
      (
        await app.request('/api/feishu/notifications', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: 'notification-missing-issue',
            trigger: '阻塞提醒',
            targetGroup: 'AgiliX 团队群',
            payload: { issueKeys: ['MISSING-1'] },
            status: 'queued',
            createdAt: '2026-06-06T10:00:00.000Z',
          }),
        })
      ).status,
    ).toBe(400)

    expect(
      (
        await app.request('/api/feishu/notifications', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: 'notification-missing-comment',
            trigger: '文档评论',
            targetGroup: 'AgiliX 团队群',
            payload: { docId: 'doc-result-card', commentId: 'missing-comment' },
            status: 'queued',
            createdAt: '2026-06-06T10:00:00.000Z',
          }),
        })
      ).status,
    ).toBe(400)
  })
})
