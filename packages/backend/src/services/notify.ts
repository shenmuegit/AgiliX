import { eq } from 'drizzle-orm'
import type { Database } from '../db'
import type { Env } from '../types'
import {
  sendCard,
  buildIssueAssignedCard,
  buildStatusChangeCard,
  buildSprintStartCard,
  buildMRCard,
  buildCIFailedCard,
} from './feishu'

function issueUrl(env: Env, projectId: string, issueId: string) {
  return `${env.FRONTEND_URL}/projects/${projectId}/board?issue=${issueId}`
}

export async function notifyIssueAssigned(
  env: Env,
  db: Database,
  schema: any,
  issue: { id: string; key: string; title: string; type: string; priority: string; projectId: string },
  assigneeId: string,
) {
  const assignee = await db.query.users.findFirst({ where: eq(schema.users.id, assigneeId) })
  if (!assignee?.feishuUserId || assignee.feishuUserId === 'demo_user') return

  const project = await db.query.projects.findFirst({ where: eq(schema.projects.id, issue.projectId) })
  const card = buildIssueAssignedCard(
    { key: issue.key, title: issue.title, type: issue.type, priority: issue.priority, url: issueUrl(env, issue.projectId, issue.id) },
    assignee.name,
  )

  try {
    await sendCard(env, 'open_id', assignee.feishuUserId, card)
  } catch {}
}

export async function notifyStatusChange(
  env: Env,
  db: Database,
  schema: any,
  issue: { id: string; key: string; title: string; type: string; priority: string; projectId: string },
  fromStatus: string,
  toStatus: string,
  operatorName: string,
) {
  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.id, issue.projectId),
    with: { workflows: { with: { statuses: true } } },
  })
  if (!project?.feishuGroupId) return

  const statuses = project.workflows[0]?.statuses?.sort((a: any, b: any) => a.order - b.order) ?? []
  const card = buildStatusChangeCard(
    { key: issue.key, title: issue.title, type: issue.type, priority: issue.priority, url: issueUrl(env, issue.projectId, issue.id) },
    fromStatus,
    toStatus,
    operatorName,
    statuses.map((s: any) => ({ id: s.id, name: s.name })),
  )

  try {
    await sendCard(env, 'chat_id', project.feishuGroupId, card)
  } catch {}
}

export async function notifySprintStarted(
  env: Env,
  db: Database,
  schema: any,
  sprint: { name: string; goal?: string | null; startDate?: string | null; endDate?: string | null; projectId: string },
  issueCount: number,
  totalPoints: number,
) {
  const project = await db.query.projects.findFirst({ where: eq(schema.projects.id, sprint.projectId) })
  if (!project?.feishuGroupId) return

  const card = buildSprintStartCard({ ...sprint, issueCount, totalPoints })
  try {
    await sendCard(env, 'chat_id', project.feishuGroupId, card)
  } catch {}
}

export async function notifyMREvent(
  env: Env,
  db: Database,
  schema: any,
  issue: { id: string; key: string; title: string; type: string; priority: string; projectId: string },
  mr: { title: string; state: string; sourceBranch: string; webUrl?: string | null },
  eventType: 'opened' | 'merged' | 'closed',
) {
  const project = await db.query.projects.findFirst({ where: eq(schema.projects.id, issue.projectId) })
  if (!project?.feishuGroupId) return

  const card = buildMRCard(
    { key: issue.key, title: issue.title, type: issue.type, priority: issue.priority, url: issueUrl(env, issue.projectId, issue.id) },
    mr,
    eventType,
  )

  try {
    await sendCard(env, 'chat_id', project.feishuGroupId, card)
  } catch {}
}

export async function notifyCIFailed(
  env: Env,
  db: Database,
  schema: any,
  issue: { id: string; key: string; title: string; type: string; priority: string; projectId: string },
  mr: { title: string; sourceBranch: string; webUrl?: string | null },
  pipelineUrl?: string | null,
) {
  const project = await db.query.projects.findFirst({ where: eq(schema.projects.id, issue.projectId) })
  if (!project?.feishuGroupId) return

  const card = buildCIFailedCard(
    { key: issue.key, title: issue.title, type: issue.type, priority: issue.priority, url: issueUrl(env, issue.projectId, issue.id) },
    mr,
    pipelineUrl,
  )

  try {
    await sendCard(env, 'chat_id', project.feishuGroupId, card)
  } catch {}
}
