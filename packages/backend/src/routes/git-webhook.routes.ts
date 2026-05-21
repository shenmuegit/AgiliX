import { Hono } from 'hono'
import { eq, like } from 'drizzle-orm'
import { schema } from '../db'
import type { AppContext } from '../types'
import { notifyMREvent, notifyCIFailed } from '../services/notify'
import { syncGitIssueToAgiliX } from '../services/issue-sync'

const app = new Hono<AppContext>()

function extractIssueKey(text: string): string | null {
  const match = text.match(/([A-Z]+-\d+)/)
  return match ? match[1] : null
}

async function findIssueByKey(db: any, key: string) {
  return db.query.issues.findFirst({
    where: eq(schema.issues.key, key),
  })
}

async function logActivity(db: any, issueId: string, action: string, detail: object) {
  await db.insert(schema.activityLogs).values({
    issueId,
    action,
    detail: JSON.stringify(detail),
  })
}

// GitLab webhook
app.post('/gitlab', async (c) => {
  const db = c.get('db')
  const body = await c.req.json<Record<string, any>>()
  const eventType = c.req.header('X-Gitlab-Event')

  if (eventType === 'Merge Request Hook') {
    const mr = body.object_attributes
    const issueKey = extractIssueKey(mr.source_branch) || extractIssueKey(mr.title)
    if (!issueKey) return c.json({ ok: true })

    const issue = await findIssueByKey(db, issueKey)
    if (!issue) return c.json({ ok: true })

    const repo = await db.query.gitRepositories.findFirst({
      where: eq(schema.gitRepositories.externalId, String(body.project.id)),
    })
    if (!repo) return c.json({ ok: true })

    const existing = await db.query.mergeRequests.findFirst({
      where: eq(schema.mergeRequests.externalId, String(mr.iid)),
    })

    if (existing) {
      await db.update(schema.mergeRequests)
        .set({
          state: mr.state,
          title: mr.title,
          ciStatus: mr.merge_status,
        })
        .where(eq(schema.mergeRequests.id, existing.id))
    } else {
      await db.insert(schema.mergeRequests).values({
        repoId: repo.id,
        issueId: issue.id,
        externalId: String(mr.iid),
        title: mr.title,
        state: mr.state,
        author: mr.author?.name || 'Unknown',
        sourceBranch: mr.source_branch,
        targetBranch: mr.target_branch,
        webUrl: mr.url,
        ciStatus: mr.merge_status,
      })
    }

    await logActivity(db, issue.id, `mr_${mr.state}`, {
      title: mr.title,
      branch: mr.source_branch,
    })

    const mrEventMap: Record<string, 'opened' | 'merged' | 'closed'> = { opened: 'opened', merged: 'merged', closed: 'closed' }
    const mrEventType = mrEventMap[mr.state]
    if (mrEventType) {
      notifyMREvent(c.env, db, schema, issue, { title: mr.title, state: mr.state, sourceBranch: mr.source_branch, webUrl: mr.url }, mrEventType).catch(() => {})
    }

    if (mr.state === 'merged') {
      const workflow = await db.query.workflowStatuses.findFirst({
        where: eq(schema.workflowStatuses.category, 'DONE'),
      })
      if (workflow) {
        await db.update(schema.issues)
          .set({ statusId: workflow.id, updatedAt: new Date().toISOString() })
          .where(eq(schema.issues.id, issue.id))
      }
    }
  }

  if (eventType === 'Push Hook') {
    const commits = body.commits || []
    const repo = await db.query.gitRepositories.findFirst({
      where: eq(schema.gitRepositories.externalId, String(body.project.id)),
    })
    if (!repo) return c.json({ ok: true })

    const branch = (body.ref || '').replace('refs/heads/', '')

    for (const commit of commits) {
      const issueKey = extractIssueKey(commit.message)
      const issue = issueKey ? await findIssueByKey(db, issueKey) : null

      await db.insert(schema.commitRefs).values({
        repoId: repo.id,
        issueId: issue?.id || null,
        sha: commit.id,
        message: commit.message,
        author: commit.author?.name || 'Unknown',
        branch,
        committedAt: commit.timestamp || new Date().toISOString(),
      }).onConflictDoNothing()
    }
  }

  if (eventType === 'Pipeline Hook') {
    const pipeline = body.object_attributes
    const mrIid = body.merge_request?.iid
    if (!mrIid) return c.json({ ok: true })

    const mr = await db.query.mergeRequests.findFirst({
      where: eq(schema.mergeRequests.externalId, String(mrIid)),
    })
    if (!mr) return c.json({ ok: true })

    const existing = await db.query.pipelines.findFirst({
      where: eq(schema.pipelines.externalId, String(pipeline.id)),
    })

    if (existing) {
      await db.update(schema.pipelines)
        .set({ status: pipeline.status })
        .where(eq(schema.pipelines.id, existing.id))
    } else {
      await db.insert(schema.pipelines).values({
        mrId: mr.id,
        externalId: String(pipeline.id),
        status: pipeline.status,
        webUrl: pipeline.url || null,
      })
    }

    await db.update(schema.mergeRequests)
      .set({ ciStatus: pipeline.status })
      .where(eq(schema.mergeRequests.id, mr.id))
  }

  if (eventType === 'Issue Hook') {
    const gitIssue = body.object_attributes
    const provider = await db.query.gitProviders.findFirst({
      where: eq(schema.gitProviders.id,
        (await db.query.gitRepositories.findFirst({
          where: eq(schema.gitRepositories.externalId, String(body.project.id)),
        }))?.providerId ?? ''
      ),
      with: { repositories: true },
    })
    if (provider) {
      await syncGitIssueToAgiliX(db, provider, body.project.path_with_namespace, String(gitIssue.iid), {
        title: gitIssue.title,
        description: gitIssue.description,
        state: gitIssue.state === 'closed' ? 'closed' : 'open',
        labels: (body.labels || []).map((l: any) => ({ name: l.title })),
      })
    }
  }

  return c.json({ ok: true })
})

// GitHub webhook
app.post('/github', async (c) => {
  const db = c.get('db')
  const body = await c.req.json<Record<string, any>>()
  const eventType = c.req.header('X-GitHub-Event')

  if (eventType === 'pull_request') {
    const pr = body.pull_request
    const issueKey = extractIssueKey(pr.head.ref) || extractIssueKey(pr.title)
    if (!issueKey) return c.json({ ok: true })

    const issue = await findIssueByKey(db, issueKey)
    if (!issue) return c.json({ ok: true })

    const repo = await db.query.gitRepositories.findFirst({
      where: eq(schema.gitRepositories.externalId, String(body.repository.id)),
    })
    if (!repo) return c.json({ ok: true })

    const stateMap: Record<string, string> = {
      opened: 'opened',
      closed: pr.merged ? 'merged' : 'closed',
      reopened: 'opened',
    }
    const state = stateMap[body.action] || body.action

    const existing = await db.query.mergeRequests.findFirst({
      where: eq(schema.mergeRequests.externalId, String(pr.number)),
    })

    if (existing) {
      await db.update(schema.mergeRequests)
        .set({ state, title: pr.title })
        .where(eq(schema.mergeRequests.id, existing.id))
    } else {
      await db.insert(schema.mergeRequests).values({
        repoId: repo.id,
        issueId: issue.id,
        externalId: String(pr.number),
        title: pr.title,
        state,
        author: pr.user?.login || 'Unknown',
        sourceBranch: pr.head.ref,
        targetBranch: pr.base.ref,
        webUrl: pr.html_url,
      })
    }

    await logActivity(db, issue.id, `pr_${state}`, {
      title: pr.title,
      branch: pr.head.ref,
    })

    const prEventMap: Record<string, 'opened' | 'merged' | 'closed'> = { opened: 'opened', merged: 'merged', closed: 'closed' }
    const prEventType = prEventMap[state]
    if (prEventType) {
      notifyMREvent(c.env, db, schema, issue, { title: pr.title, state, sourceBranch: pr.head.ref, webUrl: pr.html_url }, prEventType).catch(() => {})
    }

    if (state === 'merged') {
      const workflow = await db.query.workflowStatuses.findFirst({
        where: eq(schema.workflowStatuses.category, 'DONE'),
      })
      if (workflow) {
        await db.update(schema.issues)
          .set({ statusId: workflow.id, updatedAt: new Date().toISOString() })
          .where(eq(schema.issues.id, issue.id))
      }
    }
  }

  if (eventType === 'push') {
    const commits = body.commits || []
    const repo = await db.query.gitRepositories.findFirst({
      where: eq(schema.gitRepositories.externalId, String(body.repository.id)),
    })
    if (!repo) return c.json({ ok: true })

    const branch = (body.ref || '').replace('refs/heads/', '')

    for (const commit of commits) {
      const issueKey = extractIssueKey(commit.message)
      const issue = issueKey ? await findIssueByKey(db, issueKey) : null

      await db.insert(schema.commitRefs).values({
        repoId: repo.id,
        issueId: issue?.id || null,
        sha: commit.id,
        message: commit.message,
        author: commit.author?.name || 'Unknown',
        branch,
        committedAt: commit.timestamp || new Date().toISOString(),
      }).onConflictDoNothing()
    }
  }

  if (eventType === 'issues') {
    const gitIssue = body.issue
    const repo = await db.query.gitRepositories.findFirst({
      where: eq(schema.gitRepositories.externalId, String(body.repository.id)),
    })
    if (repo) {
      const provider = await db.query.gitProviders.findFirst({
        where: eq(schema.gitProviders.id, repo.providerId),
        with: { repositories: true },
      })
      if (provider) {
        await syncGitIssueToAgiliX(db, provider, body.repository.full_name, String(gitIssue.number), {
          title: gitIssue.title,
          body: gitIssue.body,
          state: gitIssue.state,
          labels: gitIssue.labels || [],
        })
      }
    }
  }

  if (eventType === 'check_run') {
    const checkRun = body.check_run
    const prs = checkRun.pull_requests || []
    for (const pr of prs) {
      const mr = await db.query.mergeRequests.findFirst({
        where: eq(schema.mergeRequests.externalId, String(pr.number)),
      })
      if (mr) {
        const statusMap: Record<string, string> = {
          completed: checkRun.conclusion || 'completed',
          in_progress: 'running',
          queued: 'pending',
        }
        const ciStatus = statusMap[checkRun.status] || checkRun.status
        await db.update(schema.mergeRequests)
          .set({ ciStatus })
          .where(eq(schema.mergeRequests.id, mr.id))

        if (ciStatus === 'failure' && mr.issueId) {
          const issue = await db.query.issues.findFirst({ where: eq(schema.issues.id, mr.issueId) })
          if (issue) {
            notifyCIFailed(c.env, db, schema, issue, { title: mr.title, sourceBranch: mr.sourceBranch, webUrl: mr.webUrl }, checkRun.html_url).catch(() => {})
          }
        }
      }
    }
  }

  return c.json({ ok: true })
})

export { app as gitWebhookRoutes }
