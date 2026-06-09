import { useEffect, useState, type ReactNode } from 'react'
import {
  createAgiliXClient,
  type AgiliXClient,
  type CreateDocInput,
  type FeishuNotificationInput,
} from './api/client'
import { toDisplaySeedData } from './api/appStateAdapter'
import type { ProjectFilterValue } from './components/ProjectFilter'
import { Shell, type NavItem } from './components/Shell'
import type {
  DocComment,
  FeishuNotificationTrigger,
  CreateProjectInput,
  IssueStatus,
  Milestone,
  SeedData,
  Standup,
} from './domain/types'
import { BoardPage } from './routes/BoardPage'
import { DocsPage } from './routes/DocsPage'
import { FeishuPage } from './routes/FeishuPage'
import { GanttPage } from './routes/GanttPage'
import { IssuesPage } from './routes/IssuesPage'
import { ProjectsPage } from './routes/ProjectsPage'
import { StandupPage } from './routes/StandupPage'
import { StatsPage } from './routes/StatsPage'
import { TeamPage } from './routes/TeamPage'
import { WorkloadPage } from './routes/WorkloadPage'

const defaultAgiliXClient = createAgiliXClient((input, init) => fetch(input, init))

export function App({ client = defaultAgiliXClient }: { client?: AgiliXClient }) {
  const [active, setActive] = useState<NavItem>(() => initialNavItemFromPath(window.location.pathname))
  const [projectId, setProjectId] = useState<ProjectFilterValue>('search')
  const [docsProjectId, setDocsProjectId] = useState<ProjectFilterValue>('all')
  const [data, setData] = useState<SeedData | null>(null)

  async function refresh() {
    setData(toDisplaySeedData(await client.loadAppState()))
  }

  useEffect(() => {
    void refresh()
  }, [client])

  async function moveAndRefresh(issueKey: string, status: IssueStatus) {
    await client.moveIssue(issueKey, status)
    await refresh()
  }

  async function commentAndRefresh(docId: string, comment: DocComment) {
    await client.addDocComment(docId, comment)
    await refresh()
  }

  async function createDocAndRefresh(doc: CreateDocInput) {
    await client.createDoc(doc)
    await refresh()
  }

  async function createProjectAndRefresh(input: CreateProjectInput) {
    await client.createProject(input)
    await refresh()
  }

  async function saveStandupAndRefresh(standup: Standup) {
    await client.saveStandup(standup)
    await refresh()
  }

  async function saveMilestoneAndRefresh(milestone: Milestone) {
    await client.saveMilestone(milestone)
    await refresh()
  }

  if (!data) {
    return (
      <Shell active={active} onNavigate={setActive}>
        <main>
          <h1>团队工作台</h1>
          <p>加载中</p>
        </main>
      </Shell>
    )
  }
  const loadedData = data

  async function recordFeishuNotification(trigger: FeishuNotificationTrigger) {
    const base = {
      id: crypto.randomUUID(),
      targetGroup: 'AgiliX 团队群' as const,
      status: 'queued' as const,
      createdAt: new Date().toISOString(),
    }

    let input: FeishuNotificationInput
    switch (trigger) {
      case '站会摘要':
        input = { ...base, trigger, payload: { standupId: 'standup-search-today' } }
        break
      case '阻塞提醒': {
        const issueKeys = loadedData.issues
          .filter((issue) => issue.status === 'blocked')
          .map((issue) => issue.key)
        if (issueKeys.length === 0)
          throw new Error('Cannot record blocker notification without blocked issues')
        input = { ...base, trigger, payload: { issueKeys: issueKeys as [string, ...string[]] } }
        break
      }
      case '文档评论':
        input = { ...base, trigger, payload: { docId: 'doc-result-card', commentId: 'comment-a' } }
        break
    }

    await client.recordFeishuNotification(input)
  }

  const selectedProject =
    projectId === 'all' ? null : loadedData.projects.find((project) => project.id === projectId)
  if (projectId !== 'all' && !selectedProject) throw new Error(`Project not found: ${projectId}`)

  function projectRequiredPage(title: string) {
    return (
      <main>
        <h1>{title}</h1>
        <p>请选择具体项目</p>
      </main>
    )
  }

  const page: Record<NavItem, ReactNode> = {
    团队工作台: (
      <TeamPage
        data={loadedData}
        onOpenIssues={() => setActive('Issues')}
        onOpenDocs={() => setActive('文档')}
        onOpenStandup={() => setActive('每日站会')}
      />
    ),
    项目总览: <ProjectsPage data={loadedData} onCreateProject={createProjectAndRefresh} />,
    Issues: <IssuesPage data={loadedData} projectId={projectId} onProjectChange={setProjectId} />,
    看板: (
      <BoardPage
        data={loadedData}
        projectId={projectId}
        onMoveIssue={moveAndRefresh}
        onOpenIssues={() => setActive('Issues')}
        onOpenFeishu={() => setActive('飞书')}
      />
    ),
    迭代统计: selectedProject ? (
      <StatsPage
        data={loadedData}
        projectId={selectedProject.id}
        iterationCode={selectedProject.activeIterationCode}
      />
    ) : (
      projectRequiredPage('迭代统计')
    ),
    文档: (
      <DocsPage
        data={loadedData}
        projectId={docsProjectId}
        onProjectChange={setDocsProjectId}
        onAddComment={commentAndRefresh}
        onCreateDoc={createDocAndRefresh}
      />
    ),
    成员负载: <WorkloadPage data={loadedData} onOpenIssues={() => setActive('Issues')} />,
    每日站会: selectedProject ? (
      <StandupPage
        data={loadedData}
        projectId={selectedProject.id}
        onSaveStandup={saveStandupAndRefresh}
      />
    ) : (
      projectRequiredPage('每日站会')
    ),
    排期甘特: selectedProject ? (
      <GanttPage
        data={loadedData}
        projectId={selectedProject.id}
        onSaveMilestone={saveMilestoneAndRefresh}
        onOpenFeishu={() => setActive('飞书')}
      />
    ) : (
      projectRequiredPage('排期甘特')
    ),
    飞书: (
      <FeishuPage
        data={loadedData}
        onNotify={recordFeishuNotification}
        onQuery={(command) => client.queryFeishu(command)}
      />
    ),
  }

  return (
    <Shell active={active} onNavigate={setActive} data={loadedData} projectId={projectId}>
      {page[active]}
    </Shell>
  )
}

function initialNavItemFromPath(pathname: string): NavItem {
  const pathRoute: Record<string, NavItem> = {
    '/screen-team.html': '团队工作台',
    '/screen-projects.html': '项目总览',
    '/screen-issues.html': 'Issues',
    '/screen-board.html': '看板',
    '/screen-stats.html': '迭代统计',
    '/screen-docs.html': '文档',
    '/screen-workload.html': '成员负载',
    '/screen-standup.html': '每日站会',
    '/screen-gantt.html': '排期甘特',
    '/screen-feishu.html': '飞书',
  }

  return pathRoute[pathname] ?? '团队工作台'
}
