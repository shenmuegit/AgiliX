import { Hono } from 'hono'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { schema } from '../db'
import type { AppContext } from '../types'
import { sendCard, buildIssueAssignedCard } from '../services/feishu'

const app = new Hono<AppContext>()

// Feishu event subscription
app.post('/events', async (c) => {
  const body = await c.req.json<Record<string, any>>()

  if (body.type === 'url_verification') {
    return c.json({ challenge: body.challenge })
  }

  const db = c.get('db')
  const header = body.header
  const event = body.event

  if (header?.event_type === 'im.message.receive_v1') {
    const msg = event?.message
    const chatId = msg?.chat_id
    const text = msg?.content ? JSON.parse(msg.content)?.text?.trim() : ''

    if (!text || !chatId) return c.json({ ok: true })

    const project = await db.query.projects.findFirst({
      where: eq(schema.projects.feishuGroupId, chatId),
    })
    if (!project) return c.json({ ok: true })

    if (text.startsWith('/create')) {
      const parts = text.replace('/create', '').trim().split(/\s+/)
      const typeInput = parts[0]?.toUpperCase()
      const title = parts.slice(1).join(' ')

      const typeMap: Record<string, string> = { BUG: 'BUG', TASK: 'TASK', STORY: 'STORY' }
      const type = typeMap[typeInput] || 'TASK'
      const actualTitle = typeMap[typeInput] ? title : parts.join(' ')

      if (!actualTitle) return c.json({ ok: true })

      const workflow = await db.query.workflows.findFirst({
        where: eq(schema.workflows.projectId, project.id),
        with: { statuses: true },
      })
      const defaultStatus = workflow?.statuses?.sort((a, b) => a.order - b.order)[0]
      if (!defaultStatus) return c.json({ ok: true })

      const sender = event?.sender?.sender_id?.open_id
      let user = sender
        ? await db.query.users.findFirst({ where: eq(schema.users.feishuUserId, sender) })
        : null

      const lastIssue = await db.query.issues.findFirst({
        where: eq(schema.issues.projectId, project.id),
        orderBy: desc(schema.issues.sequenceNum),
      })
      const seq = (lastIssue?.sequenceNum ?? 0) + 1

      const [issue] = await db.insert(schema.issues).values({
        projectId: project.id,
        key: `${project.key}-${seq}`,
        sequenceNum: seq,
        title: actualTitle,
        type: type as any,
        priority: 'MEDIUM',
        statusId: defaultStatus.id,
        reporterId: user?.id || 'system',
      }).returning()

      await db.insert(schema.activityLogs).values({
        issueId: issue.id,
        userId: user?.id,
        action: 'created',
        detail: JSON.stringify({ type, via: 'feishu_bot' }),
      })

      const card = {
        config: { wide_screen_mode: true },
        header: { title: { tag: 'plain_text', content: `✅ 已创建: ${issue.key}` }, template: 'green' },
        elements: [
          { tag: 'div', text: { tag: 'lark_md', content: `**${actualTitle}**\n类型: ${type} | 优先级: MEDIUM` } },
          { tag: 'action', actions: [{ tag: 'button', text: { tag: 'plain_text', content: '查看详情' }, type: 'primary', url: `${c.env.FRONTEND_URL}/projects/${project.id}/board?issue=${issue.id}` }] },
        ],
      }
      await sendCard(c.env, 'chat_id', chatId, card)
    }

    if (text === '/sprint') {
      const sprint = await db.query.sprints.findFirst({
        where: and(eq(schema.sprints.projectId, project.id), eq(schema.sprints.status, 'ACTIVE')),
      })

      if (!sprint) {
        await sendCard(c.env, 'chat_id', chatId, {
          config: { wide_screen_mode: true },
          header: { title: { tag: 'plain_text', content: 'Sprint 概览' }, template: 'blue' },
          elements: [{ tag: 'div', text: { tag: 'lark_md', content: '当前没有进行中的 Sprint' } }],
        })
      } else {
        const issues = await db.query.issues.findMany({
          where: eq(schema.issues.sprintId, sprint.id),
          with: { status: true },
        })
        const done = issues.filter((i) => i.status.category === 'DONE').length
        const totalPts = issues.reduce((s, i) => s + (i.storyPoints ?? 0), 0)
        const donePts = issues.filter((i) => i.status.category === 'DONE').reduce((s, i) => s + (i.storyPoints ?? 0), 0)

        await sendCard(c.env, 'chat_id', chatId, {
          config: { wide_screen_mode: true },
          header: { title: { tag: 'plain_text', content: `🏃 ${sprint.name}` }, template: 'blue' },
          elements: [
            ...(sprint.goal ? [{ tag: 'div' as const, text: { tag: 'lark_md' as const, content: `**目标:** ${sprint.goal}` } }] : []),
            { tag: 'div', fields: [
              { is_short: true, text: { tag: 'lark_md', content: `**进度:** ${done}/${issues.length} issues` } },
              { is_short: true, text: { tag: 'lark_md', content: `**SP:** ${donePts}/${totalPts}` } },
            ] },
            { tag: 'div', text: { tag: 'lark_md', content: `完成率: ${issues.length > 0 ? Math.round((done / issues.length) * 100) : 0}%` } },
          ],
        })
      }
    }

  }

  return c.json({ ok: true })
})

// Feishu interactive card callback
app.post('/card', async (c) => {
  const body = await c.req.json<Record<string, any>>()

  if (body.type === 'url_verification') {
    return c.json({ challenge: body.challenge })
  }

  const action = body.action?.value
  if (!action) return c.json({})

  const db = c.get('db')
  const operatorId = body.open_id

  if (action.action === 'change_status' && action.issueKey && action.statusId) {
    const issue = await db.query.issues.findFirst({
      where: eq(schema.issues.key, action.issueKey),
      with: { status: true },
    })
    if (!issue) return c.json({})

    const newStatus = await db.query.workflowStatuses.findFirst({
      where: eq(schema.workflowStatuses.id, action.statusId),
    })
    if (!newStatus) return c.json({})

    await db.update(schema.issues)
      .set({ statusId: action.statusId, updatedAt: new Date().toISOString() })
      .where(eq(schema.issues.id, issue.id))

    const user = operatorId
      ? await db.query.users.findFirst({ where: eq(schema.users.feishuUserId, operatorId) })
      : null

    await db.insert(schema.activityLogs).values({
      issueId: issue.id,
      userId: user?.id,
      action: 'status_changed',
      detail: JSON.stringify({ from: issue.status.name, to: newStatus.name }),
    })

    return c.json({
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text', content: `✅ 状态已更新: ${issue.key}` },
        template: 'green',
      },
      elements: [
        { tag: 'div', text: { tag: 'lark_md', content: `**${issue.title}**` } },
        { tag: 'div', text: { tag: 'lark_md', content: `状态: ~~${issue.status.name}~~ → **${newStatus.name}**\n操作人: ${user?.name || '未知'}` } },
      ],
    })
  }

  if (action.action === 'start_issue' && action.issueKey) {
    const issue = await db.query.issues.findFirst({
      where: eq(schema.issues.key, action.issueKey),
      with: { status: true, project: { with: { workflows: { with: { statuses: true } } } } },
    })
    if (!issue) return c.json({})

    const inProgressStatus = issue.project.workflows[0]?.statuses
      ?.find((s: any) => s.category === 'IN_PROGRESS')
    if (!inProgressStatus || issue.status.category !== 'TODO') return c.json({})

    await db.update(schema.issues)
      .set({ statusId: inProgressStatus.id, updatedAt: new Date().toISOString() })
      .where(eq(schema.issues.id, issue.id))

    const user = operatorId
      ? await db.query.users.findFirst({ where: eq(schema.users.feishuUserId, operatorId) })
      : null

    await db.insert(schema.activityLogs).values({
      issueId: issue.id,
      userId: user?.id,
      action: 'status_changed',
      detail: JSON.stringify({ from: issue.status.name, to: inProgressStatus.name }),
    })

    return c.json({
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text', content: `🏃 已开始: ${issue.key}` },
        template: 'blue',
      },
      elements: [
        { tag: 'div', text: { tag: 'lark_md', content: `**${issue.title}**\n状态已变更为 **${inProgressStatus.name}**` } },
      ],
    })
  }

  return c.json({})
})

export { app as webhookRoutes }
