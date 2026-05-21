import { Hono } from 'hono'
import { eq, and, desc, inArray } from 'drizzle-orm'
import { schema } from '../db'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'

const app = new Hono<AppContext>()
app.use(authMiddleware)

// Git providers
app.get('/projects/:projectId/git-providers', async (c) => {
  const db = c.get('db')
  const providers = await db.query.gitProviders.findMany({
    where: eq(schema.gitProviders.projectId, c.req.param('projectId')),
    with: { repositories: true },
  })
  return c.json({ data: providers })
})

app.post('/projects/:projectId/git-providers', async (c) => {
  const db = c.get('db')
  const { type, baseUrl, accessToken } = await c.req.json<{
    type: 'GITLAB' | 'GITHUB'
    baseUrl: string
    accessToken: string
  }>()

  const [provider] = await db.insert(schema.gitProviders)
    .values({
      projectId: c.req.param('projectId'),
      type,
      baseUrl: baseUrl.replace(/\/$/, ''),
      accessToken,
    })
    .returning()

  return c.json({ data: provider }, 201)
})

app.patch('/git-providers/:id', async (c) => {
  const { accessToken } = await c.req.json<{ accessToken: string }>()
  const [updated] = await c.get('db').update(schema.gitProviders)
    .set({ accessToken })
    .where(eq(schema.gitProviders.id, c.req.param('id')))
    .returning()
  return c.json({ data: updated })
})

app.delete('/git-providers/:id', async (c) => {
  await c.get('db').delete(schema.gitProviders)
    .where(eq(schema.gitProviders.id, c.req.param('id')))
  return c.body(null, 204)
})

// Repositories
app.get('/git-providers/:providerId/repos', async (c) => {
  const db = c.get('db')
  const repos = await db.query.gitRepositories.findMany({
    where: eq(schema.gitRepositories.providerId, c.req.param('providerId')),
  })
  return c.json({ data: repos })
})

app.post('/git-providers/:providerId/repos', async (c) => {
  const db = c.get('db')
  let { fullPath } = await c.req.json<{ fullPath: string }>()

  fullPath = fullPath.replace(/^https?:\/\/(github\.com|gitlab\.com)\//, '').replace(/\.git$/, '').replace(/\/$/, '')

  const provider = await db.query.gitProviders.findFirst({
    where: eq(schema.gitProviders.id, c.req.param('providerId')),
  })
  if (!provider) return c.json({ error: 'Not found', message: 'Provider not found' }, 404)

  let externalId: string
  let name: string
  let defaultBranch = 'main'

  if (provider.type === 'GITHUB') {
    const apiBase = provider.baseUrl.includes('api.github.com') ? provider.baseUrl : 'https://api.github.com'
    const res = await fetch(`${apiBase}/repos/${fullPath}`, {
      headers: { Authorization: `Bearer ${provider.accessToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'AgiliX' },
    })
    if (!res.ok) return c.json({ error: 'Git error', message: `仓库 ${fullPath} 不存在或无权限访问 (${res.status})` }, 400)
    const repo: any = await res.json()
    externalId = String(repo.id)
    name = repo.name
    defaultBranch = repo.default_branch || 'main'
  } else {
    const encodedPath = encodeURIComponent(fullPath)
    const res = await fetch(`${provider.baseUrl}/api/v4/projects/${encodedPath}`, {
      headers: { 'PRIVATE-TOKEN': provider.accessToken },
    })
    if (!res.ok) return c.json({ error: 'Git error', message: `仓库 ${fullPath} 不存在或无权限访问` }, 400)
    const repo: any = await res.json()
    externalId = String(repo.id)
    name = repo.name
    defaultBranch = repo.default_branch || 'main'
  }

  const [repo] = await db.insert(schema.gitRepositories)
    .values({
      providerId: c.req.param('providerId'),
      externalId,
      name,
      fullPath,
      defaultBranch,
    })
    .returning()

  return c.json({ data: repo }, 201)
})

// Issue branches
app.post('/issues/:issueId/branches', async (c) => {
  const db = c.get('db')
  const { repoId, name } = await c.req.json<{ repoId: string; name: string }>()
  const userId = c.get('user').userId

  const [branch] = await db.insert(schema.gitBranches)
    .values({ repoId, issueId: c.req.param('issueId'), name })
    .returning()

  await db.insert(schema.activityLogs).values({
    issueId: c.req.param('issueId'),
    userId,
    action: 'branch_created',
    detail: JSON.stringify({ name }),
  })

  return c.json({ data: branch }, 201)
})

// Issue merge requests
app.get('/issues/:issueId/merge-requests', async (c) => {
  const db = c.get('db')
  const mrs = await db.query.mergeRequests.findMany({
    where: eq(schema.mergeRequests.issueId, c.req.param('issueId')),
    with: { pipelines: true },
  })
  return c.json({ data: mrs })
})

// Issue activity
app.get('/issues/:issueId/activity', async (c) => {
  const db = c.get('db')
  const activities = await db.query.activityLogs.findMany({
    where: eq(schema.activityLogs.issueId, c.req.param('issueId')),
    with: { user: true },
    orderBy: schema.activityLogs.createdAt,
  })
  return c.json({ data: activities })
})

// Sync commits from GitHub/GitLab API
app.post('/projects/:projectId/sync-commits', async (c) => {
  const db = c.get('db')
  const projectId = c.req.param('projectId')

  const providers = await db.query.gitProviders.findMany({
    where: eq(schema.gitProviders.projectId, projectId),
    with: { repositories: true },
  })

  let synced = 0
  const errors: string[] = []
  for (const provider of providers) {
    for (const repo of provider.repositories) {
      try {
        let commits: Array<{ sha: string; message: string; author: string; branch: string; committedAt: string }> = []

        if (provider.type === 'GITHUB') {
          const apiBase = provider.baseUrl.includes('api.github.com') ? provider.baseUrl : 'https://api.github.com'
          const url = `${apiBase}/repos/${repo.fullPath}/commits?per_page=100`
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${provider.accessToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'AgiliX' },
          })
          if (!res.ok) {
            const body = await res.text().catch(() => '')
            errors.push(`GitHub ${repo.fullPath}: ${res.status} ${body.slice(0, 200)}`)
            continue
          }
          const data: any[] = await res.json()
          commits = data.map((c: any) => ({
            sha: c.sha,
            message: c.commit?.message || '',
            author: c.commit?.author?.name || c.author?.login || 'Unknown',
            branch: repo.defaultBranch || 'main',
            committedAt: c.commit?.author?.date || new Date().toISOString(),
          }))
        } else {
          const encodedPath = encodeURIComponent(repo.fullPath)
          const res = await fetch(`${provider.baseUrl}/api/v4/projects/${encodedPath}/repository/commits?per_page=100`, {
            headers: { 'PRIVATE-TOKEN': provider.accessToken },
          })
          if (!res.ok) {
            const body = await res.text().catch(() => '')
            errors.push(`GitLab ${repo.fullPath}: ${res.status} ${body.slice(0, 200)}`)
            continue
          }
          const data: any[] = await res.json()
          commits = data.map((c: any) => ({
            sha: c.id,
            message: c.message || '',
            author: c.author_name || 'Unknown',
            branch: repo.defaultBranch || 'main',
            committedAt: c.authored_date || new Date().toISOString(),
          }))
        }

        for (const commit of commits) {
          await db.insert(schema.commitRefs).values({
            repoId: repo.id,
            issueId: null,
            sha: commit.sha,
            message: commit.message,
            author: commit.author,
            branch: commit.branch,
            committedAt: commit.committedAt,
          }).onConflictDoNothing()
          synced++
        }
      } catch (e: any) { errors.push(`${repo.fullPath}: ${e.message || e}`) }
    }
  }

  const repoCount = providers.reduce((n, p) => n + p.repositories.length, 0)
  return c.json({ data: { synced, providers: providers.length, repos: repoCount, errors } })
})

// Project commits
app.get('/projects/:projectId/commits', async (c) => {
  const db = c.get('db')
  const projectId = c.req.param('projectId')
  const limit = Math.min(Number(c.req.query('limit') || 50), 200)
  const offset = Number(c.req.query('offset') || 0)

  const providers = await db.query.gitProviders.findMany({
    where: eq(schema.gitProviders.projectId, projectId),
    with: { repositories: true },
  })
  const repoIds = providers.flatMap(p => p.repositories.map(r => r.id))
  if (repoIds.length === 0) return c.json({ data: [] })

  const commits = await db.query.commitRefs.findMany({
    where: inArray(schema.commitRefs.repoId, repoIds),
    with: { issue: { columns: { id: true, key: true, title: true } }, repository: { columns: { fullPath: true } } },
    orderBy: desc(schema.commitRefs.committedAt),
    limit,
    offset,
  })

  return c.json({ data: commits })
})

// Commit diff (proxy to GitHub/GitLab API)
app.get('/commits/:commitId/diff', async (c) => {
  const db = c.get('db')
  const commit = await db.query.commitRefs.findFirst({
    where: eq(schema.commitRefs.id, c.req.param('commitId')),
    with: { repository: { with: { provider: true } } },
  })
  if (!commit) return c.json({ error: 'Not found' }, 404)

  const provider = commit.repository.provider
  const repo = commit.repository

  let files: Array<{ filename: string; status: string; additions: number; deletions: number; patch: string }> = []

  if (provider.type === 'GITHUB') {
    const apiBase = provider.baseUrl.includes('api.github.com') ? provider.baseUrl : 'https://api.github.com'
    const res = await fetch(`${apiBase}/repos/${repo.fullPath}/commits/${commit.sha}`, {
      headers: { Authorization: `Bearer ${provider.accessToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'AgiliX' },
    })
    if (!res.ok) return c.json({ error: 'Failed to fetch diff' }, 502)
    const data: any = await res.json()
    files = (data.files || []).map((f: any) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch || '',
    }))
  } else {
    const encodedPath = encodeURIComponent(repo.fullPath)
    const res = await fetch(`${provider.baseUrl}/api/v4/projects/${encodedPath}/repository/commits/${commit.sha}/diff`, {
      headers: { 'PRIVATE-TOKEN': provider.accessToken },
    })
    if (!res.ok) return c.json({ error: 'Failed to fetch diff' }, 502)
    const data: any = await res.json()
    files = (data || []).map((f: any) => ({
      filename: f.new_path,
      status: f.new_file ? 'added' : f.deleted_file ? 'removed' : 'modified',
      additions: 0,
      deletions: 0,
      patch: f.diff || '',
    }))
  }

  return c.json({ data: { sha: commit.sha, message: commit.message, author: commit.author, files } })
})

export { app as gitRoutes }
