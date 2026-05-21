import type { Env } from '../types'

let cachedToken: { token: string; expiresAt: number } | null = null

export async function getTenantToken(env: Env): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }

  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: env.FEISHU_APP_ID, app_secret: env.FEISHU_APP_SECRET }),
  })
  const data = await res.json() as { tenant_access_token: string; expire: number }
  cachedToken = { token: data.tenant_access_token, expiresAt: Date.now() + (data.expire - 60) * 1000 }
  return data.tenant_access_token
}

async function sendFeishuMessage(
  env: Env,
  receiveIdType: 'open_id' | 'chat_id',
  receiveId: string,
  msgType: string,
  content: string,
) {
  const token = await getTenantToken(env)
  const res = await fetch(`https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=${receiveIdType}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ receive_id: receiveId, msg_type: msgType, content }),
  })
  return res.json() as Promise<{ code: number; msg: string }>
}

export async function sendCard(env: Env, receiveIdType: 'open_id' | 'chat_id', receiveId: string, card: object) {
  return sendFeishuMessage(env, receiveIdType, receiveId, 'interactive', JSON.stringify(card))
}

// ──────────────── Card Templates ────────────────

interface IssueInfo {
  key: string
  title: string
  type: string
  priority: string
  url: string
}

export function buildIssueAssignedCard(issue: IssueInfo, assigneeName: string): object {
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: `📋 任务分配: ${issue.key}` },
      template: 'blue',
    },
    elements: [
      {
        tag: 'div',
        text: { tag: 'lark_md', content: `**${issue.title}**` },
      },
      {
        tag: 'div',
        fields: [
          { is_short: true, text: { tag: 'lark_md', content: `**类型:** ${issue.type}` } },
          { is_short: true, text: { tag: 'lark_md', content: `**优先级:** ${issue.priority}` } },
        ],
      },
      {
        tag: 'div',
        text: { tag: 'lark_md', content: `你被指派为 **${issue.key}** 的负责人` },
      },
      { tag: 'hr' },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '查看详情' },
            type: 'primary',
            url: issue.url,
          },
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '开始处理' },
            type: 'default',
            value: { action: 'start_issue', issueKey: issue.key },
          },
        ],
      },
    ],
  }
}

export function buildStatusChangeCard(
  issue: IssueInfo,
  fromStatus: string,
  toStatus: string,
  operatorName: string,
  workflowStatuses: Array<{ id: string; name: string }>,
): object {
  const statusButtons = workflowStatuses.map((s) => ({
    tag: 'button' as const,
    text: { tag: 'plain_text' as const, content: s.name },
    type: 'default' as const,
    value: { action: 'change_status', issueKey: issue.key, statusId: s.id },
  }))

  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: `🔄 状态变更: ${issue.key}` },
      template: 'turquoise',
    },
    elements: [
      {
        tag: 'div',
        text: { tag: 'lark_md', content: `**${issue.title}**` },
      },
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `${operatorName} 将状态从 **${fromStatus}** 变更为 **${toStatus}**`,
        },
      },
      { tag: 'hr' },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '查看详情' },
            type: 'primary',
            url: issue.url,
          },
          ...statusButtons.slice(0, 3),
        ],
      },
    ],
  }
}

export function buildSprintStartCard(sprint: {
  name: string
  goal?: string | null
  startDate?: string | null
  endDate?: string | null
  issueCount: number
  totalPoints: number
}): object {
  const dateRange = sprint.startDate && sprint.endDate
    ? `${sprint.startDate.slice(0, 10)} — ${sprint.endDate.slice(0, 10)}`
    : '未设定日期'

  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: `🚀 Sprint 已启动: ${sprint.name}` },
      template: 'green',
    },
    elements: [
      ...(sprint.goal ? [{
        tag: 'div' as const,
        text: { tag: 'lark_md' as const, content: `**目标:** ${sprint.goal}` },
      }] : []),
      {
        tag: 'div',
        fields: [
          { is_short: true, text: { tag: 'lark_md', content: `**日期:** ${dateRange}` } },
          { is_short: true, text: { tag: 'lark_md', content: `**Issue 数:** ${sprint.issueCount}` } },
          { is_short: true, text: { tag: 'lark_md', content: `**Story Points:** ${sprint.totalPoints}` } },
        ],
      },
    ],
  }
}

export function buildMRCard(
  issue: IssueInfo,
  mr: { title: string; state: string; sourceBranch: string; webUrl?: string | null },
  eventType: 'opened' | 'merged' | 'closed',
): object {
  const colorMap = { opened: 'green', merged: 'purple', closed: 'red' }
  const labelMap = { opened: 'MR/PR 已创建', merged: 'MR/PR 已合并', closed: 'MR/PR 已关闭' }

  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: `🔗 ${labelMap[eventType]}: ${issue.key}` },
      template: colorMap[eventType],
    },
    elements: [
      {
        tag: 'div',
        text: { tag: 'lark_md', content: `**${mr.title}**` },
      },
      {
        tag: 'div',
        fields: [
          { is_short: true, text: { tag: 'lark_md', content: `**分支:** \`${mr.sourceBranch}\`` } },
          { is_short: true, text: { tag: 'lark_md', content: `**关联 Issue:** ${issue.key} ${issue.title}` } },
        ],
      },
      ...(mr.webUrl ? [{ tag: 'hr' as const }, {
        tag: 'action' as const,
        actions: [{
          tag: 'button' as const,
          text: { tag: 'plain_text' as const, content: '查看 MR/PR' },
          type: 'primary' as const,
          url: mr.webUrl,
        }],
      }] : []),
    ],
  }
}

export function buildCIFailedCard(
  issue: IssueInfo,
  mr: { title: string; sourceBranch: string; webUrl?: string | null },
  pipelineUrl?: string | null,
): object {
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: `❌ CI 失败: ${issue.key}` },
      template: 'red',
    },
    elements: [
      {
        tag: 'div',
        text: { tag: 'lark_md', content: `MR/PR **${mr.title}** 的 CI 流水线执行失败` },
      },
      {
        tag: 'div',
        fields: [
          { is_short: true, text: { tag: 'lark_md', content: `**分支:** \`${mr.sourceBranch}\`` } },
          { is_short: true, text: { tag: 'lark_md', content: `**Issue:** ${issue.key}` } },
        ],
      },
      { tag: 'hr' },
      {
        tag: 'action',
        actions: [
          ...(pipelineUrl ? [{
            tag: 'button' as const,
            text: { tag: 'plain_text' as const, content: '查看流水线' },
            type: 'danger' as const,
            url: pipelineUrl,
          }] : []),
          ...(mr.webUrl ? [{
            tag: 'button' as const,
            text: { tag: 'plain_text' as const, content: '查看 MR/PR' },
            type: 'default' as const,
            url: mr.webUrl,
          }] : []),
        ],
      },
    ],
  }
}

export function buildDueReminderCard(issue: IssueInfo, dueDate: string): object {
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: `⏰ 截止提醒: ${issue.key}` },
      template: 'orange',
    },
    elements: [
      {
        tag: 'div',
        text: { tag: 'lark_md', content: `**${issue.title}**` },
      },
      {
        tag: 'div',
        text: { tag: 'lark_md', content: `此任务将于 **${dueDate}** 截止，请及时处理` },
      },
      { tag: 'hr' },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '查看详情' },
            type: 'primary',
            url: issue.url,
          },
        ],
      },
    ],
  }
}
