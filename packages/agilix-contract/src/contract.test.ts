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
    }
    const issue = {
      project_id: '730000000000000001',
      iteration_id: '730000000000000101',
      type: 'requirement',
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
    expect(createIssueRequestSchema.safeParse({ id: 'client-id', key: 'OPS-1', ...issue }).success).toBe(false)
    expect(createDocumentRequestSchema.safeParse({ id: 'client-id', ...document }).success).toBe(false)
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
      trigger: 'issue_created',
      target_group_id: '730000000000000501',
      payload_json: { issue_id: '730000000000000401' },
    }).success).toBe(true)
    expect(recordFeishuNotificationRequestSchema.safeParse({
      id: 'client-id',
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
