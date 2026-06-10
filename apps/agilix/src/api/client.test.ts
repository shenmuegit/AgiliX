import { describe, expect, it, vi } from 'vitest'
import type { AppStateResponse } from '@agilix/contract'
import { seedData } from '../domain/fixtures'
import { createAgiliXClient } from './client'

const emptyAppStateResponse: AppStateResponse = {
  projects: [],
  project_members: [],
  iterations: [],
  iteration_calendar_weeks: [],
  iteration_calendar_days: [],
  members: [],
  issues: [],
  issue_events: [],
  issue_labels: [],
  issue_collaborators: [],
  documents: [],
  document_directories: [],
  document_issue_links: [],
  document_comments: [],
  standups: [],
  standup_items: [],
  milestones: [],
  feishu_member_profiles: [],
  feishu_groups: [],
  feishu_bot_rules: [],
  feishu_notifications: [],
  feishu_queries: [],
}

describe('AgiliX API client', () => {
  it('loads shared contract app state and sends shared project and issue status requests', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/app-state') return Response.json(emptyAppStateResponse)
      if (String(input) === '/api/projects') return Response.json(emptyAppStateResponse, { status: 201 })
      if (String(input) === '/api/issues') return Response.json(emptyAppStateResponse, { status: 201 })
      if (String(input) === '/api/issues/730000000000000401/status')
        return Response.json(emptyAppStateResponse)
      if (String(input) === '/api/docs')
        return Response.json(emptyAppStateResponse, { status: 201 })
      if (String(input) === '/api/docs/730000000000000601/comments')
        return Response.json(emptyAppStateResponse, { status: 201 })
      if (String(input) === '/api/document-directories/730000000000000301')
        return Response.json(emptyAppStateResponse)
      if (String(input) === '/api/feishu/notifications')
        return Response.json({
          id: '730000000000000901',
          trigger: '站会摘要',
          target_group_id: '730000000000000501',
          payload_json: { standup_id: '730000000000000701' },
          status: 'queued',
          created_at: '2026-06-09T00:00:00.000Z',
        }, { status: 201 })
      throw new Error(`Unexpected path: ${String(input)}`)
    })
    const client = createAgiliXClient(fetcher)

    await expect(client.loadAppState()).resolves.toEqual(emptyAppStateResponse)
    await client.createContractProject({
      code: 'OPS',
      name: '运营平台',
      glyph: '运',
      color: '#6f7f5b',
      cadence: '双周',
      template_key: 'scrum-board-burndown',
      member_ids: [],
      initial_iteration: {
        code: 'S01',
        name: '启动迭代',
        date_range_label: '06.10 - 06.21',
        calendar_title: '运营平台 · S01',
        calendar_weeks: [
          { label: 'W1', range_label: '06.10 - 06.14', days: ['10', '11', '12', '13', '14'] },
        ],
        day: 1,
        total_days: 10,
        goal: '完成项目初始化',
        velocity: 0,
      },
    })
    await client.moveIssueById('730000000000000401', 'done')
    await client.createContractIssue({
      project_id: '730000000000000001',
      iteration_id: '730000000000000101',
      type: 'story',
      title: '补齐创建工单契约',
      description: '从真实 API 创建工作项。',
      acceptance_criteria: '返回 app-state 且不接受客户端 id/key。',
      priority: 'medium',
      story_points: 3,
      handler_member_id: '730000000000000201',
      epic_name: '契约',
      labels: ['契约'],
      collaborator_member_ids: ['730000000000000202'],
      draft: false,
    })
    await client.createContractDoc({
      scope: 'global',
      project_id: null,
      directory_id: '730000000000000301',
      title: '接口说明',
      content_type: 'markdown',
      body: '# 接口说明',
      editor_member_id: '730000000000000201',
      linked_issue_ids: ['730000000000000401'],
      sync_feishu_doc: false,
    })
    await client.addContractDocComment('730000000000000601', {
      author_member_id: '730000000000000201',
      body: '需要补验收标准',
    })
    await client.updateContractDocDirectory('730000000000000301', {
      name: '契约目录重命名',
    })
    await client.recordContractFeishuNotification({
      trigger: '站会摘要',
      target_group_id: '730000000000000501',
      payload_json: { standup_id: '730000000000000701' },
    })

    expect(fetcher).toHaveBeenCalledWith('/api/app-state', {
      headers: { 'content-type': 'application/json' },
    })
    expect(fetcher).toHaveBeenCalledWith('/api/projects', {
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
          code: 'S01',
          name: '启动迭代',
          date_range_label: '06.10 - 06.21',
          calendar_title: '运营平台 · S01',
          calendar_weeks: [
            { label: 'W1', range_label: '06.10 - 06.14', days: ['10', '11', '12', '13', '14'] },
          ],
          day: 1,
          total_days: 10,
          goal: '完成项目初始化',
          velocity: 0,
        },
      }),
    })
    expect(fetcher).toHaveBeenCalledWith('/api/issues/730000000000000401/status', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })
    expect(fetcher).toHaveBeenCalledWith('/api/issues', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        project_id: '730000000000000001',
        iteration_id: '730000000000000101',
        type: 'story',
        title: '补齐创建工单契约',
        description: '从真实 API 创建工作项。',
        acceptance_criteria: '返回 app-state 且不接受客户端 id/key。',
        priority: 'medium',
        story_points: 3,
        handler_member_id: '730000000000000201',
        epic_name: '契约',
        labels: ['契约'],
        collaborator_member_ids: ['730000000000000202'],
        draft: false,
      }),
    })
    expect(fetcher).toHaveBeenCalledWith('/api/docs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scope: 'global',
        project_id: null,
        directory_id: '730000000000000301',
        title: '接口说明',
        content_type: 'markdown',
        body: '# 接口说明',
        editor_member_id: '730000000000000201',
        linked_issue_ids: ['730000000000000401'],
        sync_feishu_doc: false,
      }),
    })
    expect(fetcher).toHaveBeenCalledWith('/api/docs/730000000000000601/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        author_member_id: '730000000000000201',
        body: '需要补验收标准',
      }),
    })
    expect(fetcher).toHaveBeenCalledWith('/api/document-directories/730000000000000301', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: '契约目录重命名',
      }),
    })
    expect(fetcher).toHaveBeenCalledWith('/api/feishu/notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        trigger: '站会摘要',
        target_group_id: '730000000000000501',
        payload_json: { standup_id: '730000000000000701' },
      }),
    })
  })

  it('rejects malformed shared contract app state instead of using fallback data', async () => {
    const client = createAgiliXClient(vi.fn(async () => Response.json({ projects: 'not-array' })))

    await expect(client.loadAppState()).rejects.toThrow('AgiliX API response validation failed')
  })

  it('loads bootstrap data and sends core mutations with JSON headers', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/bootstrap')
        return new Response(JSON.stringify(seedData), { status: 200 })
      if (String(input) === '/api/issues/SRCH-186/status')
        return new Response(null, { status: 204 })
      if (String(input) === '/api/projects')
        return new Response(JSON.stringify(seedData.projects[0]), { status: 201 })
      if (String(input) === '/api/docs/doc-result-card/comments')
        return new Response(JSON.stringify(seedData.docs[0].comments[0]), { status: 201 })
      if (String(input) === '/api/docs')
        return new Response(JSON.stringify(seedData.docs[0]), { status: 201 })
      if (String(input) === `/api/standups/${seedData.standups[0].id}`)
        return new Response(null, { status: 204 })
      if (String(input) === `/api/milestones/${seedData.milestones[1].id}`)
        return new Response(null, { status: 204 })
      if (String(input) === '/api/feishu/notifications') {
        return new Response(
          JSON.stringify({
            id: 'notification-client',
            trigger: '站会摘要',
            targetGroup: 'AgiliX 团队群',
            payload: { standupId: 'standup-search-today' },
            status: 'queued',
            createdAt: '2026-06-06T10:00:00.000Z',
          }),
          { status: 201 },
        )
      }
      if (String(input) === '/api/feishu/query')
        return new Response(
          JSON.stringify({ response_title: '团队状态', response_body_json: { lines: ['Issue 7'] } }),
          { status: 200 },
        )
      throw new Error(`Unexpected path: ${String(input)}`)
    })
    const client = createAgiliXClient(fetcher)

    expect((await client.loadData()).projects.map((project) => project.name)).toContain('搜索平台')

    await client.moveIssue('SRCH-186', 'done')
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
    await client.createProject(createdProject)
    await client.addDocComment('doc-result-card', {
      id: 'comment-client',
      docId: 'doc-result-card',
      authorId: 'zhou',
      body: 'Client comment',
      resolved: false,
      createdAtLabel: '刚刚',
    })
    const createdDoc = {
      id: 'doc-client-created',
      scope: 'global' as const,
      title: 'Client 创建文档',
      directory: '全局文档/待整理',
      body: '通过客户端创建的文档',
      linkedIssueKeys: [],
      comments: [],
      updatedAtLabel: '刚刚',
    }
    await client.createDoc(createdDoc)
    const standup = seedData.standups[0]
    const milestone = seedData.milestones[1]
    await client.saveStandup(standup)
    await client.saveMilestone(milestone)
    await client.recordFeishuNotification({
      id: 'notification-client',
      trigger: '站会摘要',
      targetGroup: 'AgiliX 团队群',
      payload: { standupId: 'standup-search-today' },
      status: 'queued',
      createdAt: '2026-06-06T10:00:00.000Z',
    })
    await client.queryFeishu({ type: 'team' })

    expect(fetcher).toHaveBeenCalledWith('/api/issues/SRCH-186/status', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })
    expect(fetcher).toHaveBeenCalledWith('/api/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(createdProject),
    })
    expect(fetcher).toHaveBeenCalledWith('/api/docs/doc-result-card/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'comment-client',
        docId: 'doc-result-card',
        authorId: 'zhou',
        body: 'Client comment',
        resolved: false,
        createdAtLabel: '刚刚',
      }),
    })
    expect(fetcher).toHaveBeenCalledWith('/api/docs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(createdDoc),
    })
    expect(fetcher).toHaveBeenCalledWith(`/api/standups/${standup.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(standup),
    })
    expect(fetcher).toHaveBeenCalledWith(`/api/milestones/${milestone.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(milestone),
    })
    expect(fetcher).toHaveBeenCalledWith('/api/feishu/notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'notification-client',
        trigger: '站会摘要',
        targetGroup: 'AgiliX 团队群',
        payload: { standupId: 'standup-search-today' },
        status: 'queued',
        createdAt: '2026-06-06T10:00:00.000Z',
      }),
    })
    expect(fetcher).toHaveBeenCalledWith('/api/feishu/query', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ command: '/team' }),
    })
  })

  it('rejects invalid document create inputs before sending requests', async () => {
    const fetcher = vi.fn()
    const client = createAgiliXClient(fetcher)

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
      client.queryFeishu({
        type: 'docs',
        // @ts-expect-error invalid query text validates protocol rejection
        query: ' 结果卡片',
      }),
    ).rejects.toThrow('docs query must not include leading or trailing whitespace')

    await expect(
      client.recordFeishuNotification({
        id: 'notification-empty-blockers',
        trigger: '阻塞提醒',
        targetGroup: 'AgiliX 团队群',
        // @ts-expect-error blocker notifications require at least one issue key
        payload: { issueKeys: [] },
        status: 'queued',
        createdAt: '2026-06-06T10:00:00.000Z',
      }),
    ).rejects.toThrow()

    expect(fetcher).not.toHaveBeenCalled()
  })

  it('rejects malformed response payloads and unexpected mutation status codes', async () => {
    await expect(
      createAgiliXClient(
        vi.fn(async () => new Response(JSON.stringify({ projects: [] }), { status: 200 })),
      ).loadData(),
    ).rejects.toThrow('AgiliX API response validation failed')

    await expect(
      createAgiliXClient(
        vi.fn(async () => new Response(
          JSON.stringify({ response_title: '团队状态', response_body_json: { lines: [7] } }),
          { status: 200 },
        )),
      ).queryFeishu({ type: 'team' }),
    ).rejects.toThrow('AgiliX API response validation failed')

    await expect(
      createAgiliXClient(
        vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
      ).moveIssue('SRCH-186', 'done'),
    ).rejects.toThrow('AgiliX API request failed')
  })
})
