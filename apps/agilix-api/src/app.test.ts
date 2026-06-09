import { seedData } from '@agilix/app/domain/fixtures'
import { appStateResponseSchema } from '@agilix/contract'
import { describe, expect, it } from 'vitest'
import { createApp } from './app'
import { createMemoryRepository } from './test/memoryRepository'

describe('AgiliX API app', () => {
  it('returns app state from the shared contract route', async () => {
    const app = createApp(createMemoryRepository(seedData))

    const response = await app.request('/api/app-state')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(appStateResponseSchema.parse(json).projects.length).toBeGreaterThan(0)
  })

  it('creates a project through the shared contract without accepting a client id', async () => {
    const app = createApp(createMemoryRepository(seedData))

    const rejected = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'client-generated',
        code: 'OPS',
        name: '运营平台',
        glyph: '运',
        color: '#6f7f5b',
        cadence: '双周',
        template_key: 'scrum-board-burndown',
        member_ids: [],
        initial_iteration: {
          code: 'S01',
          name: '运营启动迭代',
          date_range_label: '06.10 - 06.21',
          calendar_title: '运营平台 · S01',
          calendar_weeks: [
            { label: 'W1', range_label: '06.10 - 06.14', days: ['10', '11', '12', '13', '14'] },
          ],
          day: 1,
          total_days: 10,
          goal: '完成运营平台初始化',
          velocity: 3,
        },
      }),
    })
    expect(rejected.status).toBe(400)

    const created = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: 'OPS',
        name: '运营平台',
        glyph: '运',
        color: '#6f7f5b',
        cadence: '双周',
        template_key: 'scrum-board-burndown',
        member_ids: [],
        initial_iteration: {
          code: 'S02',
          name: '运营配置迭代',
          date_range_label: '06.24 - 07.05',
          calendar_title: '运营平台 · S02',
          calendar_weeks: [
            { label: 'W1', range_label: '06.24 - 06.28', days: ['24', '25', '26', '27', '28'] },
            { label: 'W2', range_label: '07.01 - 07.05', days: ['1', '2', '3', '4', '5'] },
          ],
          day: 2,
          total_days: 10,
          goal: '配置运营项目流程',
          velocity: 5,
        },
      }),
    })

    const state = appStateResponseSchema.parse(await created.json())
    expect(created.status).toBe(201)
    expect(state.projects.some((project) => project.code === 'OPS')).toBe(true)
    const project = state.projects.find((item) => item.code === 'OPS')
    const iteration = state.iterations.find((item) => item.project_id === project?.id)
    expect(iteration).toEqual(expect.objectContaining({
      code: 'S02',
      name: '运营配置迭代',
      date_range_label: '06.24 - 07.05',
      calendar_title: '运营平台 · S02',
      day: 2,
      total_days: 10,
      goal: '配置运营项目流程',
      velocity: 5,
    }))
    const weeks = state.iteration_calendar_weeks.filter((week) => week.iteration_id === iteration?.id)
    expect(weeks.map((week) => week.range_label)).toEqual(['06.24 - 06.28', '07.01 - 07.05'])
  })

  it('updates issue status through the shared contract by app-state id', async () => {
    const app = createApp(createMemoryRepository(seedData))
    const state = appStateResponseSchema.parse(await (await app.request('/api/app-state')).json())
    const issue = state.issues.find((item) => item.key === 'SRCH-186')

    const response = await app.request(`/api/issues/${issue?.id}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })

    const next = appStateResponseSchema.parse(await response.json())
    expect(response.status).toBe(200)
    expect(next.issues.find((item) => item.id === issue?.id)?.status).toBe('done')
  })

  it('saves standup and milestone through shared contract ids', async () => {
    const app = createApp(createMemoryRepository(seedData))
    const state = appStateResponseSchema.parse(await (await app.request('/api/app-state')).json())
    const standup = state.standups[0]
    const member = state.members[0]
    const milestone = state.milestones[0]

    const standupResponse = await app.request(`/api/standups/${standup.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        items: [
          {
            member_id: member.id,
            yesterday_text: '完成接口联调',
            today_text: '推进灰度',
            blockers_text: '',
          },
        ],
      }),
    })
    const standupState = appStateResponseSchema.parse(await standupResponse.json())
    expect(standupResponse.status).toBe(200)
    expect(standupState.standup_items.filter((item) => item.standup_id === standup.id)).toEqual([
      expect.objectContaining({ member_id: member.id, today_text: '推进灰度' }),
    ])

    const milestoneResponse = await app.request(`/api/milestones/${milestone.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: '更新后的里程碑',
        start_day: 1,
        end_day: 3,
        status: 'doing',
        participant_member_id: member.id,
      }),
    })
    const milestoneState = appStateResponseSchema.parse(await milestoneResponse.json())
    expect(milestoneResponse.status).toBe(200)
    expect(milestoneState.milestones.find((item) => item.id === milestone.id)).toEqual(
      expect.objectContaining({ title: '更新后的里程碑', participant_member_id: member.id }),
    )
  })

  it('serves every full product module', async () => {
    const app = createApp(createMemoryRepository(seedData))

    expect((await app.request('/api/bootstrap')).status).toBe(200)
    expect((await app.request('/api/projects')).status).toBe(200)
    expect(
      (await app.request('/api/issues?projectId=search&status=all&assigneeId=all&keyword=')).status,
    ).toBe(200)
    expect(
      (await app.request('/api/docs?projectId=all&query=%E7%BB%93%E6%9E%9C%E5%8D%A1%E7%89%87'))
        .status,
    ).toBe(200)
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
    expect(
      (
        await repository.listIssues({
          projectId: 'search',
          status: 'all',
          assigneeId: 'all',
          keyword: '',
        })
      ).find((issue) => issue.key === 'SRCH-186')?.status,
    ).toBe('done')

    const createdProject = {
      project: {
        id: 'growth',
        name: '增长实验',
        glyph: 'G',
        color: '#2563eb',
        activeIterationCode: 'S01',
      },
      iteration: {
        id: 'growth-s01',
        projectId: 'growth',
        code: 'S01',
        name: '启动迭代',
        dateRangeLabel: '06.10 - 06.21',
        calendarTitle: '增长实验 · S01',
        calendarWeeks: [
          { label: 'W1', rangeLabel: '06.10 - 06.14', days: ['10', '11', '12', '13', '14'] },
          { label: 'W2', rangeLabel: '06.17 - 06.21', days: ['17', '18', '19', '20', '21'] },
        ],
        day: 1,
        totalDays: 10,
        goal: '验证首批增长假设',
        velocity: 0,
      },
    }
    expect(
      (
        await app.request('/api/projects', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(createdProject),
        })
      ).status,
    ).toBe(201)
    expect((await repository.listProjects()).find((project) => project.id === 'growth')?.name).toBe(
      '增长实验',
    )
    expect(
      (await repository.loadData()).iterations.find((iteration) => iteration.id === 'growth-s01')
        ?.goal,
    ).toBe('验证首批增长假设')

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
    expect(
      (await repository.getDoc('doc-result-card'))?.comments.map((comment) => comment.body),
    ).toContain('API 新增评论')

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

    const contractState = appStateResponseSchema.parse(
      await (await app.request('/api/app-state')).json(),
    )
    const contractStandup = contractState.standups[0]
    const contractGao = contractState.members.find((member) => member.name === '高远')
    const contractMilestone = contractState.milestones.find(
      (milestone) => milestone.title === 'Beta 开关接入',
    )
    expect(contractStandup).toBeDefined()
    expect(contractGao).toBeDefined()
    expect(contractMilestone).toBeDefined()

    expect(
      (
        await app.request(`/api/standups/${contractStandup?.id}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            items: [
              {
                member_id: contractGao?.id,
                yesterday_text: '推进接口联调',
                today_text: '更新后的站会计划',
                blockers_text: '',
              },
            ],
          }),
        })
      ).status,
    ).toBe(200)
    expect(
      (await repository.listStandups({ projectId: 'search' }))[0].items.find(
        (item) => item.memberId === 'gao',
      )?.today,
    ).toEqual(['更新后的站会计划'])

    expect(
      (
        await app.request(`/api/milestones/${contractMilestone?.id}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            title: contractMilestone?.title,
            start_day: contractMilestone?.start_day,
            end_day: contractMilestone?.end_day,
            status: 'doing',
            participant_member_id: contractGao?.id,
          }),
        })
      ).status,
    ).toBe(200)
    expect(
      (await repository.listMilestones({ projectId: 'search' })).find(
        (milestone) => milestone.id === 'ms-beta',
      )?.status,
    ).toBe('doing')

    const queryResponse = await app.request('/api/feishu/query', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ command: '/team' }),
    })
    expect(queryResponse.status).toBe(200)
    expect(await queryResponse.json()).toEqual({
      response_title: '团队状态',
      response_body_json: expect.objectContaining({ lines: expect.arrayContaining([expect.stringMatching(/^Issue \d+$/)]) }),
    })
    expect((await repository.listFeishuQueries()).map((query) => query.command)).toEqual([
      { type: 'team' },
    ])

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
    expect(
      (await repository.listFeishuNotifications()).map((notification) => notification.trigger),
    ).toEqual(['站会摘要'])
  })

  it('rejects invalid mutation payloads, id mismatches, missing documents, and invalid document references', async () => {
    const app = createApp(createMemoryRepository(seedData))
    const contractState = appStateResponseSchema.parse(
      await (await app.request('/api/app-state')).json(),
    )
    const member = contractState.members[0]
    const milestone = contractState.milestones[0]

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

    expect(
      (await app.request('/api/issues?projectId=missing&status=all&assigneeId=all&keyword='))
        .status,
    ).toBe(400)
    expect(
      (await app.request('/api/issues?projectId=search&status=invalid&assigneeId=all&keyword='))
        .status,
    ).toBe(400)
    expect(
      (await app.request('/api/issues?projectId=search&status=all&assigneeId=all')).status,
    ).toBe(400)
    expect(
      (await app.request('/api/issues?projectId=search&status=all&assigneeId=all&keyword=&extra=1'))
        .status,
    ).toBe(400)
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
          body: JSON.stringify({
            items: [
              {
                member_id: member.id,
                yesterday_text: '',
                today_text: '处理异常路径',
                blockers_text: '',
              },
            ],
          }),
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
          body: JSON.stringify({
            title: '缺失里程碑',
            start_day: 1,
            end_day: 2,
            status: 'doing',
            participant_member_id: member.id,
          }),
        })
      ).status,
    ).toBe(404)

    expect(
      (
        await app.request(`/api/milestones/${milestone.id}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            title: '非法状态里程碑',
            start_day: 1,
            end_day: 2,
            status: 'invalid',
            participant_member_id: member.id,
          }),
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
