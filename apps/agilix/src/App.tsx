import { useEffect, useState, type ReactNode } from 'react'
import {
  createAgiliXClient,
  type AgiliXClient,
  type CreateDocInput,
  type ContractIssueStatus,
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
    const issue = data?.issues.find((item) => item.key === issueKey)
    if (!issue?.id) throw new Error(`Issue contract id not found: ${issueKey}`)
    setData(toDisplaySeedData(await client.moveIssueById(issue.id, toContractIssueStatus(status))))
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
    setData(toDisplaySeedData(await client.createContractProject(toCreateProjectRequest(input))))
  }

  async function saveStandupAndRefresh(standup: Standup) {
    setData(toDisplaySeedData(await client.saveContractStandup(standup.id, {
      items: standup.items.map((item) => ({
        member_id: requireMemberContractId(loadedData, item.memberId),
        yesterday_text: item.yesterday.join('\n'),
        today_text: item.today.join('\n'),
        blockers_text: item.blockers.join('\n'),
      })),
    })))
  }

  async function saveMilestoneAndRefresh(milestone: Milestone) {
    setData(toDisplaySeedData(await client.saveContractMilestone(milestone.id, {
      title: milestone.title,
      start_day: milestone.startDay,
      end_day: milestone.endDay,
      status: milestone.status,
      participant_member_id: requireMemberContractId(loadedData, milestone.ownerId),
    })))
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
    const target_group_id = requireFeishuGroupId(loadedData)

    switch (trigger) {
      case '站会摘要':
        await client.recordContractFeishuNotification({
          trigger,
          target_group_id,
          payload_json: { standup_id: requireFirstStandupId(loadedData) },
        })
        return
      case '阻塞提醒': {
        const issueIds = loadedData.issues
          .filter((issue) => issue.status === 'blocked')
          .map((issue) => requireValue(issue.id, `Issue contract id not found: ${issue.key}`))
        if (issueIds.length === 0)
          throw new Error('Cannot record blocker notification without blocked issues')
        await client.recordContractFeishuNotification({
          trigger,
          target_group_id,
          payload_json: { issue_ids: issueIds },
        })
        return
      }
      case '文档评论':
        await client.recordContractFeishuNotification({
          trigger,
          target_group_id,
          payload_json: requireFirstDocumentCommentPayload(loadedData),
        })
        return
    }
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

function toContractIssueStatus(status: IssueStatus): ContractIssueStatus {
  if (status === 'review') throw new Error('Review status is not supported by the contract issue status API')
  return status
}

function toCreateProjectRequest(input: CreateProjectInput) {
  return {
    code: input.project.id,
    name: input.project.name,
    glyph: input.project.glyph,
    color: input.project.color,
    cadence: '双周',
    template_key: 'scrum-board-burndown',
    member_ids: [],
    initial_iteration: {
      code: input.iteration.code,
      name: input.iteration.name,
      date_range_label: input.iteration.dateRangeLabel,
      calendar_title: input.iteration.calendarTitle,
      calendar_weeks: input.iteration.calendarWeeks.map((week) => ({
        label: week.label,
        range_label: week.rangeLabel,
        days: week.days,
      })),
      day: input.iteration.day,
      total_days: input.iteration.totalDays,
      goal: input.iteration.goal,
      velocity: input.iteration.velocity,
    },
  }
}

function requireMemberContractId(data: SeedData, memberId: string) {
  const member = data.members.find((item) => item.id === memberId)
  if (!member?.contractId) throw new Error(`Member contract id not found: ${memberId}`)
  return member.contractId
}

function requireFeishuGroupId(data: SeedData) {
  return requireValue(data.feishu.groupIds?.[0], 'Feishu group contract id not found')
}

function requireFirstStandupId(data: SeedData) {
  return requireValue(data.standups[0]?.id, 'Standup contract id not found')
}

function requireFirstDocumentCommentPayload(data: SeedData) {
  const doc = requireValue(data.docs.find((item) => item.comments.length > 0), 'Document comment not found')
  const comment = requireValue(doc.comments[0], `Document comment not found: ${doc.id}`)
  return { document_id: doc.id, comment_id: comment.id }
}

function requireValue<T>(value: T | undefined | null, message: string): T {
  if (value === undefined || value === null) throw new Error(message)
  return value
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
