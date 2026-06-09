import { describe, expect, it } from 'vitest'
import {
  appStateResponseSchema,
  createDocumentCommentRequestSchema,
  createDocumentDirectoryRequestSchema,
  createDocumentRequestSchema,
  createIssueRequestSchema,
  createProjectRequestSchema,
  recordFeishuNotificationRequestSchema,
  saveBotConfigRequestSchema,
  updateDocumentDirectoryRequestSchema,
} from './schemas'

describe('AgiliX shared contract', () => {
  it('rejects client-generated ids in create requests', () => {
    const project = {
      code: 'OPS',
      name: '运营平台',
      glyph: '运',
      color: '#6f7f5b',
      cadence: '双周',
      template_key: 'scrum-board-burndown',
      member_ids: ['730000000000000201'],
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
    }
    const issue = {
      project_id: '730000000000000001',
      iteration_id: '730000000000000101',
      type: 'story',
      title: '检索日志接入留存分析',
      description: '接入搜索日志',
      acceptance_criteria: '可按日期查看留存',
      priority: 'medium',
      story_points: 5,
      handler_member_id: '730000000000000201',
      epic_name: '搜索平台',
      labels: ['Data'],
      collaborator_member_ids: ['730000000000000202'],
      draft: false,
    }
    const document = {
      scope: 'project',
      project_id: '730000000000000001',
      directory_id: '730000000000000301',
      title: '接口说明',
      content_type: 'markdown',
      body: '# 接口说明',
      editor_member_id: '730000000000000201',
      linked_issue_ids: ['730000000000000401'],
      sync_feishu_doc: true,
    }

    expect(createProjectRequestSchema.safeParse({ ...project }).success).toBe(true)
    expect(createIssueRequestSchema.safeParse({ ...issue }).success).toBe(true)
    expect(createDocumentRequestSchema.safeParse({ ...document }).success).toBe(true)
    expect(createProjectRequestSchema.safeParse({ id: 'client-id', ...project }).success).toBe(false)
    expect(createProjectRequestSchema.safeParse({
      ...project,
      initial_iteration: { id: 'client-id', ...project.initial_iteration },
    }).success).toBe(false)
    expect(createIssueRequestSchema.safeParse({ id: 'client-id', key: 'OPS-1', ...issue }).success).toBe(false)
    expect(createDocumentRequestSchema.safeParse({ id: 'client-id', ...document }).success).toBe(false)
  })

  it('requires current frontend initial iteration fields when creating a project', () => {
    const result = createProjectRequestSchema.safeParse({
      code: 'GROWTH',
      name: '增长实验',
      glyph: 'G',
      color: '#2563eb',
      cadence: '双周',
      template_key: 'scrum-board-burndown',
      member_ids: [],
      initial_iteration: {
        code: 'S01',
        name: '启动迭代',
        date_range_label: '06.10 - 06.21',
        calendar_title: '增长实验 · S01',
        calendar_weeks: [
          { label: 'W1', range_label: '06.10 - 06.14', days: ['10', '11', '12', '13', '14'] },
          { label: 'W2', range_label: '06.17 - 06.21', days: ['17', '18', '19', '20', '21'] },
        ],
        day: 1,
        total_days: 10,
        goal: '验证首批增长假设',
        velocity: 0,
      },
    })

    expect(result.success).toBe(true)
    expect(createProjectRequestSchema.safeParse({
      code: 'GROWTH',
      name: '增长实验',
      glyph: 'G',
      color: '#2563eb',
      cadence: '双周',
      template_key: 'scrum-board-burndown',
      member_ids: [],
    }).success).toBe(false)
  })

  it('requires target_group_id for every bot rule', () => {
    const result = saveBotConfigRequestSchema.safeParse({
      project_id: '730000000000000001',
      groups: [
        {
          id: '730000000000000101',
          name: 'AgiliX 团队群',
          purpose: '项目通知',
          member_count_label: '8 人',
          status: '已连接',
          sort_order: 1,
        },
      ],
      rules: [
        {
          title: '风险告警',
          description: '阻塞时通知',
          rule_type: 'risk_alert',
          schedule_label: '实时',
          enabled: true,
          sort_order: 1,
        },
      ],
    })

    expect(result.success).toBe(false)
  })

  it('parses app state with project-scoped iterations and document directories', () => {
    const result = appStateResponseSchema.safeParse({
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
    })

    expect(result.success).toBe(true)
  })

  it('rejects client-generated ids in every other create request', () => {
    expect(createDocumentDirectoryRequestSchema.safeParse({
      scope: 'project',
      project_id: '730000000000000001',
      parent_id: null,
      name: '接口',
    }).success).toBe(true)
    expect(createDocumentDirectoryRequestSchema.safeParse({
      id: 'client-id',
      scope: 'project',
      project_id: '730000000000000001',
      parent_id: null,
      name: '接口',
    }).success).toBe(false)
    expect(createDocumentCommentRequestSchema.safeParse({
      author_member_id: '730000000000000201',
      body: '需要补验收标准',
    }).success).toBe(true)
    expect(createDocumentCommentRequestSchema.safeParse({
      id: 'client-id',
      author_member_id: '730000000000000201',
      body: '需要补验收标准',
    }).success).toBe(false)
    expect(recordFeishuNotificationRequestSchema.safeParse({
      trigger: '站会摘要',
      target_group_id: '730000000000000501',
      payload_json: { standup_id: '730000000000000701' },
    }).success).toBe(true)
    expect(recordFeishuNotificationRequestSchema.safeParse({
      trigger: '阻塞提醒',
      target_group_id: '730000000000000501',
      payload_json: { issue_ids: ['730000000000000401'] },
    }).success).toBe(true)
    expect(recordFeishuNotificationRequestSchema.safeParse({
      id: 'client-id',
      trigger: '站会摘要',
      target_group_id: '730000000000000501',
      payload_json: { standup_id: '730000000000000701' },
    }).success).toBe(false)
    expect(recordFeishuNotificationRequestSchema.safeParse({
      trigger: 'issue_created',
      target_group_id: '730000000000000501',
      payload_json: { issue_id: '730000000000000401' },
    }).success).toBe(false)
  })

  it('keeps directory update separate from directory creation', () => {
    expect(updateDocumentDirectoryRequestSchema.safeParse({ name: '接口规范' }).success).toBe(true)
    expect(updateDocumentDirectoryRequestSchema.safeParse({ parent_id: '730000000000000302' }).success).toBe(true)
    expect(updateDocumentDirectoryRequestSchema.safeParse({ id: 'client-id', name: '接口规范' }).success).toBe(false)
  })
})
