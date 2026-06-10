import { describe, expect, it } from 'vitest'
import type { AppStateResponse } from '@agilix/contract'
import { toDisplaySeedData } from './appStateAdapter'

const appState: AppStateResponse = {
  projects: [
    {
      id: '1001',
      code: 'search',
      name: '搜索平台',
      glyph: '搜',
      color: 'var(--accent)',
      active_iteration_id: '2001',
      cadence: '双周',
      template_key: 'scrum-board-burndown',
    },
  ],
  project_members: [{ project_id: '1001', member_id: '3001', sort_order: 0 }],
  iterations: [
    {
      id: '2001',
      project_id: '1001',
      code: 'S24',
      name: '搜索体验提升',
      date_range_label: '06.02 - 06.13',
      calendar_title: '搜索平台 · S24',
      day: 6,
      total_days: 10,
      goal: '提升搜索体验',
      velocity: 31,
    },
  ],
  iteration_calendar_weeks: [
    { id: '2101', iteration_id: '2001', sort_order: 0, label: 'W24', range_label: '06/09-06/13' },
  ],
  iteration_calendar_days: [
    { id: '2201', week_id: '2101', sort_order: 0, label: '9' },
    { id: '2202', week_id: '2101', sort_order: 1, label: '10' },
  ],
  members: [
    { id: '3001', name: '高远', role: 'Backend', capacity: 8, online_sort_order: 0 },
    { id: '3002', name: '周然', role: 'Frontend', capacity: 8, online_sort_order: 1 },
  ],
  issues: [
    {
      id: '4001',
      key: 'SRCH-198',
      project_id: '1001',
      iteration_id: '2001',
      type: 'story',
      title: '向量召回 beta 开关接入',
      status: 'doing',
      priority: 'high',
      handler_member_id: '3001',
      story_points: 8,
      blocker_reason: null,
      description: '',
      acceptance_criteria: '',
      epic_name: '搜索平台',
      draft: false,
    },
  ],
  issue_events: [],
  issue_labels: [],
  issue_collaborators: [],
  documents: [
    {
      id: '5001',
      scope: 'project',
      project_id: '1001',
      directory_id: '6002',
      title: '结果卡片重设计方案',
      content_type: 'markdown',
      body: '# 方案说明',
      editor_member_id: '3002',
      sync_feishu_doc: false,
      created_at: '12 分钟前',
      updated_at: '12 分钟前',
    },
  ],
  document_directories: [
    {
      id: '6001',
      scope: 'project',
      project_id: '1001',
      parent_id: null,
      name: '项目文档',
      sort_order: 0,
      created_at: '12 分钟前',
      updated_at: '12 分钟前',
    },
    {
      id: '6002',
      scope: 'project',
      project_id: '1001',
      parent_id: '6001',
      name: '方案',
      sort_order: 1,
      created_at: '12 分钟前',
      updated_at: '12 分钟前',
    },
  ],
  document_issue_links: [{ doc_id: '5001', issue_id: '4001' }],
  document_comments: [
    {
      id: '7001',
      doc_id: '5001',
      author_member_id: '3002',
      body: '补图',
      resolved: false,
      created_at: '刚刚',
    },
  ],
  standups: [
    {
      id: '8001',
      project_id: '1001',
      date: '06 / 09',
      date_label: '06 / 09',
      weekday_label: '星期二',
      time_label: '10:00-10:15',
      calendar_label: '每日 10:00',
    },
  ],
  standup_items: [
    {
      id: '8101',
      standup_id: '8001',
      member_id: '3001',
      sort_order: 0,
      yesterday_text: '完成接口联调',
      today_text: '推进灰度',
      blockers_text: '',
    },
  ],
  milestones: [
    {
      id: '9001',
      project_id: '1001',
      iteration_id: '2001',
      title: 'Beta 开关接入',
      start_day: 2,
      end_day: 5,
      status: 'doing',
      participant_member_id: '3001',
    },
  ],
  feishu_member_profiles: [],
  feishu_groups: [
    {
      id: '10001',
      project_id: '1001',
      name: 'AgiliX 团队群',
      purpose: '通知 / 查询',
      member_count_label: '2 人',
      status: '已连接',
      sort_order: 0,
    },
    {
      id: '10002',
      project_id: '1001',
      name: 'AgiliX 团队群',
      purpose: '通知 / 查询',
      member_count_label: '2 人',
      status: '已连接',
      sort_order: 1,
    },
  ],
  feishu_bot_rules: [],
  feishu_notifications: [],
  feishu_queries: [
    {
      id: '12001',
      command: '/team',
      response_title: '团队状态',
      response_body_json: { lines: [] },
      created_at: '刚刚',
    },
    {
      id: '12002',
      command: '/blockers',
      response_title: '阻塞列表',
      response_body_json: { lines: [] },
      created_at: '刚刚',
    },
    {
      id: '12003',
      command: '/docs 结果卡片',
      response_title: '文档查询',
      response_body_json: { lines: [] },
      created_at: '刚刚',
    },
  ],
}

describe('app-state adapter', () => {
  it('converts shared contract rows into the existing display SeedData shape', () => {
    const data = toDisplaySeedData(appState)

    expect(data.projects[0]).toEqual({
      id: 'search',
      contractId: '1001',
      name: '搜索平台',
      glyph: '搜',
      color: 'var(--accent)',
      activeIterationCode: 'S24',
    })
    expect(data.iterations[0].calendarWeeks).toEqual([
      { label: 'W24', rangeLabel: '06/09-06/13', days: ['9', '10'] },
    ])
    expect(data.issues[0]).toEqual(
      expect.objectContaining({
        key: 'SRCH-198',
        projectId: 'search',
        iterationId: '2001',
        assigneeId: 'gao',
        storyPoints: 8,
        linkedDocIds: ['5001'],
      }),
    )
    expect(data.docs[0]).toEqual(
      expect.objectContaining({
        id: '5001',
        directory: '项目文档/方案',
        linkedIssueKeys: ['SRCH-198'],
        comments: [expect.objectContaining({ authorId: 'zhou', body: '补图' })],
      }),
    )
    expect(data.standups[0].items[0]).toEqual({
      memberId: 'gao',
      yesterday: ['完成接口联调'],
      today: ['推进灰度'],
      blockers: [],
    })
    expect(data.milestones[0]).toEqual(
      expect.objectContaining({ projectId: 'search', iterationId: '2001', ownerId: 'gao' }),
    )
    expect(data.feishu.groups).toEqual(['AgiliX 团队群'])
    expect(data.feishu.queryCommands).toEqual([
      { type: 'team' },
      { type: 'blockers' },
      { type: 'docs', query: '结果卡片' },
    ])
  })
})
