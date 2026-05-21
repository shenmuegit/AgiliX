import { eq, and, sql } from 'drizzle-orm'
import { schema } from '../db'
import type { Database } from '../db'

interface GitProvider {
  id: string
  type: 'GITLAB' | 'GITHUB'
  baseUrl: string
  accessToken: string
  repositories: Array<{ id: string; externalId: string; fullPath: string }>
}

interface IssueFields {
  title: string
  description: string | null
  state: 'open' | 'closed'
  labels: string[]
  priority: string
}

const PRIORITY_LABELS: Record<string, string> = {
  HIGHEST: 'priority/highest',
  HIGH: 'priority/high',
  MEDIUM: 'priority/medium',
  LOW: 'priority/low',
  LOWEST: 'priority/lowest',
}

const LABEL_TO_PRIORITY: Record<string, string> = Object.fromEntries(
  Object.entries(PRIORITY_LABELS).map(([k, v]) => [v, k])
)

function issueToFields(issue: any, statusCategory: string): IssueFields {
  const labels = (issue.labels ?? []).map((il: any) => il.label?.name).filter(Boolean)
  labels.push(PRIORITY_LABELS[issue.priority] || 'priority/medium')
  labels.push(`type/${issue.type.toLowerCase()}`)

  return {
    title: `[${issue.key}] ${issue.title}`,
    description: issue.description,
    state: statusCategory === 'DONE' ? 'closed' : 'open',
    labels,
    priority: issue.priority,
  }
}

async function githubApi(baseUrl: string, token: string, path: string, method = 'GET', body?: unknown) {
  const url = baseUrl.includes('api.github.com')
    ? `${baseUrl}${path}`
    : `https://api.github.com${path}`
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'AgiliX',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) return null
  if (res.status === 204) return {}
  return res.json()
}

async function gitlabApi(baseUrl: string, token: string, path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${baseUrl}/api/v4${path}`, {
    method,
    headers: {
      'PRIVATE-TOKEN': token,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) return null
  if (res.status === 204) return {}
  return res.json()
}

export async function pushIssueToGit(db: Database, issueId: string) {
  const issue = await db.query.issues.findFirst({
    where: eq(schema.issues.id, issueId),
    with: {
      project: { with: { gitProviders: { with: { repositories: true } } } },
      status: true,
      labels: { with: { label: true } },
    },
  })
  if (!issue || !issue.syncEnabled) return

  const provider = issue.project.gitProviders[0]
  if (!provider || provider.repositories.length === 0) return

  const repo = provider.repositories[0]
  const fields = issueToFields(issue, issue.status.category)

  try {
    if (provider.type === 'GITHUB') {
      await pushToGitHub(db, provider, repo, issue, fields)
    } else {
      await pushToGitLab(db, provider, repo, issue, fields)
    }
  } catch {
    // silently fail — don't block AgiliX operations
  }
}

async function pushToGitHub(
  db: Database,
  provider: GitProvider,
  repo: GitProvider['repositories'][0],
  issue: any,
  fields: IssueFields,
) {
  if (issue.externalIssueId) {
    await githubApi(provider.baseUrl, provider.accessToken,
      `/repos/${repo.fullPath}/issues/${issue.externalIssueId}`, 'PATCH', {
        title: fields.title,
        body: fields.description || '',
        state: fields.state,
        labels: fields.labels,
      })
  } else {
    const result: any = await githubApi(provider.baseUrl, provider.accessToken,
      `/repos/${repo.fullPath}/issues`, 'POST', {
        title: fields.title,
        body: fields.description || '',
        labels: fields.labels,
      })
    if (result?.number) {
      await db.update(schema.issues)
        .set({
          externalIssueId: String(result.number),
          externalIssueUrl: result.html_url,
        })
        .where(eq(schema.issues.id, issue.id))
    }
  }
}

async function pushToGitLab(
  db: Database,
  provider: GitProvider,
  repo: GitProvider['repositories'][0],
  issue: any,
  fields: IssueFields,
) {
  const encodedPath = encodeURIComponent(repo.fullPath)

  if (issue.externalIssueId) {
    await gitlabApi(provider.baseUrl, provider.accessToken,
      `/projects/${encodedPath}/issues/${issue.externalIssueId}`, 'PUT', {
        title: fields.title,
        description: fields.description || '',
        state_event: fields.state === 'closed' ? 'close' : 'reopen',
        labels: fields.labels.join(','),
      })
  } else {
    const result: any = await gitlabApi(provider.baseUrl, provider.accessToken,
      `/projects/${encodedPath}/issues`, 'POST', {
        title: fields.title,
        description: fields.description || '',
        labels: fields.labels.join(','),
      })
    if (result?.iid) {
      await db.update(schema.issues)
        .set({
          externalIssueId: String(result.iid),
          externalIssueUrl: result.web_url,
        })
        .where(eq(schema.issues.id, issue.id))
    }
  }
}

export async function syncGitIssueToAgiliX(
  db: Database,
  provider: GitProvider,
  repoFullPath: string,
  externalIssueId: string,
  gitIssue: {
    title: string
    body?: string | null
    description?: string | null
    state: string
    labels: Array<{ name: string } | string>
  },
) {
  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.id,
      (await db.query.gitProviders.findFirst({ where: eq(schema.gitProviders.id, provider.id) }))?.projectId ?? ''
    ),
    with: { workflows: { with: { statuses: true } } },
  })
  if (!project) return

  const statuses = project.workflows[0]?.statuses?.sort((a, b) => a.order - b.order) ?? []
  const isClosed = gitIssue.state === 'closed'
  const targetStatus = isClosed
    ? statuses.find(s => s.category === 'DONE')
    : statuses.find(s => s.category === 'TODO')
  if (!targetStatus) return

  const labelNames = gitIssue.labels.map((l: any) => typeof l === 'string' ? l : l.name)
  const priority = labelNames.reduce((p: string, l: string) => LABEL_TO_PRIORITY[l] || p, 'MEDIUM')
  const titleClean = gitIssue.title.replace(/^\[[\w-]+\]\s*/, '')
  const description = gitIssue.body ?? gitIssue.description ?? null

  const existing = await db.query.issues.findFirst({
    where: and(
      eq(schema.issues.projectId, project.id),
      eq(schema.issues.externalIssueId, externalIssueId),
    ),
  })

  if (existing) {
    await db.update(schema.issues)
      .set({
        title: titleClean,
        description,
        priority,
        statusId: targetStatus.id,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.issues.id, existing.id))
  } else {
    const board = await db.query.boards.findFirst({
      where: eq(schema.boards.projectId, project.id),
      with: { columns: true },
    })
    const defaultColumn = board?.columns.find(c => c.statusId === targetStatus.id)

    const [last] = await db.select({ max: sql<number>`max(${schema.issues.sequenceNum})` })
      .from(schema.issues)
      .where(eq(schema.issues.projectId, project.id))

    const sequenceNum = (last?.max ?? 0) + 1

    const members = await db.query.projectMembers.findMany({
      where: eq(schema.projectMembers.projectId, project.id),
    })
    const reporterId = members[0]?.userId

    if (!reporterId) return

    await db.insert(schema.issues).values({
      projectId: project.id,
      key: `${project.key}-${sequenceNum}`,
      sequenceNum,
      title: titleClean,
      description,
      type: 'TASK',
      priority,
      statusId: targetStatus.id,
      boardColumnId: defaultColumn?.id,
      reporterId,
      externalIssueId,
      syncEnabled: true,
    })
  }
}
